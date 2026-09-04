import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_CONTEXTS = new WeakMap();
const CORRELATION_FIELDS = new Set([
  "jobId",
  "ownerId",
  "providerTaskId",
]);

function createRequestId() {
  return `req_${randomUUID()}`;
}

function safeCorrelationValue(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 200) {
    return null;
  }
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : null;
}

function requestPath(request) {
  try {
    return new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    return "/invalid-request-target";
  }
}

export function httpRouteForPath(pathname) {
  const routes = [
    [/^\/api\/generations\/[^/]+\/retry$/, "/api/generations/:jobId/retry"],
    [/^\/api\/generations\/[^/]+$/, "/api/generations/:jobId"],
    [/^\/api\/projects\/[^/]+$/, "/api/projects/:projectId"],
    [
      /^\/api\/references\/[^/]+\/complete$/,
      "/api/references/:referenceId/complete",
    ],
    [/^\/api\/billing\/orders\/[^/]+$/, "/api/billing/orders/:orderId"],
  ];
  return routes.find(([pattern]) => pattern.test(pathname))?.[1] ?? pathname;
}

export function requestContext(request) {
  let context = REQUEST_CONTEXTS.get(request);
  if (!context) {
    context = {
      correlation: {},
      requestId: createRequestId(),
      startedAt: performance.now(),
    };
    REQUEST_CONTEXTS.set(request, context);
  }
  return context;
}

export function requestIdFor(request) {
  return requestContext(request).requestId;
}

export function correlateRequest(request, fields) {
  const context = requestContext(request);
  for (const [key, value] of Object.entries(fields ?? {})) {
    if (!CORRELATION_FIELDS.has(key)) continue;
    const safeValue = safeCorrelationValue(value);
    if (safeValue) context.correlation[key] = safeValue;
  }
  return context;
}

export function observeHttpRequest(
  request,
  response,
  {
    log = (entry) => console.log(JSON.stringify(entry)),
    now = () => performance.now(),
    service = "goodgood-web",
    timestamp = () => new Date().toISOString(),
  } = {},
) {
  const context = requestContext(request);
  response.setHeader(REQUEST_ID_HEADER, context.requestId);

  let logged = false;
  const complete = () => {
    if (logged) return;
    logged = true;
    const statusCode = Number(response.statusCode) || 500;
    log({
      durationMs: Math.max(0, Math.round(now() - context.startedAt)),
      event: "http.request_completed",
      method: request.method ?? "UNKNOWN",
      requestId: context.requestId,
      route: httpRouteForPath(requestPath(request)),
      service,
      statusCode,
      timestamp: timestamp(),
      ...context.correlation,
    });
  };

  response.once("finish", complete);
  response.once("close", complete);
  return context;
}

export function newRequestId() {
  return createRequestId();
}
