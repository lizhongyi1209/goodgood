import { defaultVideoGenerationDraft, VIDEO_IMAGE_ROLES, VIDEO_VIDEO_ROLES, videoGenerationProblem } from "../../shared/contracts/video-generation.mjs";
import { VideoGenerationError } from "./errors.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function videoGenerationId(value) {
  if (typeof value !== "string" || !UUID.test(value)) throw new VideoGenerationError("VIDEO_REQUEST_INVALID", "视频任务标识无效。");
  return value;
}
function invalid(message = "视频参数无效。") { throw new VideoGenerationError("VIDEO_INPUT_INVALID", message); }
function record(value, keys) { if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) invalid(); }
export function validateVideoDraft(raw) {
  const defaults = defaultVideoGenerationDraft();
  record(raw, [...Object.keys(defaults), "requestId", "lastInput"]);
  const draft = { ...defaults, ...raw };
  if (!/^(text_to_video|image_to_video|first_last_frame|reference_to_video|video_edit|motion_control)$/.test(draft.type) ||
      !["kling-3.0-omni", "kling-3.0"].includes(draft.modelId) || !["720p", "1080p", "4k"].includes(draft.resolution) ||
      !Number.isInteger(draft.duration) || draft.duration < 3 || draft.duration > 15 || !["16:9", "9:16", "1:1"].includes(draft.aspectRatio) ||
      !["native", "original", "off"].includes(draft.audio) || typeof draft.multiShot !== "boolean" || !["video", "image"].includes(draft.characterOrientation) ||
      typeof draft.prompt !== "string" || draft.prompt.length > 3072 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(draft.prompt)) invalid();
  if (!Array.isArray(draft.shots) || draft.shots.length > 6) invalid();
  draft.shots = draft.shots.map((shot) => { record(shot, ["seconds", "text"]); if (!Number.isInteger(shot.seconds) || shot.seconds < 1 || shot.seconds > 15 || typeof shot.text !== "string" || shot.text.length > 512) invalid(); return { seconds: shot.seconds, text: shot.text }; });
  if (!Array.isArray(draft.materials) || draft.materials.length > 8) invalid();
  draft.materials = draft.materials.map((item) => validateMaterial(item, false));
  if (new Set(draft.materials.map((item) => `${item.assetKind}:${item.assetId}`)).size !== draft.materials.length) invalid();
  if (!draft.roles || typeof draft.roles !== "object" || Array.isArray(draft.roles) || Object.keys(draft.roles).length > 32) invalid();
  for (const [key, role] of Object.entries(draft.roles)) if (key.length > 180 || ![...VIDEO_IMAGE_ROLES, ...VIDEO_VIDEO_ROLES].includes(role)) invalid();
  if (draft.requestId !== undefined) draft.requestId = videoGenerationId(draft.requestId);
  if (draft.lastInput !== undefined) {
    draft.lastInput = validateVideoGeneration(draft.lastInput);
    if (draft.requestId !== draft.lastInput.requestId) invalid();
  }
  return draft;
}
function validateMaterial(item, requiredRole) {
  record(item, ["kind", "assetKind", "assetId", "name", "role"]);
  if (!["image", "video"].includes(item.kind) || (item.kind === "video" ? item.assetKind !== "video" : !["reference", "generated"].includes(item.assetKind)) ||
      typeof item.name !== "string" || !item.name.trim() || item.name.length > 255 || (requiredRole || item.role !== undefined) && !(item.kind === "image" ? VIDEO_IMAGE_ROLES : VIDEO_VIDEO_ROLES).includes(item.role)) invalid();
  return { kind: item.kind, assetKind: item.assetKind, assetId: videoGenerationId(item.assetId), name: item.name, ...(item.role ? { role: item.role } : {}) };
}
export function validateVideoGeneration(raw) {
  if (!raw || raw.lastInput !== undefined || raw.materials !== undefined || raw.roles !== undefined) invalid();
  const { media, projectId, requestId, quotedCredits, ...draft } = raw ?? {};
  const normalized = validateVideoDraft({ ...draft, materials: [], roles: {} });
  if (draft.materials !== undefined || draft.roles !== undefined || !Array.isArray(media) || media.length > 8) invalid();
  const input = { ...normalized, requestId: videoGenerationId(requestId), projectId: videoGenerationId(projectId), media: media.map((item) => validateMaterial(item, true)) };
  delete input.materials; delete input.roles;
  if (new Set(input.media.map((item) => `${item.assetKind}:${item.assetId}`)).size !== input.media.length) invalid("请勿重复添加同一素材。");
  const problem = videoGenerationProblem(input); if (problem) invalid(problem);
  if (quotedCredits !== undefined && (!Number.isSafeInteger(quotedCredits) || quotedCredits <= 0)) invalid();
  return { ...input, ...(quotedCredits !== undefined ? { quotedCredits } : {}) };
}
export async function readVideoGenerationJson(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 64 * 1024) throw new VideoGenerationError("VIDEO_INPUT_TOO_LARGE", "视频请求过大。", 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { invalid(); }
}
