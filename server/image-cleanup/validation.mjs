import { IMAGE_CLEANUP_SOURCE_KINDS } from "../../shared/contracts/image-cleanup.mjs";
import { ImageCleanupError } from "./errors.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateImageCleanupInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !["requestId", "sourceKind", "sourceId", "name", "projectId"].includes(key)) ||
      typeof input.requestId !== "string" || !UUID.test(input.requestId) || typeof input.sourceId !== "string" || !UUID.test(input.sourceId) ||
      !IMAGE_CLEANUP_SOURCE_KINDS.includes(input.sourceKind) ||
      typeof input.name !== "string" || input.name.length < 1 || input.name.length > 255 ||
      /[\u0000-\u001f]/.test(input.name) || (input.projectId != null && (typeof input.projectId !== "string" || !UUID.test(input.projectId)))) {
    throw new ImageCleanupError("IMAGE_CLEANUP_INPUT_INVALID", "图片处理请求无效，请重新选择图片。", 400);
  }
  return { requestId: input.requestId.toLowerCase(), sourceKind: input.sourceKind,
    sourceId: input.sourceId.toLowerCase(), name: input.name, projectId: input.projectId?.toLowerCase() ?? null };
}
export async function readImageCleanupJson(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new ImageCleanupError("IMAGE_CLEANUP_INPUT_INVALID", "图片处理请求过大。", 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ImageCleanupError("IMAGE_CLEANUP_INPUT_INVALID", "图片处理请求无效。", 400); }
}
