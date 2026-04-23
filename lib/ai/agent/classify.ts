import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";

export const classificationSchema = z.object({
  category: z.enum([
    "resume_opt",
    "mock_interview",
    "related_topics",
    "others",
  ]),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

const classifySystemPrompt = `
你是一个互联网大公司的资深程序员和面试官，尤其擅长前端技术栈，包括 HTML、CSS、JavaScript、TypeScript、React、Vue、Node.js、AI Agent应用开发 等技术。
请根据用户输入的内容，判断用户属于哪一种情况？按说明输出 JSON 格式。

分类说明：
- resume_opt：简历优化
- mock_interview：模拟面试
- related_topics：和编程、面试、简历相关的话题
- others：其他话题

只输出符合 schema 的 JSON，不要输出额外字段。
`.trim();

type ClassifyIntentNodeParams = {
  messages: ModelMessage[];
  modelId?: string;
};

// AI SDK workflow node: classify user intent from messages.
export async function classifyIntentNode({
  messages,
  modelId = "chat-model",
}: ClassifyIntentNodeParams): Promise<ClassificationResult> {
  const { object } = await generateObject({
    model: getLanguageModel(modelId),
    system: classifySystemPrompt,
    messages,
    schema: classificationSchema,
  });

  return object;
}
