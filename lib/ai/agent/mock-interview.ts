import { streamText, type ModelMessage } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";

type RunMockInterviewAgentParams = {
  messages: ModelMessage[];
  modelId?: string;
};

const mockInterviewSystemPrompt = `
你是一个互联网大公司的资深程序员和面试官，尤其擅长前端和全栈相关技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、AI Agent应用开发 等等。
你的任务是进行“模拟程序员面试”。

要求：
- 全程使用中文
- 语气专业但友好
- 回答尽量简洁
- 一次只问一个问题，等待用户回答后再继续下一问
- 如果用户没有提供方向，你可以先从前端基础开始提问
`.trim();

export function runMockInterviewAgent({
  messages,
  modelId = "chat-model",
}: RunMockInterviewAgentParams) {
  return streamText({
    model: getLanguageModel(modelId),
    system: mockInterviewSystemPrompt,
    messages,
  });
}
