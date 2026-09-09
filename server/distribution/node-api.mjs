import { DistributionError } from "./errors.mjs";
import {
  createDistributionTransfer,
  distributionApiError,
  readDistribution,
  readDistributionChildren,
  readDistributionTransfers,
} from "./api.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

const DEFAULT_OPERATIONS = Object.freeze({
  createDistributionTransfer,
  readDistribution,
  readDistributionChildren,
  readDistributionTransfers,
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
  if (headerValue(request.headers, "x-goodgood-distribution-action") !== "1") {
    throw new DistributionError(
      "DISTRIBUTION_CSRF_CHECK_FAILED",
      "积分划拨请求未通过安全校验，请刷新后重试。",
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
      throw new DistributionError(
        "CREDIT_TRANSFER_REQUEST_INVALID",
        "积分划拨请求内容过大。",
        400,
      );
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DistributionError(
      "CREDIT_TRANSFER_REQUEST_INVALID",
      "积分划拨请求内容无效。",
      400,
    );
  }
}

export function createDistributionNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleDistributionNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (
      url.pathname !== "/api/distribution" &&
      !url.pathname.startsWith("/api/distribution/")
    ) {
      return false;
    }
    try {
      const ownerContext = await authenticate(request);
      if (request.method === "GET") {
        if (url.pathname === "/api/distribution") {
          sendJson(response, 200, await operations.readDistribution({ ownerContext }));
          return true;
        }
        if (url.pathname === "/api/distribution/children") {
          sendJson(
            response,
            200,
            await operations.readDistributionChildren({ ownerContext }),
          );
          return true;
        }
        if (url.pathname === "/api/distribution/transfers") {
          sendJson(
            response,
            200,
            await operations.readDistributionTransfers({
              input: {
                cursor: url.searchParams.get("cursor"),
                limit: url.searchParams.get("limit") ?? undefined,
              },
              ownerContext,
            }),
          );
          return true;
        }
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/distribution/transfers"
      ) {
        assertCsrfSafe(request);
        const result = await operations.createDistributionTransfer({
          idempotencyKey: headerValue(request.headers, "idempotency-key"),
          input: await readJson(request),
          ownerContext,
        });
        sendJson(response, result.created ? 201 : 200, result);
        return true;
      }
      sendJson(response, 405, { error: "method_not_allowed" });
      return true;
    } catch (error) {
      const failure = distributionApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
