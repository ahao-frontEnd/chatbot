import { stepCountIs, streamText, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { systemPrompt, type RequestHints } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";

type CreateDefaultStreamTextResultParams = {
  selectedChatModel: string;
  requestHints: RequestHints;
  modelMessages: NonNullable<Parameters<typeof streamText>[0]["messages"]>;
  reasoningModel: boolean;
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export function createDefaultStreamTextResult({
  selectedChatModel,
  requestHints,
  modelMessages,
  reasoningModel,
  session,
  dataStream,
}: CreateDefaultStreamTextResultParams) {
  return streamText({
    model: getLanguageModel(selectedChatModel),
    system: systemPrompt({ selectedChatModel, requestHints }),
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    experimental_activeTools: reasoningModel
      ? []
      : [
          "getWeather",
          "createDocument",
          "updateDocument",
          "requestSuggestions",
        ],
    providerOptions: reasoningModel
      ? {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 10_000 },
          },
        }
      : undefined,
    tools: {
      getWeather,
      createDocument: createDocument({ session, dataStream }),
      updateDocument: updateDocument({ session, dataStream }),
      requestSuggestions: requestSuggestions({ session, dataStream }),
    },
    experimental_telemetry: {
      isEnabled: isProductionEnvironment,
      functionId: "stream-text",
    },
  });
}
