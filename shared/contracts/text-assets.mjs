export const TEXT_ASSET_MAX_TEXT = 16_000;
export const TEXT_ASSET_MAX_MARKDOWN = 100_000;
export const TEXT_ASSET_MAX_NAME = 255;
export const TEXT_ASSET_PREVIEW_LENGTH = 2_000;
export const TEXT_ASSETS_UPDATED_EVENT = "goodgood-text-assets-updated";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTextAssetId(value) { return typeof value === "string" && UUID.test(value); }
export function textAssetInputError(input) {
  if (!input || !isTextAssetId(input.id)) return "文本模板标识无效。";
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > TEXT_ASSET_MAX_NAME || /[\u0000-\u001f\u007f]/.test(input.name)) return `模板名称应为1–${TEXT_ASSET_MAX_NAME}个字符。`;
  if (typeof input.text !== "string" || typeof input.markdown !== "string" || !input.text.trim() || !input.markdown.trim()) return "文本内容为空，无法设置模板。";
  if (input.text.length > TEXT_ASSET_MAX_TEXT || input.markdown.length > TEXT_ASSET_MAX_MARKDOWN || /\u0000/.test(input.text + input.markdown)) return "文本模板内容超出编辑器范围或含有无效字符。";
  return null;
}
export function textAssetDefaultName(text) {
  return Array.from(text.split(/\r?\n/).find((line) => line.trim())?.trim().replace(/[\u0000-\u001f\u007f]/g, " ") || "文本模板").slice(0, 64).join("");
}
export function textAssetPreview(text) { return Array.from(text).slice(0, TEXT_ASSET_PREVIEW_LENGTH).join(""); }
