import {
  acceptContentPolicy,
  contentSafetyApiError,
  createContentReport,
  readContentPolicy,
  readContentReportPreview,
  resolveContentReport,
} from "./api.mjs";
import { ContentSafetyError } from "./errors.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_OPERATIONS = Object.freeze({
  acceptContentPolicy,
  createContentReport,
  readContentPolicy,
  readContentReportPreview,
  resolveContentReport,
});

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function assertCsrfSafe(request) {
  if (headerValue(request.headers, "x-goodgood-content-safety-action") !== "1") {
    throw new ContentSafetyError(
      "CONTENT_SAFETY_CSRF_CHECK_FAILED",
      "内容安全请求未通过安全校验，请刷新后重试。",
      403,
    );
  }
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32 * 1024) {
      throw new ContentSafetyError(
        "CONTENT_SAFETY_REQUEST_INVALID",
        "内容安全请求过大。",
        400,
      );
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ContentSafetyError(
      "CONTENT_SAFETY_REQUEST_INVALID",
      "内容安全请求格式无效。",
      400,
    );
  }
}

export function createContentSafetyNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleContentSafetyNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const inScope =
      url.pathname === "/api/content-policy" ||
      url.pathname === "/api/content-reports" ||
      url.pathname.startsWith("/api/admin/content-reports/");
    if (!inScope) return false;

    try {
      if (url.pathname === "/api/content-policy" && request.method === "GET") {
        const ownerContext = await authenticate(request);
        sendJson(
          response,
          200,
          await operations.readContentPolicy({ ownerContext }),
        );
        return true;
      }
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "POST" });
        return true;
      }
      assertCsrfSafe(request);
      const ownerContext = await authenticate(request);
      if (url.pathname === "/api/content-policy") {
        const result = await operations.acceptContentPolicy({
          idempotencyKey: headerValue(request.headers, "idempotency-key"),
          input: await readJson(request),
          ownerContext,
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }
      if (url.pathname === "/api/content-reports") {
        const result = await operations.createContentReport({
          idempotencyKey: headerValue(request.headers, "idempotency-key"),
          input: await readJson(request),
          ownerContext,
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }
      const previewMatch = /^\/api\/admin\/content-reports\/([^/]+)\/preview$/.exec(
        url.pathname,
      );
      if (previewMatch) {
        sendJson(
          response,
          200,
          await operations.readContentReportPreview({
            idempotencyKey: headerValue(request.headers, "idempotency-key"),
            ownerContext,
            reportId: decodeURIComponent(previewMatch[1]),
          }),
        );
        return true;
      }
      const resolutionMatch = /^\/api\/admin\/content-reports\/([^/]+)\/resolution$/.exec(
        url.pathname,
      );
      if (resolutionMatch) {
        sendJson(
          response,
          200,
          await operations.resolveContentReport({
            idempotencyKey: headerValue(request.headers, "idempotency-key"),
            input: await readJson(request),
            ownerContext,
            reportId: decodeURIComponent(resolutionMatch[1]),
          }),
        );
        return true;
      }
      sendJson(response, 404, { error: "not_found" });
      return true;
    } catch (error) {
      const failure = contentSafetyApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
