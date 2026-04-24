import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import type { Session } from "next-auth";
import { type RequestHints } from "@/lib/ai/prompts";
import { classifyIntentNode } from "@/lib/ai/agent/classify";
import { createDefaultStreamTextResult } from "@/lib/ai/agent/common";
import { runMockInterviewAgent } from "@/lib/ai/agent/mock-interview";
import { runResumeOptAgent } from "@/lib/ai/agent/resume-opt";
import {
  createStreamId,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/app/(chat)/actions";
import type { PostRequestBody } from "@/app/(chat)/api/chat/schema";

type StreamContext = {
  createNewResumableStream: (
    streamId: string,
    streamFactory: () => ReadableStream
  ) => Promise<ReadableStream<string> | null>;
};

type RunChatAgentParams = {
  request: Request;
  requestBody: PostRequestBody;
  session: Session;
  getStreamContext: () => StreamContext | null;
};

function normalizeUserMessage(message?: ChatMessage) {
  if (!message) {
    return message;
  }

  const parts = message.parts.map((part) => {
    if (
      part.type === "file" &&
      "base64" in part &&
      typeof part.base64 === "string"
    ) {
      const fileName =
        "name" in part && typeof part.name === "string" ? part.name : "file";
      return { type: "text", text: `<${fileName}>` };
    }
    return part;
  });

  return {
    ...message,
    parts,
  } as ChatMessage;
}

function isReasoningModel(modelId: string) {
  return (
    modelId.endsWith("-thinking") ||
    (modelId.includes("reasoning") && !modelId.includes("non-reasoning"))
  );
}

export async function runChatAgent({
  request,
  requestBody,
  session,
  getStreamContext,
}: RunChatAgentParams) {
  const { id, message, messages, selectedChatModel, selectedVisibilityType } =
    requestBody;
  const isToolApprovalFlow = Boolean(messages);
  const chat = await getChatById({ id });
  let messagesFromDb: DBMessage[] = [];
  let titlePromise: Promise<string> | null = null;
  const normalizedMessage = normalizeUserMessage(message as ChatMessage);

  if (chat) {
    if (chat.userId !== session.user.id) {
      throw new ChatbotError("forbidden:chat");
    }

    if (!isToolApprovalFlow) {
      messagesFromDb = await getMessagesByChatId({ id });
    }
  } else if (normalizedMessage?.role === "user") {
    await saveChat({
      id,
      userId: session.user.id,
      title: "New chat",
      visibility: selectedVisibilityType,
    });
    titlePromise = generateTitleFromUserMessage({ message: normalizedMessage });
  }

  const uiMessages = isToolApprovalFlow
    ? (messages as ChatMessage[])
    : [...convertToUIMessages(messagesFromDb), normalizedMessage as ChatMessage];

  const { longitude, latitude, city, country } = geolocation(request);
  const requestHints: RequestHints = {
    longitude,
    latitude,
    city,
    country,
  };

  if (normalizedMessage?.role === "user") {
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: normalizedMessage.id,
          role: "user",
          parts: normalizedMessage.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
  }

  const modelMessages = await convertToModelMessages(uiMessages);
  const reasoningModel = isReasoningModel(selectedChatModel);
  const stream = createUIMessageStream({
    originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    execute: async ({ writer: dataStream }) => {
      const classification = await classifyIntentNode({
        messages: modelMessages,
        modelId: selectedChatModel,
      });
      console.log('识别到意图为： ', classification.category)
      const result =
        classification.category === "resume_opt"
          ? runResumeOptAgent({
              messages: modelMessages,
              modelId: selectedChatModel,
            })
          : classification.category === "mock_interview"
            ? runMockInterviewAgent({
                messages: modelMessages,
                modelId: selectedChatModel,
              })
            : createDefaultStreamTextResult({
                selectedChatModel,
                requestHints,
                modelMessages,
                reasoningModel,
                session,
                dataStream,
              });

      dataStream.merge(result.toUIMessageStream({ sendReasoning: reasoningModel }));

      if (titlePromise) {
        const title = await titlePromise;
        dataStream.write({ type: "data-chat-title", data: title });
        updateChatTitleById({ chatId: id, title });
      }
    },
    generateId: generateUUID,
    onFinish: async ({ messages: finishedMessages }) => {
      if (isToolApprovalFlow) {
        for (const finishedMsg of finishedMessages) {
          const existingMsg = uiMessages.find((item) => item.id === finishedMsg.id);
          if (existingMsg) {
            await updateMessage({
              id: finishedMsg.id,
              parts: finishedMsg.parts,
            });
          } else {
            await saveMessages({
              messages: [
                {
                  id: finishedMsg.id,
                  role: finishedMsg.role,
                  parts: finishedMsg.parts,
                  createdAt: new Date(),
                  attachments: [],
                  chatId: id,
                },
              ],
            });
          }
        }
      } else if (finishedMessages.length > 0) {
        await saveMessages({
          messages: finishedMessages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      }
    },
    onError: (error) => {
      if (
        error instanceof Error &&
        error.message?.includes(
          "AI Gateway requires a valid credit card on file to service requests"
        )
      ) {
        return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
      }

      return "Oops, an error occurred!";
    },
  });

  return createUIMessageStreamResponse({
    stream,
    async consumeSseStream({ stream: sseStream }) {
      if (!process.env.REDIS_URL) {
        return;
      }

      try {
        const streamContext = getStreamContext();
        if (streamContext) {
          const streamId = generateId();
          await createStreamId({ streamId, chatId: id });
          await streamContext.createNewResumableStream(streamId, () => sseStream);
        }
      } catch (_) {
        // ignore redis errors
      }
    },
  });
}
