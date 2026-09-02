import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  previewManualPayment,
  recordManualPayment,
} from "../server/billing/manual-payment.mjs";
import { PaymentError } from "../server/billing/payment-errors.mjs";
import {
  parseManualPaymentArguments,
  runManualPaymentCommand,
} from "../server/runtime/manual-payment.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const integrationEnabled = process.env.GOODGOOD_M6_INTEGRATION === "1";
const databaseUrl =
  process.env.GOODGOOD_M6_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";

test("manual payment command is dry-run by default and accepts no money or credit input", () => {
  assert.deepEqual(
    parseManualPaymentArguments([
      "--email",
      "Customer@Example.com",
      "--operator",
      "operator-a",
      "--reference",
      "receipt-20260902-001",
    ]),
    {
      execute: false,
      input: {
        email: "Customer@Example.com",
        operatorId: "operator-a",
        paymentReference: "receipt-20260902-001",
        productId: "credits-500-cny",
      },
    },
  );
  assert.equal(
    parseManualPaymentArguments([
      "--execute",
      "--email",
      "customer@example.com",
      "--operator",
      "operator-a",
      "--product-id",
      "credits-500-cny",
      "--reference",
      "receipt-20260902-001",
    ]).execute,
    true,
  );
  assert.throws(
    () =>
      parseManualPaymentArguments([
        "--email",
        "customer@example.com",
        "--operator",
        "operator-a",
        "--reference",
        "receipt-20260902-001",
        "--credits",
        "500",
      ]),
    /Unknown manual payment argument/,
  );
  assert.throws(
    () => parseManualPaymentArguments(["--email", "customer@example.com"]),
    /--operator is required/,
  );
});

test("direct manual payment command explains the missing database boundary", async () => {
  await assert.rejects(
    runManualPaymentCommand({ arguments_: [], databaseUrl: "" }),
    /Compose maintenance command documented in docs\/DEPLOYMENT\.md/,
  );
});

test("manual payment is an operator-only bundled runtime, not a browser route", async () => {
  const [packageJson, runtimeBuild, compose, nodeApi] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-runtime.mjs", import.meta.url), "utf8"),
    readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
    readFile(new URL("../server/billing/node-api.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(packageJson, /"billing:manual-payment"/);
  assert.match(runtimeBuild, /"manual-payment": "server\/runtime\/manual-payment\.mjs"/);
  assert.match(compose, /manual-payment:[\s\S]*profiles: \["maintenance"\]/);
  assert.doesNotMatch(nodeApi, /manual-payment|manual_payment/);
});

test(
  "PostgreSQL manual payment records one paid order and one operator grant",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });

    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    const email = `manual-${ownerId}@goodgood.invalid`;
    const otherEmail = `manual-${otherOwnerId}@goodgood.invalid`;
    await pool.query(
      "INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)",
      [ownerId, email, otherOwnerId, otherEmail],
    );
    const paymentReference = `receipt-${randomUUID()}`;
    const input = {
      email: email.toUpperCase(),
      operatorId: "operator-a",
      paymentReference,
      productId: "credits-500-cny",
    };

    const preview = await previewManualPayment(pool, input);
    assert.equal(preview.customer.endsWith("@goodgood.invalid"), true);
    assert.equal(preview.customer.includes(ownerId), false);
    assert.equal(preview.existingOrder, null);
    assert.deepEqual(preview.product, {
      creditAmount: "500",
      creditUnit: "credit",
      currency: "CNY",
      id: "credits-500-cny",
      moneyAmountMinor: "1000",
      version: 1,
    });
    const beforeExecute = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM payment_orders
           WHERE provider = 'manual' AND provider_order_id = $1) AS orders,
         (SELECT count(*)::int FROM credit_ledger_entries
           WHERE owner_id = $2) AS entries`,
      [paymentReference, ownerId],
    );
    assert.deepEqual(beforeExecute.rows[0], { entries: 0, orders: 0 });

    const recorded = await recordManualPayment(pool, input);
    assert.equal(recorded.applied, true);
    assert.equal(recorded.created, true);
    assert.equal(recorded.replayed, false);
    assert.equal(recorded.status, "paid");
    assert.match(recorded.orderId, /^ord_[a-f0-9]{32}$/);

    const replay = await recordManualPayment(pool, {
      ...input,
      operatorId: "operator-b",
    });
    assert.equal(replay.applied, false);
    assert.equal(replay.created, false);
    assert.equal(replay.replayed, true);
    assert.equal(replay.orderId, recorded.orderId);

    await assert.rejects(
      recordManualPayment(pool, {
        ...input,
        email: otherEmail,
      }),
      (error) =>
        error instanceof PaymentError &&
        error.code === "MANUAL_PAYMENT_REFERENCE_CONFLICT",
    );
    await assert.rejects(
      previewManualPayment(pool, {
        ...input,
        email: "missing@goodgood.invalid",
        paymentReference: `receipt-${randomUUID()}`,
      }),
      (error) =>
        error instanceof PaymentError &&
        error.code === "MANUAL_PAYMENT_OWNER_NOT_FOUND",
    );

    const evidence = await pool.query(
      `SELECT o.state, o.provider, o.provider_order_id,
              o.money_amount_minor, o.credit_amount,
              e.entry_type, e.actor, e.amount, e.reason,
              e.metadata, a.available_balance, a.reserved_balance
         FROM payment_orders o
         JOIN credit_ledger_entries e ON e.id = o.paid_ledger_entry_id
         JOIN credit_accounts a ON a.id = e.account_id
        WHERE o.public_id = $1`,
      [recorded.orderId],
    );
    assert.deepEqual(evidence.rows[0], {
      actor: "operator",
      amount: "500",
      available_balance: "500",
      credit_amount: "500",
      entry_type: "grant",
      metadata: {
        operatorId: "operator-a",
        paymentProvider: "manual",
        paymentReference,
        productId: "credits-500-cny",
        productVersion: 1,
      },
      money_amount_minor: "1000",
      provider: "manual",
      provider_order_id: paymentReference,
      reason: "manual_paid_credit_purchase",
      reserved_balance: "0",
      state: "paid",
    });
  },
);
