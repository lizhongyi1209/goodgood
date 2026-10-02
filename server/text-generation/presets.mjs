// Keep full preset instructions on the server. Browser contracts contain IDs and labels only.
const prompts = Object.freeze({
  structured_reverse: "根据图片生成JSON结构化中文提示词，包括主体描述、环境、光影、镜头语言、风格关键词。",
});

export function textGenerationPresetPrompt(presetId) {
  return Object.hasOwn(prompts, presetId) ? prompts[presetId] : null;
}
