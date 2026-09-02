import { validateReferenceIds } from "../references/validation.mjs";
import { DraftRequestError } from "./errors.mjs";

const MODEL_IDS = new Set([
  "nano-banana-2",
  "nano-banana-pro",
  "gpt-image-2",
]);
const ASPECT_RATIOS = new Set([
  "1:8",
  "1:4",
  "9:16",
  "2:3",
  "3:4",
  "4:5",
  "1:1",
  "5:4",
  "4:3",
  "3:2",
  "16:9",
  "21:9",
  "4:1",
  "8:1",
]);
const RESOLUTIONS = new Set(["1K", "2K", "4K"]);
const COUNTS = new Set([1, 2, 4]);

function invalidDraft(message = "草稿数据格式不正确，请刷新后重试。") {
  return new DraftRequestError("INVALID_DRAFT", message);
}

export function validateExpectedDraftVersion(value) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value <= 0) throw invalidDraft();
  return value;
}

export function validateDraftMutation(payload) {
  if (!payload || typeof payload !== "object") throw invalidDraft();
  const state = payload.state;
  if (!state || typeof state !== "object") throw invalidDraft();
  const prompt = typeof state.prompt === "string" ? state.prompt : null;
  if (prompt === null || prompt.length > 4_000) {
    throw invalidDraft("草稿提示词不能超过 4000 个字符。");
  }
  if (!MODEL_IDS.has(state.modelId)) throw invalidDraft();
  if (!ASPECT_RATIOS.has(state.aspectRatio)) throw invalidDraft();
  if (!RESOLUTIONS.has(state.resolution)) throw invalidDraft();
  if (!COUNTS.has(state.count)) throw invalidDraft();

  return {
    expectedVersion: validateExpectedDraftVersion(payload.expectedVersion),
    state: {
      aspectRatio: state.aspectRatio,
      count: state.count,
      modelId: state.modelId,
      prompt,
      referenceIds: validateReferenceIds(
        Array.isArray(state.references) ? state.references : [],
      ),
      resolution: state.resolution,
    },
  };
}

export function validateDraftDelete(payload) {
  if (!payload || typeof payload !== "object") throw invalidDraft();
  return validateExpectedDraftVersion(payload.expectedVersion);
}
