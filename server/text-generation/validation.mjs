import { getTextGenerationModel, TEXT_GENERATION_MAX_PROMPT, TEXT_GENERATION_MAX_MEDIA, TEXT_GENERATION_MAX_HISTORY, TEXT_GENERATION_MAX_OUTPUT } from "../../shared/contracts/text-generation.mjs";
import { TextGenerationError } from "./errors.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = () => { throw new TextGenerationError("INVALID_TEXT_GENERATION", "文本生成输入无效，请检查内容和附件。"); };
export function textGenerationId(value) { if (typeof value !== "string" || !UUID.test(value)) invalid(); return value; }
export function validateTextGeneration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !getTextGenerationModel(input.modelId) ||
      typeof input.prompt !== "string" || input.prompt.length > TEXT_GENERATION_MAX_PROMPT ||
      !Array.isArray(input.media) || input.media.length > TEXT_GENERATION_MAX_MEDIA ||
      !Array.isArray(input.history) || input.history.length > TEXT_GENERATION_MAX_HISTORY) invalid();
  const history = input.history.map((message) => {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" ||
        message.content.length > (message.role === "user" ? TEXT_GENERATION_MAX_PROMPT : TEXT_GENERATION_MAX_OUTPUT)) invalid();
    return { role: message.role, content: message.content };
  });
  let videos = 0;
  const seen = new Set();
  const media = input.media.map((item) => {
    if (!item || !["image", "video"].includes(item.kind) ||
        (item.kind === "image" ? !["reference", "generated"].includes(item.assetKind) : item.assetKind !== "video")) invalid();
    const assetId = textGenerationId(item.assetId);
    const key = `${item.assetKind}:${assetId}`;
    if (seen.has(key)) invalid();
    seen.add(key);
    if (item.kind === "image") return { kind: "image", assetKind: item.assetKind, assetId };
    if (++videos > 3 || !Array.isArray(item.frames) || item.frames.length < 1 || item.frames.length > 6 ||
        item.frames.some((frame) => typeof frame !== "string" || frame.length > 500_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(frame))) invalid();
    return { kind: "video", assetKind: "video", assetId, frames: item.frames };
  });
  if (!input.prompt.trim() && !media.length) throw new TextGenerationError("EMPTY_TEXT_PROMPT", "请输入内容或连接素材后再生成。");
  return { requestId: textGenerationId(input.requestId), projectId: input.projectId ? textGenerationId(input.projectId) : null,
    modelId: input.modelId, prompt: input.prompt, history, media };
}
export async function readTextGenerationJson(request) {
  const type = typeof request.headers?.get === "function" ? request.headers.get("content-type") : request.headers?.["content-type"];
  if (!String(type).startsWith("application/json")) throw new TextGenerationError("INVALID_TEXT_GENERATION", "需要JSON格式的输入。", 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of request.body ?? request) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > 8 * 1024 * 1024) throw new TextGenerationError("TEXT_INPUT_TOO_LARGE", "输入附件过大，请减少图片或视频数量。", 413);
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { invalid(); }
}
