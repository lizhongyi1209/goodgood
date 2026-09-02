import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import pg from "pg";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { billingApiError, readBillingSummary } from "../server/billing/api.mjs";
import { createBillingNodeApiHandler } from "../server/billing/node-api.mjs";
import {
  acceptFakePaymentWebhook,
  createPaymentOrder,
  listBillingProducts,
  readPaymentOrder,
} from "../server/billing/payment-api.mjs";
import { PaymentError } from "../server/billing/payment-errors.mjs";
import {
  loadFakePaymentSandboxConfig,
  signFakePaymentWebhook,
  verifyFakePaymentWebhook,
} from "../server/billing/payment-sandbox.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const integrationEnabled = process.env.GOODGOOD_M6_INTEGRATION === "1";
const databaseUrl =
  process.env.GOODGOOD_M6_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";
const fakeSecret = "goodgood-fake-payment-test-secret";
const paymentSandbox = loadFakePaymentSandboxConfig({
  GOODGOOD_FAKE_PAYMENT_ENABLED: "true",
  GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET: fakeSecret,
});

function requestFor({ body = "", headers = {}, method = "GET", url }) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.headers = headers;
  request.method = method;
  request.url = url;
  return request;
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

function signedWebhook(payload, timestamp = Math.floor(Date.now() / 1000)) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  return {
    headers: {
      "x-goodgood-payment-signature": signFakePaymentWebhook({
        rawBody,
        secret: fakeSecret,
        timestamp,
      }),
      "x-goodgood-payment-timestamp": String(timestamp),
    },
    rawBody,
  };
}

test("payment migration seeds one immutable CNY 10 to 500-credit product", async () => {
  const [migration, schema, repository, api, nodeApi, contract, compose, environment] =
    await Promise.all([
      readFile(
        new URL("../migrations/0010_m6_payment_sandbox.sql", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../server/billing/payment-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/billing/payment-api.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/billing/node-api.mjs", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../shared/contracts/billing.ts", import.meta.url), "utf8"),
      readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
    ]);

  for (const table of [
    "payment_product_versions",
    "payment_orders",
    "payment_webhook_events",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schema, new RegExp(`"${table}"`));
  }
  assert.match(migration, /'credits-500-cny'/);
  assert.match(migration, /'CNY',[\s\S]*1000,[\s\S]*'credit',[\s\S]*500/);
  assert.match(migration, /payment_product_versions_immutable/);
  assert.match(migration, /payment_webhook_events_append_only/);
  assert.match(migration, /credit_ledger_entries_payment_grant_unique/);
  assert.match(migration, /goodgood_guard_payment_order_update/);
  assert.match(migration, /payment_orders_reject_delete/);
  assert.match(repository, /payment-order:\$\{order\.publicId\}:grant:v1/);
  assert.match(repository, /actor: "payment"/);
  assert.match(api, /verifyFakePaymentWebhook/);
  assert.match(nodeApi, /\/api\/billing\/webhooks\/fake/);
  assert.match(contract, /PaymentOrderSummary/);
  assert.match(compose, /GOODGOOD_FAKE_PAYMENT_ENABLED: "true"/);
  assert.match(environment, /GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET/);
  assert.doesNotMatch(repository, /request\.body|window\.|localStorage/);

  const [productRoute, orderRoute, orderReadRoute, webhookRoute, boundary, runtime] =
    await Promise.all([
      readFile(
        new URL("../app/api/billing/products/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/billing/orders/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/billing/orders/[orderId]/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/billing/webhooks/fake/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../features/billing/http-billing-boundary.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../server/runtime/web.mjs", import.meta.url), "utf8"),
    ]);
  assert.match(productRoute, /listBillingProducts/);
  assert.match(orderRoute, /createPaymentOrder/);
  assert.match(orderReadRoute, /readPaymentOrder/);
  assert.match(webhookRoute, /acceptFakePaymentWebhook/);
  assert.match(boundary, /\/api\/billing\/products/);
  assert.match(boundary, /\/api\/billing\/orders/);
  assert.match(runtime, /createBillingNodeApiHandler/);
});

test("fake payment webhooks require an enabled, current HMAC signature", () => {
  assert.deepEqual(loadFakePaymentSandboxConfig({}), {
    enabled: false,
    provider: "fake-sandbox",
    secret: null,
    toleranceSeconds: 300,
  });
  assert.throws(
    () =>
      loadFakePaymentSandboxConfig({
        GOODGOOD_FAKE_PAYMENT_ENABLED: "true",
      }),
    /WEBHOOK_SECRET/,
  );
  const now = new Date("2026-09-02T08:00:00.000Z");
  const signed = signedWebhook(
    {
      currency: "CNY",
      eventId: "evt_signature_test",
      eventType: "payment.succeeded",
      moneyAmountMinor: "1000",
      providerOrderId: "ord_00000000000000000000000000000000",
    },
    Math.floor(now.getTime() / 1000),
  );
  assert.deepEqual(
    verifyFakePaymentWebhook({
      config: paymentSandbox,
      headers: signed.headers,
      now,
      rawBody: signed.rawBody,
    }),
    { timestamp: Math.floor(now.getTime() / 1000) },
  );
  assert.throws(
    () =>
      verifyFakePaymentWebhook({
        config: paymentSandbox,
        headers: signed.headers,
        now,
        rawBody: Buffer.from("changed"),
      }),
    (error) =>
      error instanceof PaymentError && error.code === "PAYMENT_WEBHOOK_INVALID",
  );
  assert.throws(
    () =>
      verifyFakePaymentWebhook({
        config: paymentSandbox,
        headers: signed.headers,
        now: new Date(now.getTime() + 301_000),
        rawBody: signed.rawBody,
      }),
    (error) =>
      error instanceof PaymentError && error.code === "PAYMENT_WEBHOOK_EXPIRED",
  );
});

test("billing payment routes authenticate orders but accept only signed provider callbacks", async () => {
  const calls = [];
  const handler = createBillingNodeApiHandler({
    authenticate: async (request) => {
      const ownerId = request.headers["x-owner"];
      if (!ownerId) throw sessionExpiredError();
      return { ownerId };
    },
    operations: {
      async acceptFakePaymentWebhook(input) {
        calls.push(["webhook", input]);
        return { applied: true, orderId: "ord_test", replayed: false, status: "paid" };
      },
      async createPaymentOrder(input) {
        calls.push(["create", input]);
        return {
          created: true,
          order: { id: "ord_test", status: "pending" },
        };
      },
      async listBillingProducts(input) {
        calls.push(["products", input]);
        return { products: [{ id: "credits-500-cny" }] };
      },
      async readBillingSummary() {
        return { account: {}, quotes: [] };
      },
      async readPaymentOrder(input) {
        calls.push(["read", input]);
        return { id: input.orderId, status: "pending" };
      },
    },
    paymentSandbox,
  });

  const productsResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-a" },
      url: "/api/billing/products",
    }),
    productsResponse,
  );
  assert.equal(productsResponse.statusCode, 200);
  assert.equal(JSON.parse(productsResponse.body).products[0].id, "credits-500-cny");

  const createResponse = responseRecorder();
  await handler(
    requestFor({
      body: JSON.stringify({ productId: "credits-500-cny" }),
      headers: {
        "content-type": "application/json",
        "idempotency-key": "payment-test-key",
        "x-owner": "owner-a",
      },
      method: "POST",
      url: "/api/billing/orders",
    }),
    createResponse,
  );
  assert.equal(createResponse.statusCode, 201);
  assert.equal(calls.find(([kind]) => kind === "create")[1].ownerContext.ownerId, "owner-a");

  const orderResponse = responseRecorder();
  await handler(
    requestFor({
      headers: { "x-owner": "owner-a" },
      url: "/api/billing/orders/ord_test",
    }),
    orderResponse,
  );
  assert.equal(orderResponse.statusCode, 200);

  const webhookResponse = responseRecorder();
  await handler(
    requestFor({
      body: "provider bytes",
      headers: { "x-provider": "fake" },
      method: "POST",
      url: "/api/billing/webhooks/fake",
    }),
    webhookResponse,
  );
  assert.equal(webhookResponse.statusCode, 200);
  assert.equal(calls.find(([kind]) => kind === "webhook")[1].rawBody.toString(), "provider bytes");

  const unauthorizedResponse = responseRecorder();
  await handler(
    requestFor({ method: "POST", url: "/api/billing/orders" }),
    unauthorizedResponse,
  );
  assert.equal(unauthorizedResponse.statusCode, 401);
  assert.equal(JSON.parse(unauthorizedResponse.body).error.code, "SESSION_EXPIRED");
  assert.equal(
    await handler(requestFor({ url: "/api/billing-extra" }), responseRecorder()),
    false,
  );
});

test("payment errors preserve stable public envelopes", () => {
  const response = billingApiError(
    new PaymentError(
      "PAYMENT_AMOUNT_MISMATCH",
      "支付金额与订单不一致。",
      409,
    ),
  );
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "PAYMENT_AMOUNT_MISMATCH");
  assert.equal(response.body.error.retryable, false);
  assert.match(response.body.error.requestId, /^req_/);
});

test(
  "PostgreSQL payment orders grant purchased credit exactly once",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });

    const migrationCount = await pool.query(
      `SELECT count(*)::int AS count
         FROM goodgood_schema_migrations
        WHERE version = '0010_m6_payment_sandbox.sql'`,
    );
    assert.equal(migrationCount.rows[0].count, 1);
    const products = await listBillingProducts({
      ownerContext: { ownerId: "owner-check-only" },
      resources: { pool },
    });
    assert.deepEqual(products, {
      products: [
        {
          creditAmount: "500",
          creditUnit: "credit",
          currency: "CNY",
          id: "credits-500-cny",
          moneyAmountMinor: "1000",
          version: 1,
        },
      ],
    });

    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    await pool.query(
      "INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)",
      [
        ownerId,
        `payment-${ownerId}@goodgood.invalid`,
        otherOwnerId,
        `payment-${otherOwnerId}@goodgood.invalid`,
      ],
    );
    const idempotencyKey = `payment-order-${randomUUID()}`;
    const created = await createPaymentOrder({
      idempotencyKey,
      input: { productId: "credits-500-cny" },
      ownerContext: { ownerId },
      paymentSandbox,
      resources: { pool },
    });
    assert.equal(created.created, true);
    assert.equal(created.order.status, "pending");
    assert.equal(created.order.moneyAmountMinor, "1000");
    assert.equal(created.order.creditAmount, "500");
    assert.equal("ownerId" in created.order, false);
    assert.equal("providerOrderId" in created.order, false);

    const replayedOrder = await createPaymentOrder({
      idempotencyKey,
      input: { productId: "credits-500-cny" },
      ownerContext: { ownerId },
      paymentSandbox,
      resources: { pool },
    });
    assert.equal(replayedOrder.created, false);
    assert.equal(replayedOrder.order.id, created.order.id);
    await assert.rejects(
      createPaymentOrder({
        idempotencyKey,
        input: { productId: "another-product" },
        ownerContext: { ownerId },
        paymentSandbox,
        resources: { pool },
      }),
      (error) =>
        error instanceof PaymentError &&
        error.code === "PAYMENT_IDEMPOTENCY_CONFLICT",
    );
    await assert.rejects(
      readPaymentOrder({
        orderId: created.order.id,
        ownerContext: { ownerId: otherOwnerId },
        resources: { pool },
      }),
      (error) =>
        error instanceof PaymentError && error.code === "PAYMENT_ORDER_NOT_FOUND",
    );

    const eventPayload = {
      currency: "CNY",
      eventId: `evt_${randomUUID()}`,
      eventType: "payment.succeeded",
      moneyAmountMinor: "1000",
      providerOrderId: created.order.id,
    };
    const eventRequest = signedWebhook(eventPayload);
    const paid = await acceptFakePaymentWebhook({
      ...eventRequest,
      paymentSandbox,
      resources: { pool },
    });
    assert.deepEqual(paid, {
      applied: true,
      orderId: created.order.id,
      replayed: false,
      status: "paid",
    });
    const duplicate = await acceptFakePaymentWebhook({
      ...eventRequest,
      paymentSandbox,
      resources: { pool },
    });
    assert.equal(duplicate.applied, true);
    assert.equal(duplicate.replayed, true);
    const conflictingReplay = signedWebhook({
      ...eventPayload,
      moneyAmountMinor: "999",
    });
    await assert.rejects(
      acceptFakePaymentWebhook({
        ...conflictingReplay,
        paymentSandbox,
        resources: { pool },
      }),
      (error) =>
        error instanceof PaymentError && error.code === "PAYMENT_EVENT_CONFLICT",
    );

    const laterEvent = signedWebhook({
      ...eventPayload,
      eventId: `evt_${randomUUID()}`,
    });
    const laterResult = await acceptFakePaymentWebhook({
      ...laterEvent,
      paymentSandbox,
      resources: { pool },
    });
    assert.equal(laterResult.applied, false);
    assert.equal(laterResult.replayed, false);

    const paidOrder = await readPaymentOrder({
      orderId: created.order.id,
      ownerContext: { ownerId },
      resources: { pool },
    });
    assert.equal(paidOrder.status, "paid");
    assert.ok(paidOrder.paidAt);
    const billing = await readBillingSummary({
      ownerContext: { ownerId },
      resources: { pool },
    });
    assert.equal(billing.account.availableCredits, "500");
    assert.equal(billing.account.reservedCredits, "0");

    const evidence = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM credit_ledger_entries
           WHERE owner_id = $1 AND actor = 'payment') AS grants,
         (SELECT count(*)::int FROM payment_webhook_events e
           JOIN payment_orders o ON o.id = e.payment_order_id
          WHERE o.owner_id = $1) AS events,
         (SELECT count(*)::int FROM payment_webhook_events e
           JOIN payment_orders o ON o.id = e.payment_order_id
          WHERE o.owner_id = $1 AND e.applied) AS applied_events`,
      [ownerId],
    );
    assert.deepEqual(evidence.rows[0], {
      applied_events: 1,
      events: 2,
      grants: 1,
    });

    const pending = await createPaymentOrder({
      idempotencyKey: `payment-mismatch-${randomUUID()}`,
      input: { productId: "credits-500-cny" },
      ownerContext: { ownerId },
      paymentSandbox,
      resources: { pool },
    });
    const mismatch = signedWebhook({
      currency: "CNY",
      eventId: `evt_${randomUUID()}`,
      eventType: "payment.succeeded",
      moneyAmountMinor: "999",
      providerOrderId: pending.order.id,
    });
    await assert.rejects(
      acceptFakePaymentWebhook({
        ...mismatch,
        paymentSandbox,
        resources: { pool },
      }),
      (error) =>
        error instanceof PaymentError && error.code === "PAYMENT_AMOUNT_MISMATCH",
    );
    assert.equal(
      (
        await readPaymentOrder({
          orderId: pending.order.id,
          ownerContext: { ownerId },
          resources: { pool },
        })
      ).status,
      "pending",
    );

    await assert.rejects(
      pool.query(
        "UPDATE payment_product_versions SET credit_amount = 501 WHERE product_id = 'credits-500-cny'",
      ),
      /immutable/,
    );
    await assert.rejects(
      pool.query(
        "UPDATE payment_orders SET money_amount_minor = 999 WHERE public_id = $1",
        [created.order.id],
      ),
      /snapshots are immutable/,
    );
    await assert.rejects(
      pool.query("DELETE FROM payment_orders WHERE public_id = $1", [
        pending.order.id,
      ]),
      /immutable/,
    );
    const eventHash = createHash("sha256")
      .update(eventRequest.rawBody)
      .digest("hex");
    await assert.rejects(
      pool.query(
        "UPDATE payment_webhook_events SET payload_hash = $1 WHERE provider_event_id = $2",
        [eventHash.replace(/^./, eventHash[0] === "a" ? "b" : "a"), eventPayload.eventId],
      ),
      /immutable/,
    );
  },
);
