import { billingApiError, readBillingSummary } from "./api.mjs";
import {
  acceptFakePaymentWebhook,
  createPaymentOrder,
  listBillingProducts,
  readPaymentOrder,
} from "./payment-api.mjs";
import { PaymentError } from "./payment-errors.mjs";
import { loadFakePaymentSandboxConfig } from "./payment-sandbox.mjs";
import { requestIdFor } from "../observability/http.mjs";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { ...JSON_HEADERS, ...headers });
  response.end(JSON.stringify(payload));
}

async function readRawBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) {
      throw new PaymentError(
        "PAYMENT_REQUEST_INVALID",
        "支付请求内容过大。",
        400,
      );
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  try {
    return JSON.parse((await readRawBody(request)).toString("utf8"));
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("PAYMENT_REQUEST_INVALID", "支付订单请求无效。", 400);
  }
}

function idempotencyKey(request) {
  const value = request.headers["idempotency-key"];
  return Array.isArray(value) ? value[0] : value;
}

const DEFAULT_OPERATIONS = Object.freeze({
  acceptFakePaymentWebhook,
  createPaymentOrder,
  listBillingProducts,
  readBillingSummary,
  readPaymentOrder,
});

export function createBillingNodeApiHandler({
  authenticate,
  operations = DEFAULT_OPERATIONS,
  paymentSandbox = loadFakePaymentSandboxConfig(),
}) {
  if (typeof authenticate !== "function") {
    throw new Error("An authenticated owner resolver is required.");
  }

  return async function handleBillingNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (
      url.pathname !== "/api/billing" &&
      !url.pathname.startsWith("/api/billing/")
    ) {
      return false;
    }
    try {
      if (url.pathname === "/api/billing/webhooks/fake") {
        if (request.method !== "POST") {
          sendJson(
            response,
            405,
            { error: "method_not_allowed" },
            { allow: "POST" },
          );
          return true;
        }
        sendJson(
          response,
          200,
          await operations.acceptFakePaymentWebhook({
            headers: request.headers,
            paymentSandbox,
            rawBody: await readRawBody(request),
          }),
        );
        return true;
      }

      const ownerContext = await authenticate(request);
      if (request.method === "GET") {
        if (url.pathname === "/api/billing") {
          sendJson(
            response,
            200,
            await operations.readBillingSummary({ ownerContext }),
          );
          return true;
        }
        if (url.pathname === "/api/billing/products") {
          sendJson(
            response,
            200,
            await operations.listBillingProducts({ ownerContext }),
          );
          return true;
        }
        const orderMatch = /^\/api\/billing\/orders\/([^/]+)$/.exec(
          url.pathname,
        );
        if (orderMatch) {
          sendJson(
            response,
            200,
            await operations.readPaymentOrder({
              orderId: decodeURIComponent(orderMatch[1]),
              ownerContext,
            }),
          );
          return true;
        }
      }
      if (url.pathname === "/api/billing/orders" && request.method === "POST") {
        const result = await operations.createPaymentOrder({
          idempotencyKey: idempotencyKey(request),
          input: await readJson(request),
          ownerContext,
          paymentSandbox,
        });
        sendJson(response, result.created ? 201 : 200, result.order);
        return true;
      }
      sendJson(
        response,
        405,
        { error: "method_not_allowed" },
        {
          allow:
            url.pathname === "/api/billing/orders"
              ? "POST"
              : "GET",
        },
      );
      return true;
    } catch (error) {
      const failure = billingApiError(error, requestIdFor(request));
      sendJson(response, failure.status, failure.body);
      return true;
    }
  };
}
