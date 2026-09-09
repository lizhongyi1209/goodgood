import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  grantCredits,
  publishGenerationPriceVersion,
  refundGenerationCredits,
  releaseGenerationCredits,
  reserveGenerationCredits,
  settleGenerationCredits,
} from "../server/billing/repository.mjs";
import {
  paymentFundedPortionForReservation,
  projectSourceAwareCreditBalance,
} from "../server/billing/policy.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";

const { Pool } = pg;
const integrationRequested = process.env.GOODGOOD_M6_INTEGRATION === "1";
const explicitDatabaseUrl = process.env.GOODGOOD_M6_DATABASE_URL;
if (integrationRequested && !explicitDatabaseUrl) {
  throw new Error(
    "GOODGOOD_M6_DATABASE_URL must name an isolated test database when GOODGOOD_M6_INTEGRATION=1.",
  );
}
const integrationEnabled = integrationRequested && Boolean(explicitDatabaseUrl);
const databaseUrl = explicitDatabaseUrl ?? "";

test("GG-027 reserves non-transferable credit before payment-funded credit", () => {
  const account = {
    available: 600n,
    paymentFundedAvailable: 500n,
  };
  assert.equal(paymentFundedPortionForReservation(account, 80n), 0n);
  assert.equal(paymentFundedPortionForReservation(account, 150n), 50n);
  assert.equal(paymentFundedPortionForReservation(account, 601n), null);
});

test("GG-027 source projections preserve mixed reservation, closure, and refund", () => {
  const initial = {
    available: 600n,
    paymentFundedAvailable: 500n,
    paymentFundedReserved: 0n,
    reserved: 0n,
  };
  const reserved = projectSourceAwareCreditBalance(
    initial,
    "reserve",
    -150n,
    -50n,
  );
  assert.deepEqual(reserved, {
    available: 450n,
    paymentFundedAvailable: 450n,
    paymentFundedReserved: 50n,
    reserved: 150n,
  });
  assert.deepEqual(
    projectSourceAwareCreditBalance(reserved, "release", 150n, 50n),
    initial,
  );
  const settled = projectSourceAwareCreditBalance(
    reserved,
    "settle",
    -150n,
    -50n,
  );
  assert.deepEqual(settled, {
    available: 450n,
    paymentFundedAvailable: 450n,
    paymentFundedReserved: 0n,
    reserved: 0n,
  });
  assert.deepEqual(
    projectSourceAwareCreditBalance(settled, "refund", 150n, 50n),
    initial,
  );
});

test("GG-027 rejects source upgrades and source-account inconsistency", () => {
  const account = {
    available: 100n,
    paymentFundedAvailable: 20n,
    paymentFundedReserved: 0n,
    reserved: 0n,
  };
  assert.throws(
    () => projectSourceAwareCreditBalance(account, "grant", 10n, 11n),
    /payment-funded amount/,
  );
  assert.equal(
    projectSourceAwareCreditBalance(account, "reserve", -30n, -21n),
    null,
  );
});

test("GG-027 provenance migration is additive, fail-closed, and rebuilds paid evidence", async () => {
  const [migration, schema, repository, paymentRepository, contract] =
    await Promise.all([
      readFile(
        new URL(
          "../migrations/0020_gg027_credit_provenance.sql",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../server/billing/repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../server/billing/payment-repository.mjs", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../shared/contracts/billing.ts", import.meta.url), "utf8"),
    ]);

  for (const column of [
    "payment_funded_available_balance",
    "payment_funded_reserved_balance",
    "payment_funded_amount",
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));
    assert.ok(schema.includes(column));
  }
  assert.match(migration, /payment\.paid_ledger_entry_id = entry\.id/);
  assert.match(migration, /payment\.state = 'paid'/);
  assert.match(
    migration,
    /non_payment_amount := LEAST\(non_payment_available, operation_amount\)/,
  );
  assert.match(migration, /unknown|unsupported entry type|RAISE EXCEPTION/i);
  assert.match(migration, /DROP TRIGGER IF EXISTS credit_ledger_entries_append_only/);
  assert.match(migration, /CREATE TRIGGER credit_ledger_entries_append_only/);
  assert.match(repository, /paymentFundedPortionForReservation/);
  assert.match(repository, /sourceClass = "non_transferable"/);
  assert.match(paymentRepository, /sourceClass: "payment_funded"/);
  assert.match(contract, /transferableCredits: SerializedCreditAmount/);
});

async function insertGenerationFixture(pool, { jobId, ownerId, suffix }) {
  const batchId = randomUUID();
  await pool.query(
    `INSERT INTO generation_batches (
       id, owner_id, prompt, reference_snapshot, model_id, aspect_ratio,
       resolution, requested_count, input_hash
     ) VALUES ($1, $2, $3, '[]'::jsonb, 'nano-banana-2', '1:1', '1K', 1, $4)`,
    [batchId, ownerId, `GG-027 provenance ${suffix}`, `gg027-hash-${suffix}`],
  );
  await pool.query(
    `INSERT INTO generation_jobs (
       id, batch_id, owner_id, idempotency_key, state, completed_at
     ) VALUES ($1, $2, $3, $4, 'cancelled', now())`,
    [jobId, batchId, ownerId, `gg027-job-${suffix}`],
  );
}

test(
  "GG-027 PostgreSQL operations preserve a mixed payment-funded source split",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });

    const suffix = `${Date.now()}-${randomUUID()}`;
    const ownerId = randomUUID();
    await pool.query(
      "INSERT INTO users (id, email, status) VALUES ($1, $2, 'active')",
      [ownerId, `gg027-${suffix}@goodgood.invalid`],
    );
    await grantCredits(pool, {
      amount: 100n,
      idempotencyKey: `gg027-non-transferable-${suffix}`,
      ownerId,
      reason: "gg027_non_transferable_fixture",
    });
    await grantCredits(pool, {
      actor: "payment",
      amount: 500n,
      idempotencyKey: `gg027-payment-funded-${suffix}`,
      ownerId,
      reason: "gg027_payment_funded_fixture",
      relatedPaymentRef: `ord_${randomUUID().replaceAll("-", "")}`,
      sourceClass: "payment_funded",
    });
    const planContext = `gg027-${suffix}`;
    await publishGenerationPriceVersion(pool, {
      count: 1,
      creditAmount: 150n,
      effectiveFrom: new Date(Date.now() - 60_000),
      modelId: "nano-banana-2",
      planContext,
      resolution: "1K",
      version: 1,
    });

    const releaseJobId = randomUUID();
    await insertGenerationFixture(pool, {
      jobId: releaseJobId,
      ownerId,
      suffix: `${suffix}-release`,
    });
    const reservation = await reserveGenerationCredits(pool, {
      idempotencyKey: `gg027-reserve-release-${suffix}`,
      jobId: releaseJobId,
      ownerId,
      planContext,
    });
    assert.deepEqual(
      [
        reservation.account.availableBalance,
        reservation.account.reservedBalance,
        reservation.account.paymentFundedAvailableBalance,
        reservation.account.paymentFundedReservedBalance,
        reservation.entry.paymentFundedAmount,
      ],
      [450n, 150n, 450n, 50n, -50n],
    );
    const released = await releaseGenerationCredits(pool, {
      idempotencyKey: `gg027-release-${suffix}`,
      jobId: releaseJobId,
      ownerId,
    });
    assert.deepEqual(
      [
        released.account.availableBalance,
        released.account.paymentFundedAvailableBalance,
        released.entry.paymentFundedAmount,
      ],
      [600n, 500n, 50n],
    );

    const refundJobId = randomUUID();
    await insertGenerationFixture(pool, {
      jobId: refundJobId,
      ownerId,
      suffix: `${suffix}-refund`,
    });
    await reserveGenerationCredits(pool, {
      idempotencyKey: `gg027-reserve-refund-${suffix}`,
      jobId: refundJobId,
      ownerId,
      planContext,
    });
    const settled = await settleGenerationCredits(pool, {
      idempotencyKey: `gg027-settle-${suffix}`,
      jobId: refundJobId,
      ownerId,
    });
    assert.equal(settled.entry.paymentFundedAmount, -50n);
    const refunded = await refundGenerationCredits(pool, {
      idempotencyKey: `gg027-refund-${suffix}`,
      jobId: refundJobId,
      ownerId,
    });
    assert.deepEqual(
      [
        refunded.account.availableBalance,
        refunded.account.reservedBalance,
        refunded.account.paymentFundedAvailableBalance,
        refunded.account.paymentFundedReservedBalance,
        refunded.entry.paymentFundedAmount,
      ],
      [600n, 0n, 500n, 0n, 50n],
    );
  },
);
