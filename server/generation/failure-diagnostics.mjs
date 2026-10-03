// Deliberately no request/response body, arbitrary headers, stack or URL query.
const PHASES = new Set(["submission", "reference-upload", "task-poll", "output-download", "provider-request"]);
const STAGES = new Set(["attempt-validation", "provider-submission", "provider-poll", "output-storage", "generation-completion"]);
const REASONS = new Set([
  "http-error", "invalid-json", "invalid-task-response", "invalid-upload-response", "missing-task-id",
  "upstream-task-failed", "network-error", "poll-timeout", "output-error",
  "task-id-invalid", "task-status-invalid", "task-images-invalid", "task-image-count-mismatch",
  "task-image-base64", "task-image-url-missing", "task-image-url-invalid", "task-image-url-unsupported",
  "task-image-mime-invalid", "task-state-images-mismatch",
]);

export function redactDiagnosticText(value, secrets = [], limit = 1000) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  let text = String(value);
  for (const secret of secrets) {
    if (typeof secret === "string" && secret) text = text.split(secret).join("[redacted]");
  }
  // Provider errors occasionally echo a whole JSON request. Do not retain it.
  if (/^\s*(?:\{|\[\s*[\{"\d])/.test(text)) return "[structured error omitted]";
  text = text
    .replace(/data:[^\s"'<>]+/gi, "[image data]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
    .replace(/\bBearer\s+[^\s,;"']+/gi, "Bearer [redacted]")
    .replace(/\b(?:authorization|api[-_ ]?key|access[-_ ]?token|token|secret|password|signature)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "[credential redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/\b(?:prompt|messages|images|image_url|input_image)\b["']?\s*[:=][\s\S]*/gi, "[request content omitted]")
    .replace(/[A-Za-z0-9+/=_-]{80,}/g, "[opaque data]")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ");
  return text.slice(0, limit) || undefined;
}

function identifier(value, secrets) {
  const text = redactDiagnosticText(value, secrets, 200);
  return text && /^[A-Za-z0-9_.:/ -]+$/.test(text) && !text.includes("[redacted]") ? text : undefined;
}

// An allowlist is applied both before storage and at the owner-only read boundary.
export function sanitizeFailureDiagnostic(input, { secrets = [] } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const result = { version: 1 };
  if (PHASES.has(input.phase)) result.phase = input.phase;
  if (STAGES.has(input.stage)) result.stage = input.stage;
  if (REASONS.has(input.reason)) result.reason = input.reason;
  if (["GET", "POST"].includes(input.method)) result.method = input.method;
  if (Number.isInteger(input.httpStatus) && input.httpStatus >= 100 && input.httpStatus <= 599) result.httpStatus = input.httpStatus;
  if (Number.isFinite(input.durationMs) && input.durationMs >= 0) result.durationMs = Math.min(Math.round(input.durationMs), 86_400_000);
  if (typeof input.attemptId === "string" && /^[0-9a-f-]{36}$/i.test(input.attemptId)) result.attemptId = input.attemptId;
  if (Number.isSafeInteger(input.ordinal) && input.ordinal > 0) result.ordinal = input.ordinal;
  if (Number.isSafeInteger(input.outputOrdinal) && input.outputOrdinal > 0) result.outputOrdinal = input.outputOrdinal;
  for (const key of ["expectedOutputCount", "actualOutputCount"]) {
    if (Number.isSafeInteger(input[key]) && input[key] >= 0) result[key] = input[key];
  }
  for (const key of ["upstreamRequestId", "upstreamTaskId", "upstreamCode", "networkName", "networkCode", "provider", "providerModel", "routeVersion", "code"]) {
    const value = identifier(input[key], secrets);
    if (value) result[key] = value;
  }
  if (typeof input.endpoint === "string") {
    try {
      const url = new URL(input.endpoint);
      // Only public API path templates survive; output object paths are private.
      const path = ["/async/v1/generateImage", "/async/v1/tasks/{taskId}", "/v1/o1key/uploads", "/v1/generations"].includes(decodeURI(url.pathname))
        ? decodeURI(url.pathname) : "/[resource]";
      if (["https:", "http:"].includes(url.protocol)) result.endpoint = `${url.protocol}//${url.host}${path}`;
    } catch { /* Invalid endpoints are omitted, never printed. */ }
  }
  const message = redactDiagnosticText(input.upstreamMessage, secrets);
  if (message) result.upstreamMessage = message;
  return Object.keys(result).length > 1 ? Object.freeze(result) : null;
}

export function providerErrorFields(payload) {
  const error = payload?.error;
  return {
    upstreamCode: error && typeof error === "object" ? error.code ?? error.type : undefined,
    upstreamMessage: typeof error === "string" ? error : error?.message ?? payload?.message,
    upstreamRequestId: payload?.request_id ?? error?.request_id,
  };
}

export function requestFailureContext({ url, method = "GET", response, durationMs, phase, cause, secrets = [] }) {
  let endpoint;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.startsWith("/async/v1/tasks/") ? "/async/v1/tasks/{taskId}" : parsed.pathname;
    endpoint = `${parsed.protocol}//${parsed.host}${path}`;
  } catch { /* Omit invalid URL. */ }
  let upstreamRequestId;
  for (const header of ["x-request-id", "request-id", "x-correlation-id", "x-amzn-requestid", "cf-ray"]) {
    upstreamRequestId = response?.headers?.get?.(header);
    if (upstreamRequestId) break;
  }
  return sanitizeFailureDiagnostic({
    endpoint, method, durationMs, phase,
    httpStatus: response?.status, upstreamRequestId,
    networkName: cause?.name, networkCode: cause?.cause?.code ?? cause?.code,
    reason: cause ? "network-error" : undefined,
  }, { secrets });
}
