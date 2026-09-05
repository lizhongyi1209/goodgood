import {
  administrationApiError,
  createAdminTestCreditGrant,
  readAdminDashboard,
  updateAdminAccountStatus,
} from "./api.mjs";
import { AdministrationError } from "./errors.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_OPERATIONS = Object.freeze({
  createAdminTestCreditGrant,
  readAdminDashboard,
  updateAdminAccountStatus,
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
  if (headerValue(request.headers, "x-goodgood-admin-action") !== "1") {
    throw new AdministrationError(
      "ADMIN_CSRF_CHECK_FAILED",
      "账户管理请求未通过安全校验，请刷新后重试。",
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
      throw new AdministrationError(
        "ADMIN_REQUEST_INVALID",
        "账户管理请求内容过大。",
        400,
      );
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "账户管理请求内容无效。",
      400,
    );
  }
}

export function createAdminNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleAdminNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/admin/")) return false;

    try {
      if (request.method !== "POST") {
        sendJson(
          response,
          405,
          { error: "method_not_allowed" },
          { allow: "POST" },
        );
        return true;
      }
      assertCsrfSafe(request);
      const ownerContext = await authenticate(request);
      if (url.pathname === "/api/admin/users/query") {
        sendJson(
          response,
          200,
          await operations.readAdminDashboard({
            input: await readJson(request),
            ownerContext,
          }),
        );
        return true;
      }

      const statusMatch = /^\/api\/admin\/users\/([^/]+)\/status$/.exec(
        url.pathname,
      );
      if (statusMatch) {
        sendJson(
          response,
          200,
          await operations.updateAdminAccountStatus({
            idempotencyKey: headerValue(request.headers, "idempotency-key"),
            input: await readJson(request),
            ownerContext,
            targetOwnerId: decodeURIComponent(statusMatch[1]),
          }),
        );
        return true;
      }

      const grantMatch =
        /^\/api\/admin\/users\/([^/]+)\/test-credit-grants$/.exec(
          url.pathname,
        );
      if (grantMatch) {
        const result = await operations.createAdminTestCreditGrant({
          idempotencyKey: headerValue(request.headers, "idempotency-key"),
          input: await readJson(request),
          ownerContext,
          targetOwnerId: decodeURIComponent(grantMatch[1]),
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }

      sendJson(response, 404, { error: "not_found" });
      return true;
    } catch (error) {
      const failure = administrationApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
