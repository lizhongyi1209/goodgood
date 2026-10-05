import { videoProviderBody } from "../../shared/contracts/video-generation.mjs";
import { providerErrorFields, requestFailureContext, sanitizeFailureDiagnostic } from "../generation/failure-diagnostics.mjs";
import { VideoGenerationError } from "./errors.mjs";
export function videoProviderEndpoint(config, modelId, taskId) {
  if (config.kind !== "o1key" || !config.apiKey || !["kling-3.0-omni", "kling-3.0"].includes(modelId)) throw new VideoGenerationError("VIDEO_PROVIDER_UNAVAILABLE", "视频生成服务尚未配置。", 503);
  const path = modelId === "kling-3.0-omni" ? "/kling/omni-video/kling-3.0-omni" : "/kling/motion-control/kling-3.0";
  const url = new URL(`${path}${taskId ? `/${encodeURIComponent(taskId)}` : ""}`, config.baseUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new VideoGenerationError("VIDEO_PROVIDER_UNAVAILABLE", "视频生成服务地址无效。", 503);
  return url;
}
export function normalizeVideoTask(payload, expectedId = null) {
  const taskId = payload?.task_id ?? payload?.id;
  if (typeof taskId !== "string" || !taskId || taskId.length > 200 || expectedId && taskId !== expectedId) throw new VideoGenerationError("VIDEO_TASK_RESPONSE_INVALID", "视频任务回执无效。", 503);
  const status = String(payload.status ?? "").toUpperCase();
  const state = { QUEUED: "running", SUBMITTED: "running", IN_PROGRESS: "running", SUCCESS: "succeeded", FAILURE: "failed" }[status];
  if (!state) throw new VideoGenerationError("VIDEO_TASK_RESPONSE_INVALID", "视频任务状态暂不可识别。", 503);
  let videoUrl = null;
  if (state === "succeeded") {
    try { const url = new URL(payload.video_url); if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw new Error(); videoUrl = url.href; }
    catch { throw new VideoGenerationError("VIDEO_RESULT_INVALID", "视频结果地址无效。", 503); }
  }
  return { taskId, state, videoUrl, progress: typeof payload.progress === "number" && payload.progress >= 0 && payload.progress <= 100 ? payload.progress : null,
    durationSeconds: Number.isFinite(Number(payload.duration)) ? Number(payload.duration) : null,
    providerCost: typeof payload.cost === "string" || typeof payload.cost === "number" ? String(payload.cost).slice(0, 64) : null,
    diagnostics: sanitizeFailureDiagnostic({ phase: "task-poll", reason: state === "failed" ? "upstream-task-failed" : undefined, upstreamTaskId: taskId, ...providerErrorFields(payload) }) };
}
async function request(config, input, media, taskId, fetchImplementation) {
  const url = videoProviderEndpoint(config, input.modelId, taskId); const method = taskId ? "GET" : "POST"; const started = Date.now();
  let response;
  try {
    response = await fetchImplementation(url, { method, redirect: "error", headers: { authorization: `Bearer ${config.apiKey}`, ...(taskId ? {} : { "content-type": "application/json" }) },
      ...(taskId ? {} : { body: JSON.stringify(videoProviderBody(input, media)) }), signal: AbortSignal.timeout(60_000) });
  } catch (cause) {
    throw new VideoGenerationError(taskId ? "VIDEO_POLL_UNAVAILABLE" : "VIDEO_SUBMISSION_UNKNOWN", taskId ? "视频状态暂不可用，稍后继续查询。" : "提交结果待确认，请勿重复生成。", 503,
      requestFailureContext({ url, method, phase: taskId ? "task-poll" : "submission", cause, durationMs: Date.now() - started }));
  }
  let payload;
  try {
    const text = await response.text(); if (text.length > 64 * 1024) throw new Error(); payload = JSON.parse(text);
  } catch {
    throw new VideoGenerationError(taskId ? "VIDEO_POLL_UNAVAILABLE" : "VIDEO_SUBMISSION_UNKNOWN", "视频服务回执暂不可用。", 503,
      { phase: taskId ? "task-poll" : "submission", reason: "invalid-json", httpStatus: response.status });
  }
  const safeDiagnostic = (fields) => sanitizeFailureDiagnostic(fields, { secrets: [config.apiKey] });
  if (!response.ok) {
    const rejected = !taskId && response.status >= 400 && response.status < 500 && response.status !== 408;
    throw new VideoGenerationError(taskId ? "VIDEO_POLL_UNAVAILABLE" : rejected ? "VIDEO_SUBMISSION_REJECTED" : "VIDEO_SUBMISSION_UNKNOWN", rejected ? "视频请求未被接收，请检查参数后重试。" : "视频任务状态待确认，请勿重复提交。", 503,
      safeDiagnostic({ ...requestFailureContext({ url, method, response, phase: taskId ? "task-poll" : "submission", durationMs: Date.now() - started }), ...providerErrorFields(payload) }));
  }
  try { const task = normalizeVideoTask(payload, taskId); return { ...task, progress: task.progress === null ? null : Math.round(task.progress), diagnostics: safeDiagnostic(task.diagnostics) }; }
  catch (error) { if (!taskId) throw new VideoGenerationError("VIDEO_SUBMISSION_UNKNOWN", "视频提交回执不完整，请勿重复生成。", 503, safeDiagnostic({ phase: "submission", reason: "missing-task-id", ...providerErrorFields(payload) })); throw error; }
}
export const createVideoProviderTask = (config, input, media, fetchImplementation = fetch) => request(config, input, media, null, fetchImplementation);
export const queryVideoProviderTask = (config, input, taskId, fetchImplementation = fetch) => request(config, input, [], taskId, fetchImplementation);
