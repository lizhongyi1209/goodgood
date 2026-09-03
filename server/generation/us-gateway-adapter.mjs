import { NormalizedProviderError } from "./provider.mjs";

export const US_GATEWAY_CONTRACT_VERSION = "o1key-image-api-2026-09-02";

export const US_GATEWAY_MVP_ROUTE = Object.freeze({
  aspectRatio: "1:1",
  outputCount: 1,
  productModelId: "nano-banana-2",
  provider: "o1key",
  providerModel: "gemini-3.1-flash-image-c-sp",
  resolution: "1K",
  routeVersion: "o1key-gemini-3.1-flash-image-c-sp-v1",
});

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

export function normalizeUsGatewayTask(payload) {
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
  if (state === "succeeded" && outputs.length !== US_GATEWAY_MVP_ROUTE.outputCount) {
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

function validateMvpJob(job) {
  if (
    job?.model_id !== US_GATEWAY_MVP_ROUTE.productModelId ||
    job?.aspect_ratio !== US_GATEWAY_MVP_ROUTE.aspectRatio ||
    job?.resolution !== US_GATEWAY_MVP_ROUTE.resolution ||
    job?.requested_count !== US_GATEWAY_MVP_ROUTE.outputCount
  ) {
    throw protocolError();
  }
}

export function createUsGatewayAdapter({
  apiKey,
  baseUrl,
  fetchImplementation = fetch,
  now = () => Date.now(),
  requestTimeoutMs = 15_000,
  failureConfirmationPolls = US_GATEWAY_FAILURE_CONFIRMATION_POLLS,
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

  async function getTask(taskId) {
    const payload = await request(
      `/async/v1/tasks/${encodeURIComponent(taskId)}`,
      { method: "GET" },
    );
    return normalizeUsGatewayTask(payload);
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

  return Object.freeze({
    getTask,
    route: US_GATEWAY_MVP_ROUTE,

    async submit({ job, onSubmissionStart = async () => {}, references = [] }) {
      validateMvpJob(job);
      if (!Array.isArray(references) || references.length > MAX_REFERENCES) {
        throw protocolError();
      }
      const uploadedReferences = [];
      for (const reference of references) {
        uploadedReferences.push(await uploadReference(reference));
      }
      await onSubmissionStart();
      const payload = await request("/async/v1/generateImage", {
        body: JSON.stringify({
          aspect_ratio: US_GATEWAY_MVP_ROUTE.aspectRatio,
          images: uploadedReferences.map((reference) => ({
            fileData: {
              fileUri: reference.url,
              mimeType: reference.contentType,
            },
          })),
          model: US_GATEWAY_MVP_ROUTE.providerModel,
          prompt: job.prompt,
          response_modalities: ["IMAGE"],
          size: US_GATEWAY_MVP_ROUTE.resolution,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        submission: true,
      });
      if (typeof payload?.task_id !== "string" || !payload.task_id) {
        throw normalizedError("SUBMISSION_UNKNOWN");
      }
      return Object.freeze({ taskId: payload.task_id });
    },

    uploadReference,

    async waitForTerminal({
      onUpdate = async () => {},
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
        const incoming = await getTask(taskId);
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
