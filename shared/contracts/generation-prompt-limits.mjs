/** Storage capacity is independent of the model selected for submission. */
export const PROMPT_DRAFT_MAX_LENGTH = 32_000;

const openaiLimit = Object.freeze({ maxLength: 32_000, source: "provider" });
const bananaLimit = Object.freeze({ maxLength: 32_000, source: "application" });
const seedreamLimit = Object.freeze({ maxLength: 4_000, source: "application" });

export const GENERATION_PROMPT_LIMITS = Object.freeze({
  "gpt-image-2": openaiLimit,
  "gpt-image-2.5-sunburst": openaiLimit,
  "gpt-image-2.5-flare": openaiLimit,
  "nano-banana-2": bananaLimit,
  "nano-banana-pro": bananaLimit,
  "seedream-5.0-pro": seedreamLimit,
});

/** Unicode code points, including supplementary characters, match PostgreSQL length(text). */
export function countPromptCharacters(text) {
  return Array.from(text).length;
}

/** Callers supply the complete prompt; trimming matches generation snapshots. */
export function getGenerationPromptStatus(modelId, text) {
  const policy = typeof modelId === "string" && Object.hasOwn(GENERATION_PROMPT_LIMITS, modelId)
    ? GENERATION_PROMPT_LIMITS[modelId] : bananaLimit;
  const prompt = text.trim();
  const length = countPromptCharacters(prompt);
  const excess = Math.max(0, length - policy.maxLength);
  const chineseCharacters = modelId === "seedream-5.0-pro" ? (prompt.match(/\p{Script=Han}/gu)?.length ?? 0) : 0;
  const englishWords = modelId === "seedream-5.0-pro" ? (prompt.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length ?? 0) : 0;
  return {
    length,
    maxLength: policy.maxLength,
    limitSource: policy.source,
    excess,
    tooLong: excess > 0,
    errorMessage: excess > 0 ? `当前模型提示词最多 ${policy.maxLength.toLocaleString("zh-CN")} 个字符，已超出 ${excess.toLocaleString("zh-CN")} 个字符。` : null,
    advice: chineseCharacters > 300 || englishWords > 600
      ? "Seedream 建议提示词控制在 300 个汉字或 600 个英文词以内；这是写作建议，不影响提交。"
      : null,
  };
}
