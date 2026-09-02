import { createHash } from "node:crypto";
import { PaymentError } from "./payment-errors.mjs";
import {
  createPaymentOrderInTransaction,
  findActivePaymentProduct,
  settlePaymentOrderInTransaction,
} from "./payment-repository.mjs";
import { runCreditTransaction } from "./repository.mjs";

export const MANUAL_PAYMENT_PROVIDER = "manual";
export const DEFAULT_MANUAL_PAYMENT_PRODUCT = "credits-500-cny";

function requireText(value, fieldName, minimum, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new PaymentError(
      "MANUAL_PAYMENT_REQUEST_INVALID",
      `${fieldName} must contain ${minimum} to ${maximum} characters.`,
      400,
    );
  }
  return text;
}

function normalizeEmail(value) {
  const email = requireText(value, "email", 3, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentError(
      "MANUAL_PAYMENT_REQUEST_INVALID",
      "email must be a valid address.",
      400,
    );
  }
  return email;
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function referenceFingerprint(reference) {
  return createHash("sha256").update(reference).digest("hex");
}

function manualPaymentRequest(input) {
  const paymentReference = requireText(
    input?.paymentReference,
    "paymentReference",
    8,
    200,
  );
  return {
    email: normalizeEmail(input?.email),
    operatorId: requireText(input?.operatorId, "operatorId", 2, 100),
    paymentReference,
    productId: requireText(
      input?.productId ?? DEFAULT_MANUAL_PAYMENT_PRODUCT,
      "productId",
      1,
      100,
    ),
    referenceHash: referenceFingerprint(paymentReference),
  };
}

async function findOwnerByEmail(client, email) {
  const result = await client.query(
    `SELECT id, email, status
       FROM users
      WHERE lower(email) = $1
      ORDER BY id
      LIMIT 2`,
    [email],
  );
  if (result.rowCount !== 1) {
    throw new PaymentError(
      result.rowCount
        ? "MANUAL_PAYMENT_OWNER_CONFLICT"
        : "MANUAL_PAYMENT_OWNER_NOT_FOUND",
      result.rowCount
        ? "该邮箱对应多个账号，不能自动入账。"
        : "未找到对应客户账号。",
      409,
    );
  }
  const owner = result.rows[0];
  if (owner.status !== "active") {
    throw new PaymentError(
      "MANUAL_PAYMENT_OWNER_UNAVAILABLE",
      "客户账号当前不可入账。",
      409,
    );
  }
  return owner;
}

async function findOrderByManualReference(client, paymentReference, lock = false) {
  const result = await client.query(
    `SELECT * FROM payment_orders
      WHERE provider = $1 AND provider_order_id = $2${lock ? " FOR UPDATE" : ""}`,
    [MANUAL_PAYMENT_PROVIDER, paymentReference],
  );
  return result.rows[0] ?? null;
}

function productFromOrderRow(order) {
  return {
    creditAmount: order.credit_amount,
    creditUnit: order.credit_unit,
    currency: order.currency,
    productId: order.product_id,
    moneyAmountMinor: order.money_amount_minor,
    version: order.product_version,
  };
}

function productFromOrder(order) {
  return {
    creditAmount: order.creditAmount,
    creditUnit: order.creditUnit,
    currency: order.currency,
    productId: order.productId,
    moneyAmountMinor: order.moneyAmountMinor,
    version: order.productVersion,
  };
}

function presentPreview({ existingOrder, owner, product, request }) {
  return {
    customer: maskEmail(owner.email.toLowerCase()),
    existingOrder: existingOrder
      ? { id: existingOrder.public_id, status: existingOrder.state }
      : null,
    paymentReferenceHash: request.referenceHash.slice(0, 16),
    product: {
      creditAmount: product.creditAmount.toString(),
      creditUnit: product.creditUnit,
      currency: product.currency,
      id: product.productId,
      moneyAmountMinor: product.moneyAmountMinor.toString(),
      version: product.version,
    },
  };
}

function assertReferenceMatches(existingOrder, owner, productId) {
  if (
    existingOrder &&
    (existingOrder.owner_id !== owner.id ||
      existingOrder.product_id !== productId)
  ) {
    throw new PaymentError(
      "MANUAL_PAYMENT_REFERENCE_CONFLICT",
      "该收款凭证已用于另一客户或积分商品。",
      409,
    );
  }
}

export async function previewManualPayment(pool, input) {
  const request = manualPaymentRequest(input);
  const owner = await findOwnerByEmail(pool, request.email);
  const existingOrder = await findOrderByManualReference(
    pool,
    request.paymentReference,
  );
  assertReferenceMatches(existingOrder, owner, request.productId);
  const product = existingOrder
    ? productFromOrderRow(existingOrder)
    : await findActivePaymentProduct(pool, { productId: request.productId });
  return presentPreview({ existingOrder, owner, product, request });
}

export function recordManualPayment(pool, input) {
  const request = manualPaymentRequest(input);
  return runCreditTransaction(pool, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`manual-payment:${request.paymentReference}`],
    );
    const owner = await findOwnerByEmail(client, request.email);
    const existingOrder = await findOrderByManualReference(
      client,
      request.paymentReference,
      true,
    );
    assertReferenceMatches(existingOrder, owner, request.productId);

    const created = await createPaymentOrderInTransaction(client, {
      idempotencyKey: `manual-payment:v1:${request.referenceHash}`,
      ownerId: owner.id,
      productId: request.productId,
      provider: MANUAL_PAYMENT_PROVIDER,
      providerOrderId: request.paymentReference,
    });
    const settled = await settlePaymentOrderInTransaction(client, {
      actor: "operator",
      metadata: {
        operatorId: request.operatorId,
        paymentReference: request.paymentReference,
      },
      order: created.order,
      reason: "manual_paid_credit_purchase",
    });
    return {
      ...presentPreview({
        existingOrder: {
          public_id: settled.order.publicId,
          state: settled.order.state,
        },
        owner,
        product: productFromOrder(settled.order),
        request,
      }),
      applied: settled.applied,
      created: created.created,
      orderId: settled.order.publicId,
      replayed: !created.created,
      status: settled.order.state,
    };
  });
}
