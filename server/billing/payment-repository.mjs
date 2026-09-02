import { createHash, randomUUID } from "node:crypto";
import { exactCreditAmount, positiveCreditAmount } from "./policy.mjs";
import {
  grantCreditsInTransaction,
  runCreditTransaction,
} from "./repository.mjs";
import { PaymentError } from "./payment-errors.mjs";
import { FAKE_PAYMENT_PROVIDER } from "./payment-sandbox.mjs";

function requireText(value, fieldName, maximum = 200) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    throw new TypeError(`${fieldName} must contain 1 to ${maximum} characters.`);
  }
  return value;
}

function requireIdempotencyKey(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) {
    throw new PaymentError(
      "PAYMENT_IDEMPOTENCY_REQUIRED",
      "创建支付订单需要有效的幂等键。",
      400,
    );
  }
  return value;
}

function validDate(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${fieldName} is invalid.`);
  return date;
}

function operationHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function paymentOrderOperation({ productId, provider, providerOrderId = null }) {
  return providerOrderId
    ? { productId, provider, providerOrderId }
    : { productId, provider };
}

function productFromRow(row) {
  return {
    creditAmount: exactCreditAmount(row.credit_amount),
    creditUnit: row.credit_unit,
    currency: row.currency,
    effectiveFrom: new Date(row.effective_from),
    effectiveUntil: row.effective_until ? new Date(row.effective_until) : null,
    id: row.id,
    moneyAmountMinor: exactCreditAmount(row.money_amount_minor),
    productId: row.product_id,
    version: row.version,
  };
}

function orderFromRow(row) {
  return {
    createdAt: new Date(row.created_at),
    creditAmount: exactCreditAmount(row.credit_amount),
    creditUnit: row.credit_unit,
    currency: row.currency,
    id: row.id,
    moneyAmountMinor: exactCreditAmount(row.money_amount_minor),
    ownerId: row.owner_id,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    paidLedgerEntryId: row.paid_ledger_entry_id ?? null,
    productId: row.product_id,
    productVersion: row.product_version,
    productVersionId: row.product_version_id,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    publicId: row.public_id,
    state: row.state,
    updatedAt: new Date(row.updated_at),
  };
}

async function advisoryLock(client, scope) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    scope,
  ]);
}

export async function listActivePaymentProducts(client, { at = new Date() } = {}) {
  const activeAt = validDate(at, "at");
  const result = await client.query(
    `SELECT DISTINCT ON (product_id) *
       FROM payment_product_versions
      WHERE effective_from <= $1
        AND (effective_until IS NULL OR effective_until > $1)
      ORDER BY product_id, effective_from DESC, version DESC`,
    [activeAt],
  );
  return result.rows.map(productFromRow);
}

export async function findActivePaymentProduct(
  client,
  { at = new Date(), productId },
) {
  const activeAt = validDate(at, "at");
  const stableProductId = requireText(productId, "productId", 100);
  const result = await client.query(
    `SELECT * FROM payment_product_versions
      WHERE product_id = $1 AND effective_from <= $2
        AND (effective_until IS NULL OR effective_until > $2)
      ORDER BY effective_from DESC, version DESC
      LIMIT 1`,
    [stableProductId, activeAt],
  );
  if (!result.rowCount) {
    throw new PaymentError(
      "PAYMENT_PRODUCT_NOT_AVAILABLE",
      "当前积分产品暂不可用。",
      409,
    );
  }
  return productFromRow(result.rows[0]);
}

export async function createPaymentOrderInTransaction(
  client,
  {
    at = new Date(),
    idempotencyKey,
    ownerId,
    productId,
    provider = FAKE_PAYMENT_PROVIDER,
    providerOrderId = null,
  },
) {
  const key = requireIdempotencyKey(idempotencyKey);
  const stableProductId = requireText(productId, "productId", 100);
  const selectedProvider = requireText(provider, "provider", 64);
  const selectedProviderOrderId = providerOrderId
    ? requireText(providerOrderId, "providerOrderId", 200)
    : null;
  if (selectedProviderOrderId && selectedProviderOrderId.length < 8) {
    throw new TypeError("providerOrderId must contain 8 to 200 characters.");
  }
  const fingerprint = operationHash(
    paymentOrderOperation({
      productId: stableProductId,
      provider: selectedProvider,
      providerOrderId: selectedProviderOrderId,
    }),
  );
  await advisoryLock(client, `payment-order:${ownerId}:${key}`);
  const existing = await client.query(
    `SELECT * FROM payment_orders
      WHERE owner_id = $1 AND idempotency_key = $2
      FOR UPDATE`,
    [ownerId, key],
  );
  if (existing.rowCount) {
    if (existing.rows[0].operation_hash !== fingerprint) {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "该支付请求已用于另一笔订单。",
        409,
      );
    }
    return { created: false, order: orderFromRow(existing.rows[0]) };
  }

  const product = await findActivePaymentProduct(client, {
    at,
    productId: stableProductId,
  });
  const id = randomUUID();
  const publicId = `ord_${randomUUID().replaceAll("-", "")}`;
  const inserted = await client.query(
    `INSERT INTO payment_orders (
       id, public_id, owner_id, product_version_id, product_id,
       product_version, currency, money_amount_minor, credit_unit,
       credit_amount, provider, provider_order_id, idempotency_key,
       operation_hash
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      id,
      publicId,
      ownerId,
      product.id,
      product.productId,
      product.version,
      product.currency,
      product.moneyAmountMinor.toString(),
      product.creditUnit,
      product.creditAmount.toString(),
      selectedProvider,
      selectedProviderOrderId ?? publicId,
      key,
      fingerprint,
    ],
  );
  return { created: true, order: orderFromRow(inserted.rows[0]) };
}

export function createPaymentOrder(pool, input) {
  return runCreditTransaction(pool, (client) =>
    createPaymentOrderInTransaction(client, input),
  );
}

export async function settlePaymentOrderInTransaction(
  client,
  {
    actor = "payment",
    metadata = {},
    order,
    paidAt = new Date(),
    reason = "paid_credit_purchase",
  },
) {
  if (order.state === "paid") {
    return { applied: false, order };
  }
  if (order.state !== "pending") {
    throw new PaymentError(
      "PAYMENT_ORDER_CONFLICT",
      "支付订单状态发生冲突。",
      409,
    );
  }
  const grant = await grantCreditsInTransaction(client, {
    actor,
    amount: order.creditAmount,
    idempotencyKey: `payment-order:${order.publicId}:grant:v1`,
    metadata: {
      paymentProvider: order.provider,
      productId: order.productId,
      productVersion: order.productVersion,
      ...metadata,
    },
    ownerId: order.ownerId,
    reason,
    relatedPaymentRef: order.publicId,
    unit: order.creditUnit,
  });
  const paid = await client.query(
    `UPDATE payment_orders
        SET state = 'paid', paid_ledger_entry_id = $2,
            paid_at = $3, updated_at = $3
      WHERE id = $1 AND state = 'pending'
      RETURNING *`,
    [order.id, grant.entry.id, validDate(paidAt, "paidAt")],
  );
  if (!paid.rowCount) {
    throw new PaymentError(
      "PAYMENT_ORDER_CONFLICT",
      "支付订单状态发生冲突。",
      409,
    );
  }
  return { applied: true, order: orderFromRow(paid.rows[0]) };
}

export async function findPaymentOrder(client, { ownerId, publicId }) {
  const result = await client.query(
    `SELECT * FROM payment_orders
      WHERE owner_id = $1 AND public_id = $2`,
    [ownerId, requireText(publicId, "publicId", 100)],
  );
  return result.rowCount ? orderFromRow(result.rows[0]) : null;
}

async function findOrderById(client, id) {
  const result = await client.query(
    "SELECT * FROM payment_orders WHERE id = $1",
    [id],
  );
  return result.rowCount ? orderFromRow(result.rows[0]) : null;
}

function validatePaymentEvent(event) {
  const eventId = requireText(event.eventId, "eventId", 200);
  if (eventId.length < 8) {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  const eventType = requireText(event.eventType, "eventType", 100);
  if (eventType !== "payment.succeeded") {
    throw new PaymentError(
      "PAYMENT_EVENT_UNSUPPORTED",
      "支付通知类型不受支持。",
      400,
    );
  }
  const currency = requireText(event.currency, "currency", 3);
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  let moneyAmountMinor;
  try {
    moneyAmountMinor = positiveCreditAmount(
      event.moneyAmountMinor,
      "moneyAmountMinor",
    );
  } catch {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  const providerOrderId = requireText(
    event.providerOrderId,
    "providerOrderId",
    200,
  );
  if (providerOrderId.length < 8) {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  return {
    currency,
    eventId,
    eventType,
    moneyAmountMinor,
    payloadHash: requireText(event.payloadHash, "payloadHash", 64),
    providerOrderId,
  };
}

export function settleFakePaymentOrder(pool, { event }) {
  let accepted;
  try {
    accepted = validatePaymentEvent(event);
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  if (!/^[a-f0-9]{64}$/.test(accepted.payloadHash)) {
    throw new PaymentError("PAYMENT_EVENT_INVALID", "支付通知内容无效。", 400);
  }
  return runCreditTransaction(pool, async (client) => {
    await advisoryLock(
      client,
      `payment-event:${FAKE_PAYMENT_PROVIDER}:${accepted.eventId}`,
    );
    const existingEvent = await client.query(
      `SELECT * FROM payment_webhook_events
        WHERE provider = $1 AND provider_event_id = $2`,
      [FAKE_PAYMENT_PROVIDER, accepted.eventId],
    );
    if (existingEvent.rowCount) {
      if (existingEvent.rows[0].payload_hash !== accepted.payloadHash) {
        throw new PaymentError(
          "PAYMENT_EVENT_CONFLICT",
          "支付通知编号已被另一份内容使用。",
          409,
        );
      }
      return {
        applied: existingEvent.rows[0].applied,
        order: await findOrderById(
          client,
          existingEvent.rows[0].payment_order_id,
        ),
        replayed: true,
      };
    }

    const orderResult = await client.query(
      `SELECT * FROM payment_orders
        WHERE provider = $1 AND provider_order_id = $2
        FOR UPDATE`,
      [FAKE_PAYMENT_PROVIDER, accepted.providerOrderId],
    );
    if (!orderResult.rowCount) {
      throw new PaymentError(
        "PAYMENT_ORDER_NOT_FOUND",
        "未找到对应支付订单。",
        404,
      );
    }
    let order = orderFromRow(orderResult.rows[0]);
    if (
      order.currency !== accepted.currency ||
      order.moneyAmountMinor !== accepted.moneyAmountMinor
    ) {
      throw new PaymentError(
        "PAYMENT_AMOUNT_MISMATCH",
        "支付金额与订单不一致。",
        409,
      );
    }

    const settled = await settlePaymentOrderInTransaction(client, {
      actor: "payment",
      order,
    });
    const applied = settled.applied;
    order = settled.order;

    await client.query(
      `INSERT INTO payment_webhook_events (
         id, provider, provider_event_id, event_type, payload_hash,
         payment_order_id, applied
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        FAKE_PAYMENT_PROVIDER,
        accepted.eventId,
        accepted.eventType,
        accepted.payloadHash,
        order.id,
        applied,
      ],
    );
    return { applied, order, replayed: false };
  });
}
