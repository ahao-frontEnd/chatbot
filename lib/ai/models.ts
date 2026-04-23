export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // deepseek
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    description: "Advanced multimodal model with vision and text capabilities",
  },
  // deepseek 深度思考模型
  {
    id: "deepseek/deepseek-chat-thinking",
    name: "Deepseek Reasoner",
    provider: "deepseek",
    description: "Uses advanced chain-of-thought reasoning for complex problems.",
  },
];

// Group models by provider for UI
export const allowedModelIds = new Set(chatModels.map((m) => m.id));
export const DEFAULT_CHAT_MODEL = chatModels[0]?.id ?? "deepseek/deepseek-chat";

export function isAllowedChatModel(
  modelId: string | undefined
): modelId is string {
  if (!modelId) {
    return false;
  }

  return allowedModelIds.has(modelId);
}

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
