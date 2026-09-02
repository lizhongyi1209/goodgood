import { createHash } from "node:crypto";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { PaymentError } from "./payment-errors.mjs";
import {
  createPaymentOrder as createPaymentOrderRecord,
  findPaymentOrder,
  listActivePaymentProducts,
  settleFakePaymentOrder,
} from "./payment-repository.mjs";
import { verifyFakePaymentWebhook } from "./payment-sandbox.mjs";

export const previewBillingProducts = Object.freeze({
  products: Object.freeze([
    Object.freeze({
      creditAmount: "500",
      creditUnit: "credit",
      currency: "CNY",
      id: "credits-500-cny",
      moneyAmountMinor: "1000",
      version: 1,
    }),
  ]),
});

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function presentProduct(product) {
  return {
    creditAmount: product.creditAmount.toString(),
    creditUnit: product.creditUnit,
    currency: product.currency,
    id: product.productId,
    moneyAmountMinor: product.moneyAmountMinor.toString(),
    version: product.version,
  };
}

function presentOrder(order) {
  return {
    createdAt: order.createdAt.toISOString(),
    creditAmount: order.creditAmount.toString(),
    creditUnit: order.creditUnit,
    currency: order.currency,
    id: order.publicId,
    moneyAmountMinor: order.moneyAmountMinor.toString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    productId: order.productId,
    productVersion: order.productVersion,
    status: order.state,
  };
}

function paymentRequest(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    typeof input.productId !== "string" ||
    input.productId.length < 1 ||
    input.productId.length > 100 ||
    Object.keys(input).some((key) => key !== "productId")
  ) {
    throw new PaymentError(
      "PAYMENT_REQUEST_INVALID",
      "支付订单请求无效。",
      400,
    );
  }
  return { productId: input.productId };
}

function webhookPayload(rawBody) {
  let input;
  try {
    input = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  for (const field of [
    "currency",
    "eventId",
    "eventType",
    "moneyAmountMinor",
    "providerOrderId",
  ]) {
    if (typeof input[field] !== "string") {
      throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
    }
  }
  return input;
}

export async function listBillingProducts({
  ownerContext,
  resources = null,
}) {
  ownerIdFromContext(ownerContext);
  const resolvedResources = resources ?? (await getGenerationResources());
  const products = await listActivePaymentProducts(resolvedResources.pool);
  return { products: products.map(presentProduct) };
}

export async function createPaymentOrder({
  idempotencyKey,
  input,
  ownerContext,
  paymentSandbox,
  resources = null,
}) {
  if (!paymentSandbox?.enabled) {
    throw new PaymentError(
      "PAYMENT_SANDBOX_DISABLED",
      "支付测试通道当前不可用。",
      503,
      true,
    );
  }
  const ownerId = ownerIdFromContext(ownerContext);
  const request = paymentRequest(input);
  const resolvedResources = resources ?? (await getGenerationResources());
  const result = await createPaymentOrderRecord(resolvedResources.pool, {
    idempotencyKey,
    ownerId,
    productId: request.productId,
    provider: paymentSandbox.provider,
  });
  return { created: result.created, order: presentOrder(result.order) };
}

export async function readPaymentOrder({
  orderId,
  ownerContext,
  resources = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  if (typeof orderId !== "string" || !/^ord_[a-f0-9]{32}$/.test(orderId)) {
    throw new PaymentError("PAYMENT_ORDER_NOT_FOUND", "未找到支付订单。", 404);
  }
  const resolvedResources = resources ?? (await getGenerationResources());
  const order = await findPaymentOrder(resolvedResources.pool, {
    ownerId,
    publicId: orderId,
  });
  if (!order) {
    throw new PaymentError("PAYMENT_ORDER_NOT_FOUND", "未找到支付订单。", 404);
  }
  return presentOrder(order);
}

export async function acceptFakePaymentWebhook({
  headers,
  now = new Date(),
  paymentSandbox,
  rawBody,
  resources = null,
}) {
  verifyFakePaymentWebhook({
    config: paymentSandbox,
    headers,
    now,
    rawBody,
  });
  const payload = webhookPayload(rawBody);
  const resolvedResources = resources ?? (await getGenerationResources());
  const result = await settleFakePaymentOrder(resolvedResources.pool, {
    event: {
      ...payload,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    },
  });
  return {
    applied: result.applied,
    orderId: result.order.publicId,
    replayed: result.replayed,
    status: result.order.state,
  };
}
