import { NormalizedProviderError } from "./provider.mjs";
import {
  DEFAULT_GPT_IMAGE_OUTPUT_FORMAT,
  SUPPORTED_GPT_IMAGE_BACKGROUNDS,
  SUPPORTED_GPT_IMAGE_OUTPUT_FORMATS,
  SUPPORTED_GPT_IMAGE_QUALITIES,
  SUPPORTED_GENERATION_RESOLUTIONS,
  getGenerationModelCapability,
  getGptImage2PixelSize,
  isSupportedGenerationInput,
} from "./capabilities.mjs";

export const US_GATEWAY_CONTRACT_VERSION = "o1key-image-api-2026-09-08";

export const US_GATEWAY_NANO_BANANA_2_ROUTE = Object.freeze({
  aspectRatios: getGenerationModelCapability("nano-banana-2").aspectRatios,
  outputCounts: getGenerationModelCapability("nano-banana-2").outputCounts,
  productModelId: "nano-banana-2",
  provider: "o1key",
  providerModel: "gemini-3.1-flash-image-c-sp",
  resolutions: SUPPORTED_GENERATION_RESOLUTIONS,
  routeVersion: "o1key-gemini-3.1-flash-image-c-sp-v4",
});

export const US_GATEWAY_GPT_IMAGE_2_ROUTE = Object.freeze({
  aspectRatios: getGenerationModelCapability("gpt-image-2").aspectRatios,
  outputCounts: getGenerationModelCapability("gpt-image-2").outputCounts,
  productModelId: "gpt-image-2",
  provider: "o1key",
  providerModel: "gpt-image-2-c-sd",
  resolutions: SUPPORTED_GENERATION_RESOLUTIONS,
  routeVersion: "o1key-gpt-image-2-c-sd-v2",
});

export const US_GATEWAY_MVP_ROUTE = US_GATEWAY_NANO_BANANA_2_ROUTE;

export function getUsGatewayRoute(modelId) {
  return Object.freeze({
    "nano-banana-2": US_GATEWAY_NANO_BANANA_2_ROUTE,
    "gpt-image-2": US_GATEWAY_GPT_IMAGE_2_ROUTE,
  })[modelId] ?? null;
}

const TERMINAL_STATES = new Set(["failed", "succeeded"]);
const STATE_ORDER = Object.freeze({ queued: 0, running: 1, failed: 2, succeeded: 2 });
const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
const MAX_REFERENCES = 10;
export const US_GATEWAY_FAILURE_CONFIRMATION_POLLS = 3;

const FAILURE_COPY = Object.freeze({
  CAPACITY_BUSY: Object.freeze({
    message: "生成服务暂时繁忙。输入内容已保留，请稍后重试。",
    retryable: true,
  }),
  INTERNAL_ERROR: Object.freeze({
    message: "生成服务返回了无法识别的结果。输入内容已保留，请重试。",
    retryable: true,
  }),
  MODEL_REJECTED: Object.freeze({
    message: "模型未接受本次请求。你可以修改提示词或设置后重试。",
    retryable: false,
  }),
  MODEL_TIMEOUT: Object.freeze({
    message: "模型服务响应超时。提示词与生成参数均已保留，你可以直接重试。",
    retryable: true,
  }),
  SUBMISSION_UNKNOWN: Object.freeze({
    message: "生成请求可能已被上游受理。系统不会自动重复提交；再次生成会创建新的计费任务。",
    retryable: true,
  }),
});

function normalizedError(code, retryable = FAILURE_COPY[code].retryable) {
  return new NormalizedProviderError({
    code,
    message: FAILURE_COPY[code].message,
    retryable,
  });
}

function protocolError() {
  return normalizedError("INTERNAL_ERROR");
}

function normalizeFailure(error) {
  const rawMessage = typeof error === "string" ? error : String(error?.message ?? "");
  const rawCode = typeof error === "object" ? String(error?.code ?? "") : "";
  const detail = `${rawCode} ${rawMessage}`.toLowerCase();
  if (/moderation|policy|reject|safety|unsafe/.test(detail)) {
    return Object.freeze({ ...FAILURE_COPY.MODEL_REJECTED, code: "MODEL_REJECTED" });
  }
  if (/timeout|timed out/.test(detail)) {
    return Object.freeze({ ...FAILURE_COPY.MODEL_TIMEOUT, code: "MODEL_TIMEOUT" });
  }
  if (/429|capacity|busy|rate.?limit|overload/.test(detail)) {
    return Object.freeze({ ...FAILURE_COPY.CAPACITY_BUSY, code: "CAPACITY_BUSY" });
  }
  return Object.freeze({ ...FAILURE_COPY.INTERNAL_ERROR, code: "INTERNAL_ERROR" });
}

function normalizeOutput(output, index) {
  let url;
  try {
    url = new URL(output?.url);
  } catch {
    throw protocolError();
  }
  if (
    url.protocol !== "https:" ||
    typeof output?.mime_type !== "string" ||
    !output.mime_type.startsWith("image/")
  ) {
    throw protocolError();
  }
  return Object.freeze({
    id: `output-${index + 1}`,
    mimeType: output.mime_type,
    url: url.href,
  });
}

function normalizeProgress(value, state) {
  const parsed = typeof value === "string" && /^\d{1,3}%$/.test(value)
    ? Number.parseInt(value, 10)
    : Number(value);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  if (state === "queued") return 0;
  if (TERMINAL_STATES.has(state)) return 100;
  return null;
}

export function normalizeUsGatewayTask(
  payload,
  { expectedOutputCount = 1 } = {},
) {
  if (![1, 2, 4].includes(expectedOutputCount)) throw protocolError();
  const taskId = payload?.task_id;
  if (typeof taskId !== "string" || !taskId) throw protocolError();
  const state = Object.freeze({
    FAILURE: "failed",
    IN_PROGRESS: "running",
    SUBMITTED: "queued",
    SUCCESS: "succeeded",
  })[payload.status];
  if (!state) throw protocolError();

  const rawOutputs = payload.data?.images ?? [];
  if (!Array.isArray(rawOutputs)) throw protocolError();
  const outputs = Object.freeze(rawOutputs.map(normalizeOutput));
  const failures = Object.freeze(
    state === "failed" ? [normalizeFailure(payload.error)] : [],
  );
  if (state === "succeeded" && outputs.length !== expectedOutputCount) {
    throw protocolError();
  }
  if (state !== "succeeded" && outputs.length !== 0) throw protocolError();

  return Object.freeze({
    failures,
    outputs,
    progress: normalizeProgress(payload.progress, state),
    state,
    taskId,
    terminal: TERMINAL_STATES.has(state),
  });
}

function stableTerminalValue(task) {
  return JSON.stringify({
    failures: task.failures,
    outputs: task.outputs,
    state: task.state,
    taskId: task.taskId,
  });
}

export function reconcileUsGatewayTask(current, incoming) {
  if (!current) return { duplicate: false, task: incoming };
  if (current.taskId !== incoming.taskId) throw protocolError();
  if (current.terminal && incoming.terminal) {
    if (stableTerminalValue(current) !== stableTerminalValue(incoming)) {
      throw protocolError();
    }
    return { duplicate: true, task: current };
  }
  if (current.terminal) return { duplicate: true, task: current };
  if (incoming.terminal) return { duplicate: false, task: incoming };

  const currentProgress = current.progress ?? -1;
  const incomingProgress = incoming.progress ?? -1;
  if (
    STATE_ORDER[incoming.state] < STATE_ORDER[current.state] ||
    (STATE_ORDER[incoming.state] === STATE_ORDER[current.state] &&
      incomingProgress <= currentProgress)
  ) {
    return { duplicate: true, task: current };
  }
  return { duplicate: false, task: incoming };
}

function assertLoopbackOrHttps(baseUrl, allowInsecureLoopback) {
  const url = new URL(baseUrl);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(allowInsecureLoopback && loopback)) {
    throw new Error(
      "US gateway URL must use HTTPS unless insecure loopback is explicitly enabled.",
    );
  }
  return url.href.replace(/\/$/, "");
}

function sanitizeFileName(value) {
  const fileName = String(value ?? "reference.png")
    .replaceAll("\\", "/")
    .split("/")
    .at(-1)
    ?.replace(/[\r\n"]/g, "_");
  return fileName || "reference.png";
}

function validateReference(reference) {
  const bytes = reference?.bytes;
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_REFERENCE_BYTES) {
    throw protocolError();
  }
  if (typeof reference.mimeType !== "string" || !reference.mimeType.startsWith("image/")) {
    throw protocolError();
  }
  return {
    bytes,
    fileName: sanitizeFileName(reference.name),
    mimeType: reference.mimeType,
  };
}

async function parseResponse(response, { submission = false } = {}) {
  if (!response.ok) {
    if (submission && response.status >= 500) {
      throw normalizedError("SUBMISSION_UNKNOWN");
    }
    const code = response.status === 429 || response.status >= 500
      ? "CAPACITY_BUSY"
      : "INTERNAL_ERROR";
    throw normalizedError(code, response.status !== 400 && response.status !== 401 && response.status !== 403);
  }
  try {
    return await response.json();
  } catch {
    throw normalizedError(submission ? "SUBMISSION_UNKNOWN" : "INTERNAL_ERROR");
  }
}

function normalizeTemporaryUpload(payload, expectedMimeType, nowSeconds) {
  let url;
  try {
    url = new URL(payload?.url);
  } catch {
    throw protocolError();
  }
  if (
    url.protocol !== "https:" ||
    payload.content_type !== expectedMimeType ||
    !Number.isInteger(payload.size) ||
    payload.size <= 0 ||
    !Number.isInteger(payload.expires_at) ||
    payload.expires_at <= nowSeconds
  ) {
    throw protocolError();
  }
  return Object.freeze({
    contentType: payload.content_type,
    expiresAt: payload.expires_at,
    fileName: String(payload.filename ?? ""),
    size: payload.size,
    url: url.href,
  });
}

function validateJob(job, route) {
  const thinkingLevel =
    job?.thinking_level ??
    (route.productModelId === "nano-banana-2" ? "high" : "low");
  const googleSearch = job?.google_search ?? false;
  const quality = job?.quality ?? "auto";
  const background = job?.background ?? "auto";
  const outputFormat =
    job?.output_format ??
    (route.productModelId === "gpt-image-2"
      ? DEFAULT_GPT_IMAGE_OUTPUT_FORMAT
      : "png");
  if (
    job?.model_id !== route.productModelId ||
    !isSupportedGenerationInput({
      aspectRatio: job?.aspect_ratio,
      count: job?.requested_count,
      modelId: job?.model_id,
      resolution: job?.resolution,
    }) ||
    !["low", "high"].includes(thinkingLevel) ||
    typeof googleSearch !== "boolean" ||
    !SUPPORTED_GPT_IMAGE_QUALITIES.includes(quality) ||
    !SUPPORTED_GPT_IMAGE_BACKGROUNDS.includes(background) ||
    !SUPPORTED_GPT_IMAGE_OUTPUT_FORMATS.includes(outputFormat) ||
    (background === "transparent" && outputFormat === "jpeg") ||
    (route.productModelId !== "nano-banana-2" &&
      (thinkingLevel !== "low" || googleSearch)) ||
    (route.productModelId !== "gpt-image-2" &&
      (quality !== "auto" || background !== "auto" || outputFormat !== "png"))
  ) {
    throw protocolError();
  }
}

function generationPayload({ job, route, uploadedReferences }) {
  const common = {
    images: uploadedReferences.map((reference) => ({
      fileData: {
        fileUri: reference.url,
        mimeType: reference.contentType,
      },
    })),
    model: route.providerModel,
    prompt: job.prompt,
  };
  if (route.productModelId === "gpt-image-2") {
    return {
      ...common,
      background: job.background ?? "auto",
      n: job.requested_count,
      output_format: job.output_format ?? DEFAULT_GPT_IMAGE_OUTPUT_FORMAT,
      quality: job.quality ?? "auto",
      size: getGptImage2PixelSize(job.aspect_ratio, job.resolution),
    };
  }
  return {
    ...common,
    aspect_ratio: job.aspect_ratio,
    response_modalities: ["TEXT", "IMAGE"],
    size: job.resolution,
    ...((job.thinking_level ?? "high") === "high"
      ? { thinking_level: "high" }
      : {}),
    ...(job.google_search ? { google_search: true } : {}),
  };
}

export function createUsGatewayAdapter({
  apiKey,
  baseUrl,
  fetchImplementation = fetch,
  now = () => Date.now(),
  requestTimeoutMs = 15_000,
  failureConfirmationPolls = US_GATEWAY_FAILURE_CONFIRMATION_POLLS,
  route = US_GATEWAY_MVP_ROUTE,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  allowInsecureLoopback = false,
}) {
  if (typeof apiKey !== "string" || !apiKey) throw new Error("Gateway API key is required.");
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("Gateway request timeout must be a positive integer.");
  }
  if (!Number.isInteger(failureConfirmationPolls) || failureConfirmationPolls <= 0) {
    throw new Error("Gateway failure confirmation polls must be a positive integer.");
  }
  const origin = assertLoopbackOrHttps(baseUrl, allowInsecureLoopback);
  if (getUsGatewayRoute(route.productModelId) !== route) {
    throw new Error("A supported O1Key generation route is required.");
  }

  async function request(path, options = {}) {
    const { submission = false, ...requestOptions } = options;
    let response;
    try {
      response = await fetchImplementation(`${origin}${path}`, {
        ...requestOptions,
        headers: {
          authorization: `Bearer ${apiKey}`,
          ...requestOptions.headers,
        },
        signal: requestOptions.signal ?? AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw normalizedError(submission ? "SUBMISSION_UNKNOWN" : "CAPACITY_BUSY");
    }
    return parseResponse(response, { submission });
  }

  async function getTask(taskId, expectedOutputCount) {
    const payload = await request(
      `/async/v1/tasks/${encodeURIComponent(taskId)}`,
      { method: "GET" },
    );
    return normalizeUsGatewayTask(payload, { expectedOutputCount });
  }

  async function uploadReference(reference) {
    const validated = validateReference(reference);
    const form = new FormData();
    form.append(
      "file",
      new Blob([validated.bytes], { type: validated.mimeType }),
      validated.fileName,
    );
    const payload = await request("/v1/o1key/uploads", {
      body: form,
      method: "POST",
    });
    return normalizeTemporaryUpload(
      payload,
      validated.mimeType,
      Math.floor(now() / 1_000),
    );
  }

  async function prepareReferences(references = []) {
    if (!Array.isArray(references) || references.length > MAX_REFERENCES) {
      throw protocolError();
    }
    const uploadedReferences = [];
    for (const reference of references) {
      uploadedReferences.push(await uploadReference(reference));
    }
    return Object.freeze(uploadedReferences);
  }

  async function submitPrepared({
    job,
    onSubmissionStart = async () => {},
    uploadedReferences = [],
  }) {
    validateJob(job, route);
    if (
      !Array.isArray(uploadedReferences) ||
      uploadedReferences.length > MAX_REFERENCES ||
      uploadedReferences.some((reference) =>
        typeof reference?.url !== "string" ||
        typeof reference?.contentType !== "string"
      )
    ) {
      throw protocolError();
    }
    await onSubmissionStart();
    const payload = await request("/async/v1/generateImage", {
      body: JSON.stringify(generationPayload({ job, route, uploadedReferences })),
      headers: { "content-type": "application/json" },
      method: "POST",
      submission: true,
    });
    if (typeof payload?.task_id !== "string" || !payload.task_id) {
      throw normalizedError("SUBMISSION_UNKNOWN");
    }
    return Object.freeze({ taskId: payload.task_id });
  }

  return Object.freeze({
    getTask,
    prepareReferences,
    route,

    async submit({ job, onSubmissionStart = async () => {}, references = [] }) {
      const uploadedReferences = await prepareReferences(references);
      return submitPrepared({
        job,
        onSubmissionStart,
        uploadedReferences,
      });
    },

    submitPrepared,

    uploadReference,

    async waitForTerminal({
      onUpdate = async () => {},
      expectedOutputCount = 1,
      pollIntervalMs = 250,
      taskId,
      timeoutMs,
    }) {
      if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error("Gateway polling timeout must be a positive integer.");
      }
      const deadline = now() + timeoutMs;
      let current = null;
      let failureCandidate = null;
      let failureObservations = 0;
      while (now() < deadline) {
        const incoming = await getTask(taskId, expectedOutputCount);
        if (incoming.state === "failed") {
          const sameFailure =
            failureCandidate &&
            stableTerminalValue(failureCandidate) === stableTerminalValue(incoming);
          failureCandidate = incoming;
          failureObservations = sameFailure ? failureObservations + 1 : 1;
          if (failureObservations < failureConfirmationPolls) {
            await sleep(pollIntervalMs);
            continue;
          }
        } else {
          failureCandidate = null;
          failureObservations = 0;
        }
        const reconciled = reconcileUsGatewayTask(current, incoming);
        current = reconciled.task;
        if (!reconciled.duplicate) await onUpdate(current);
        if (current.terminal) return current;
        await sleep(pollIntervalMs);
      }
      throw normalizedError("MODEL_TIMEOUT");
    },
  });
}
