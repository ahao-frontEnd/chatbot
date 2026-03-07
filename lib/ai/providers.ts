import { customProvider } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { isTestEnvironment } from "../constants";

// In tests, use the mocked models mapping.
export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

function resolveDeepSeekModelId(modelId: string) {
  const isReasoningModel =
    modelId.endsWith("-thinking") ||
    (modelId.includes("reasoning") && !modelId.includes("non-reasoning"));
  return isReasoningModel ? "deepseek-reasoner" : "deepseek-chat";
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }
  return deepseek(resolveDeepSeekModelId(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return deepseek("deepseek-chat");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return deepseek("deepseek-chat");
}
