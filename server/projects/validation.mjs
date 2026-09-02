import { validateReferenceIds } from "../references/validation.mjs";
import { ProjectRequestError } from "./errors.mjs";

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidProject(message = "项目数据格式不正确，请检查后重试。") {
  return new ProjectRequestError("INVALID_PROJECT", message);
}

export function validateProjectId(projectId) {
  if (typeof projectId !== "string" || !UUID_PATTERN.test(projectId)) {
    throw new ProjectRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  return projectId;
}

export function validateProjectIdempotencyKey(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new ProjectRequestError(
      "INVALID_IDEMPOTENCY_KEY",
      "项目保存请求缺少有效的幂等键。",
    );
  }
  return value;
}

export function validateProjectSaveRequest(payload) {
  if (!payload || typeof payload !== "object") throw invalidProject();
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name || name.length > 32) {
    throw invalidProject("项目名称需为 1 至 32 个字符。");
  }
  const state = payload.state;
  if (!state || typeof state !== "object") throw invalidProject();
  const prompt = typeof state.prompt === "string" ? state.prompt : null;
  if (prompt === null || prompt.length > 4_000) {
    throw invalidProject("项目提示词不能超过 4000 个字符。");
  }
  if (!MODEL_IDS.has(state.modelId)) throw invalidProject();
  if (!ASPECT_RATIOS.has(state.aspectRatio)) throw invalidProject();
  if (!RESOLUTIONS.has(state.resolution)) throw invalidProject();
  if (!COUNTS.has(state.count)) throw invalidProject();

  const references = Array.isArray(state.references) ? state.references : [];
  const referenceIds = validateReferenceIds(references);
  const batchIds = Array.isArray(payload.batchIds) ? payload.batchIds : [];
  if (!batchIds.length || batchIds.length > 500) {
    throw invalidProject("项目至少需要包含一个生成批次。");
  }
  if (
    batchIds.some((batchId) => typeof batchId !== "string" || !UUID_PATTERN.test(batchId)) ||
    new Set(batchIds).size !== batchIds.length
  ) {
    throw invalidProject("项目生成批次格式不正确。");
  }

  return {
    batchIds,
    name,
    state: {
      aspectRatio: state.aspectRatio,
      count: state.count,
      modelId: state.modelId,
      prompt,
      referenceIds,
      resolution: state.resolution,
    },
  };
}
