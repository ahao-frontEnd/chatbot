import { streamText, type ModelMessage } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";

type RunResumeOptAgentParams = {
  messages: ModelMessage[];
  modelId?: string;
};

function getMessageText(message: ModelMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (!Array.isArray(message.content)) {
    return "";
  }

  return message.content
    .map((part) => {
      if (part.type === "text" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join(" ");
}

function hasResumeContent(messages: ModelMessage[]): boolean {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => getMessageText(message))
    .join("\n")
    .trim();

  if (!userText) {
    return false;
  }

  const resumeKeywords = [
    "简历",
    "工作经历",
    "项目经历",
    "教育经历",
    "技能",
    "experience",
    "resume",
    "education",
    "project",
  ];

  return (
    userText.length >= 80 ||
    resumeKeywords.some((keyword) =>
      userText.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

export function runResumeOptAgent({
  messages,
  modelId = "chat-model",
}: RunResumeOptAgentParams) {
  const hasResume = hasResumeContent(messages);

  const system = hasResume
    ? `
你是一个互联网大公司的资深程序员和面试官，尤其擅长前端技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、小程序等技术。
你的任务是做简历优化。
请基于用户提供的简历文本，给出简洁、可执行的优化建议。
不用做过度分析，优先保证建议清晰、可落地。
请始终使用中文回答。
`.trim()
    : `
你是一个互联网大公司的资深程序员和面试官，尤其擅长前端技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、小程序等技术。
当前用户还没有提供简历文本。
请礼貌提醒用户先粘贴简历文本内容，再继续进行优化。
请始终使用中文回答。
`.trim();

  return streamText({
    model: getLanguageModel(modelId),
    system,
    messages,
  });
}
