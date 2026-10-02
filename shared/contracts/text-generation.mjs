export const TEXT_GENERATION_MODELS = Object.freeze([
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", icon: "gemini", providerModel: "gemini-3.1-pro-preview" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", icon: "claude", providerModel: "claude-opus-5-5" },
  { id: "doubao-seed-2.0-pro", name: "Doubao Seed 2.0 Pro", icon: "bytedance", providerModel: "doubao-seed-2.0-pro" },
  { id: "gpt-6.1-sol", name: "GPT 6.1 Sol", icon: "openai", providerModel: "gpt-6.1-sol" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", icon: "deepseek", providerModel: "deepseek-v4-pro" },
]);
export const DEFAULT_TEXT_GENERATION_MODEL = "claude-opus-5-5";
export const TEXT_GENERATION_PRESETS = Object.freeze([
  { id: "structured_reverse", name: "结构化反推" },
]);
export function getTextGenerationPreset(id) {
  return TEXT_GENERATION_PRESETS.find((preset) => preset.id === id) ?? null;
}
export const TEXT_GENERATION_CREDIT_COST = 20;
export const TEXT_GENERATION_CANCELLATION_CREDIT_COST = TEXT_GENERATION_CREDIT_COST / 2;
export const TEXT_GENERATION_REASONING_EFFORT = "high";
export const TEXT_GENERATION_MAX_PROMPT = 64_000;
export const TEXT_GENERATION_MAX_OUTPUT = 16_000;
export const TEXT_GENERATION_MAX_MEDIA = 10;
export const TEXT_GENERATION_MAX_HISTORY = 12;
export function getTextGenerationModel(id) {
  return TEXT_GENERATION_MODELS.find((model) => model.id === id) ?? null;
}
