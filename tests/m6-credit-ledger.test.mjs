import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import {
  BillingPersistenceError,
  findActiveGenerationPrice,
  grantCredits,
  publishGenerationPriceVersion,
  refundGenerationCredits,
  releaseGenerationCredits,
  reserveGenerationCredits,
  runCreditTransaction,
  settleGenerationCredits,
} from "../server/billing/repository.mjs";
import {
  creditBalanceDeltas,
  projectCreditBalance,
} from "../server/billing/policy.mjs";
import { provisionOwnerIdentity } from "../server/auth/repository.mjs";
import {
  claimGenerationJob,
  completeGenerationJob,
  createGenerationJob,
  failGenerationJob,
} from "../server/generation/repository.mjs";
import { generationApiError } from "../server/generation/api.mjs";
import { readBillingSummary } from "../server/billing/api.mjs";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { seedLocalFixtures } from "../server/persistence/seed-local-fixtures.mjs";

const { Pool } = pg;
const integrationEnabled = process.env.GOODGOOD_M6_INTEGRATION === "1";
const databaseUrl =
  process.env.GOODGOOD_M6_DATABASE_URL ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";

test("credit policy derives exact signed available and reserved deltas", () => {
  assert.deepEqual(creditBalanceDeltas("grant", 100n), {
    available: 100n,
    reserved: 0n,
  });
  assert.deepEqual(creditBalanceDeltas("reserve", -30n), {
    available: -30n,
    reserved: 30n,
  });
  assert.deepEqual(creditBalanceDeltas("settle", -30n), {
    available: 0n,
    reserved: -30n,
  });
  assert.deepEqual(creditBalanceDeltas("release", 30n), {
    available: 30n,
    reserved: -30n,
  });
  assert.deepEqual(creditBalanceDeltas("refund", 30n), {
    available: 30n,
    reserved: 0n,
  });
  assert.deepEqual(
    projectCreditBalance(
      { available: 100n, reserved: 0n },
      "reserve",
      -30n,
    ),
    { available: 70n, reserved: 30n },
  );
  assert.equal(
    projectCreditBalance(
      { available: 20n, reserved: 0n },
      "reserve",
      -30n,
    ),
    null,
  );
  assert.throws(() => creditBalanceDeltas("reserve", 30n), /negative/);
  assert.throws(() => creditBalanceDeltas("refund", -30n), /positive/);
});

test("credit transaction wrapper commits success and rolls back failure", async () => {
  const successfulQueries = [];
  let successReleased = false;
  const successfulPool = {
    async connect() {
      return {
        async query(sql) {
          successfulQueries.push(sql);
        },
        release() {
          successReleased = true;
        },
      };
    },
  };
  assert.equal(
    await runCreditTransaction(successfulPool, async () => "committed"),
    "committed",
  );
  assert.deepEqual(successfulQueries, ["BEGIN", "COMMIT"]);
  assert.equal(successReleased, true);

  const failedQueries = [];
  let failureReleased = false;
  const failedPool = {
    async connect() {
      return {
        async query(sql) {
          failedQueries.push(sql);
        },
        release() {
          failureReleased = true;
        },
      };
    },
  };
  await assert.rejects(
    runCreditTransaction(failedPool, async () => {
      throw new Error("transaction failed");
    }),
    /transaction failed/,
  );
  assert.deepEqual(failedQueries, ["BEGIN", "ROLLBACK"]);
  assert.equal(failureReleased, true);
});

test("billing failures preserve a normalized generation API response", () => {
  const response = generationApiError(
    new BillingPersistenceError(
      "INSUFFICIENT_POINTS",
      "积分不足，请充值后重试。",
      409,
    ),
  );
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, "INSUFFICIENT_POINTS");
  assert.equal(response.body.error.message, "积分不足，请充值后重试。");
  assert.equal(response.body.error.retryable, false);
  assert.match(response.body.error.requestId, /^req_/);
});

test("M6 migration and schema define immutable prices and append-only ledger links", async () => {
  const [
    migration,
    schema,
    repository,
    contract,
    authenticationRepository,
    generationRepository,
    pricingDecision,
  ] = await Promise.all([
    readFile(
      new URL("../migrations/0009_m6_credit_ledger.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/billing/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../shared/contracts/billing.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/auth/repository.mjs", import.meta.url), "utf8"),
    readFile(new URL("../server/generation/repository.mjs", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../docs/decisions/0009-banana-2-flat-credit-price.md",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  for (const table of [
    "price_versions",
    "credit_accounts",
    "credit_ledger_entries",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schema, new RegExp(`"${table}"`));
  }
  assert.match(migration, /credit_ledger_entries_append_only/);
  assert.match(migration, /price_versions_immutable/);
  assert.match(migration, /credit_reservation_entry_id/);
  assert.match(migration, /quoted_credit_amount/);
  assert.match(migration, /'nano-banana-2', '1K', 1, 'standard', 1, 'credit', 10/);
  assert.match(migration, /'nano-banana-2', '2K', 1, 'standard', 1, 'credit', 10/);
  assert.match(migration, /'nano-banana-2', '4K', 1, 'standard', 1, 'credit', 10/);
  assert.match(migration, /'welcome_grant_v1'/);
  assert.match(migration, /'\{"campaign":"welcome-v1","images":10\}'/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /INSUFFICIENT_POINTS/);
  assert.match(authenticationRepository, /grantWelcomeCreditsInTransaction/);
  assert.match(generationRepository, /generation-reserve:/);
  assert.match(generationRepository, /generation-settle:/);
  assert.match(generationRepository, /customer_release_submission_unknown/);
  assert.match(contract, /CreditLedgerEntryType/);
  assert.match(pricingDecision, /10 credits/);
  assert.match(pricingDecision, /100-credit/);
  assert.match(pricingDecision, /CNY 0\.20/);
  assert.doesNotMatch(repository, /request\.body|window\.|localStorage/);
});

async function insertGenerationFixture(pool, { jobId, ownerId, suffix }) {
  const batchId = randomUUID();
  await pool.query(
    `INSERT INTO generation_batches (
       id, owner_id, prompt, reference_snapshot, model_id, aspect_ratio,
       resolution, requested_count, input_hash
     ) VALUES ($1, $2, $3, '[]'::jsonb, 'nano-banana-2', '1:1', '1K', 1, $4)`,
    [batchId, ownerId, `M6 ledger ${suffix}`, `m6-hash-${suffix}`],
  );
  await pool.query(
    `INSERT INTO generation_jobs (id, batch_id, owner_id, idempotency_key)
     VALUES ($1, $2, $3, $4)`,
    [jobId, batchId, ownerId, `m6-job-${suffix}`],
  );
  return batchId;
}

test(
  "PostgreSQL credit ledger reserves, settles, releases, and refunds atomically",
  { skip: !integrationEnabled, timeout: 30_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 6 });
    context.after(() => pool.end());
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await seedLocalFixtures({ databaseUrl, logger: { log() {} } });

    const migrationCount = await pool.query(
      `SELECT count(*)::int AS count
         FROM goodgood_schema_migrations
        WHERE version = '0009_m6_credit_ledger.sql'`,
    );
    assert.equal(migrationCount.rows[0].count, 1);

    const suffix = `${Date.now()}-${process.pid}`;
    const standardPrices = await pool.query(
      `SELECT resolution, credit_amount
         FROM price_versions
        WHERE model_id = 'nano-banana-2'
          AND output_count = 1
          AND plan_context = 'standard'
          AND version = 1
        ORDER BY resolution`,
    );
    assert.deepEqual(
      standardPrices.rows.map((row) => [row.resolution, row.credit_amount]),
      [
        ["1K", "10"],
        ["2K", "10"],
        ["4K", "10"],
      ],
    );
    const seededWelcomeAccounts = await pool.query(
      `SELECT owner_id, available_balance, reserved_balance
         FROM credit_accounts
        WHERE owner_id = ANY($1::uuid[])
        ORDER BY owner_id`,
      [[
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ]],
    );
    assert.deepEqual(
      seededWelcomeAccounts.rows,
      [
        {
          available_balance: "100",
          owner_id: "00000000-0000-4000-8000-000000000001",
          reserved_balance: "0",
        },
        {
          available_balance: "100",
          owner_id: "00000000-0000-4000-8000-000000000002",
          reserved_balance: "0",
        },
      ],
    );

    const welcomeClaims = {
      email: `m6-welcome-${suffix}@goodgood.invalid`,
      issuer: "https://m6-auth.goodgood.invalid/oidc",
      subject: `m6-subject-${suffix}`,
    };
    const welcomeOwner = await provisionOwnerIdentity(pool, welcomeClaims);
    const repeatedWelcomeOwner = await provisionOwnerIdentity(pool, welcomeClaims);
    assert.equal(repeatedWelcomeOwner.ownerId, welcomeOwner.ownerId);
    const welcomeEvidence = await pool.query(
      `SELECT a.available_balance, a.reserved_balance,
              count(l.id)::int AS grant_count,
              min(l.amount) AS grant_amount
         FROM credit_accounts a
         JOIN credit_ledger_entries l ON l.account_id = a.id
        WHERE a.owner_id = $1
          AND l.idempotency_key = $2
        GROUP BY a.id`,
      [welcomeOwner.ownerId, `welcome-grant:v1:${welcomeOwner.ownerId}`],
    );
    assert.deepEqual(welcomeEvidence.rows[0], {
      available_balance: "100",
      grant_amount: "100",
      grant_count: 1,
      reserved_balance: "0",
    });

    const generationInput = {
      aspectRatio: "1:1",
      count: 1,
      modelId: "nano-banana-2",
      projectId: null,
      prompt: "M6 live credit integration",
      references: [],
      resolution: "1K",
    };
    const releasedGeneration = await createGenerationJob(pool, {
      idempotencyKey: `m6-live-release-${suffix}`,
      input: generationInput,
      ownerId: welcomeOwner.ownerId,
    });
    const reservedAccount = await pool.query(
      `SELECT available_balance, reserved_balance
         FROM credit_accounts WHERE owner_id = $1`,
      [welcomeOwner.ownerId],
    );
    assert.deepEqual(reservedAccount.rows[0], {
      available_balance: "90",
      reserved_balance: "10",
    });
    const releasedClaim = await claimGenerationJob(pool, {
      attemptRoute: {
        provider: "goodgood-mock",
        providerModel: "nano-banana-2",
        routeVersion: "m6-test-v1",
      },
      jobId: releasedGeneration.row.id,
      leaseMs: 30_000,
      workerId: `m6-worker-${suffix}`,
    });
    assert.equal(releasedClaim.claimed, true);
    assert.equal(
      await failGenerationJob(pool, {
        attemptId: releasedClaim.attempt.id,
        error: {
          code: "SUBMISSION_UNKNOWN",
          message: "Submission outcome is unknown.",
          retryable: false,
          title: "Submission outcome unknown",
        },
        jobId: releasedGeneration.row.id,
        workerId: `m6-stale-worker-${suffix}`,
      }),
      false,
    );
    const staleFailureAccount = await pool.query(
      `SELECT available_balance, reserved_balance
         FROM credit_accounts WHERE owner_id = $1`,
      [welcomeOwner.ownerId],
    );
    assert.deepEqual(staleFailureAccount.rows[0], {
      available_balance: "90",
      reserved_balance: "10",
    });
    assert.equal(
      await failGenerationJob(pool, {
        attemptId: releasedClaim.attempt.id,
        error: {
          code: "SUBMISSION_UNKNOWN",
          message: "Submission outcome is unknown.",
          retryable: false,
          title: "Submission outcome unknown",
        },
        jobId: releasedGeneration.row.id,
        workerId: `m6-worker-${suffix}`,
      }),
      true,
    );

    const settledGeneration = await createGenerationJob(pool, {
      idempotencyKey: `m6-live-settle-${suffix}`,
      input: { ...generationInput, prompt: "M6 live settlement integration" },
      ownerId: welcomeOwner.ownerId,
    });
    const settledClaim = await claimGenerationJob(pool, {
      attemptRoute: {
        provider: "goodgood-mock",
        providerModel: "nano-banana-2",
        routeVersion: "m6-test-v1",
      },
      jobId: settledGeneration.row.id,
      leaseMs: 30_000,
      workerId: `m6-worker-${suffix}`,
    });
    assert.equal(settledClaim.claimed, true);
    const settledAsset = {
      aspectRatio: "1:1",
      batchId: settledGeneration.row.batch_id,
      byteSize: 1,
      checksum: "m6-test-checksum",
      id: randomUUID(),
      mimeType: "image/png",
      objectKey: `m6/${suffix}/output.png`,
      ownerId: welcomeOwner.ownerId,
      pixelHeight: 1,
      pixelWidth: 1,
    };
    assert.equal(
      await completeGenerationJob(pool, {
        asset: settledAsset,
        attemptId: settledClaim.attempt.id,
        jobId: settledGeneration.row.id,
        resultHash: `m6-result-${suffix}`,
        workerId: `m6-stale-worker-${suffix}`,
      }),
      false,
    );
    const staleCompletionEvidence = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM assets WHERE job_id = $1) AS assets,
         (SELECT reserved_balance FROM credit_accounts
           WHERE owner_id = $2) AS reserved_balance`,
      [settledGeneration.row.id, welcomeOwner.ownerId],
    );
    assert.deepEqual(staleCompletionEvidence.rows[0], {
      assets: 0,
      reserved_balance: "10",
    });
    assert.equal(
      await completeGenerationJob(pool, {
        asset: settledAsset,
        attemptId: settledClaim.attempt.id,
        jobId: settledGeneration.row.id,
        resultHash: `m6-result-${suffix}`,
        workerId: `m6-worker-${suffix}`,
      }),
      true,
    );
    const liveBillingEvidence = await pool.query(
      `SELECT entry_type, amount, reason
         FROM credit_ledger_entries
        WHERE owner_id = $1
        ORDER BY created_at, id`,
      [welcomeOwner.ownerId],
    );
    assert.deepEqual(
      liveBillingEvidence.rows.map((row) => [
        row.entry_type,
        row.amount,
        row.reason,
      ]),
      [
        ["grant", "100", "welcome_grant_v1"],
        ["reserve", "-10", "generation_reservation"],
        ["release", "10", "customer_release_submission_unknown"],
        ["reserve", "-10", "generation_reservation"],
        ["settle", "-10", "generation_settlement"],
      ],
    );
    const liveFinalAccount = await pool.query(
      `SELECT available_balance, reserved_balance, version
         FROM credit_accounts WHERE owner_id = $1`,
      [welcomeOwner.ownerId],
    );
    assert.deepEqual(liveFinalAccount.rows[0], {
      available_balance: "90",
      reserved_balance: "0",
      version: "5",
    });
    const publicBillingSummary = await readBillingSummary({
      ownerContext: welcomeOwner,
      resources: { pool },
    });
    assert.deepEqual(publicBillingSummary.account, {
      availableCredits: "90",
      reservedCredits: "0",
      unit: "credit",
      version: "5",
    });
    assert.deepEqual(
      publicBillingSummary.quotes.map((quote) => [
        quote.resolution,
        quote.creditAmount,
      ]),
      [
        ["1K", "10"],
        ["2K", "10"],
        ["4K", "10"],
      ],
    );

    const ownerId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email)
       VALUES ($1, $2)`,
      [ownerId, `m6-${suffix}@goodgood.invalid`],
    );
    const liveInsufficientKey = `m6-live-insufficient-${suffix}`;
    await assert.rejects(
      createGenerationJob(pool, {
        idempotencyKey: liveInsufficientKey,
        input: {
          ...generationInput,
          prompt: "M6 live insufficient credit rollback",
        },
        ownerId,
      }),
      (error) =>
        error instanceof BillingPersistenceError &&
        error.code === "INSUFFICIENT_POINTS",
    );
    const liveInsufficientRollback = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM generation_jobs
           WHERE owner_id = $1 AND idempotency_key = $2) AS jobs,
         (SELECT count(*)::int FROM generation_batches
           WHERE owner_id = $1 AND prompt = $3) AS batches`,
      [ownerId, liveInsufficientKey, "M6 live insufficient credit rollback"],
    );
    assert.deepEqual(liveInsufficientRollback.rows[0], {
      batches: 0,
      jobs: 0,
    });

    const now = new Date();
    const future = new Date(now.getTime() + 60_000);
    const planContext = `m6-${suffix}`;
    const firstPrice = await publishGenerationPriceVersion(pool, {
      count: 1,
      creditAmount: 30n,
      effectiveFrom: new Date(now.getTime() - 60_000),
      modelId: "nano-banana-2",
      planContext,
      resolution: "1K",
      version: 1,
    });
    assert.equal(firstPrice.created, true);
    const duplicatePrice = await publishGenerationPriceVersion(pool, {
      count: 1,
      creditAmount: 30n,
      effectiveFrom: firstPrice.price.effectiveFrom,
      modelId: "nano-banana-2",
      planContext,
      resolution: "1K",
      version: 1,
    });
    assert.equal(duplicatePrice.created, false);
    const secondPrice = await publishGenerationPriceVersion(pool, {
      count: 1,
      creditAmount: 40n,
      effectiveFrom: future,
      modelId: "nano-banana-2",
      planContext,
      resolution: "1K",
      version: 2,
    });
    assert.equal(secondPrice.created, true);
    assert.equal(
      (await findActiveGenerationPrice(pool, {
        at: now,
        count: 1,
        modelId: "nano-banana-2",
        planContext,
        resolution: "1K",
      })).id,
      firstPrice.price.id,
    );
    assert.equal(
      (await findActiveGenerationPrice(pool, {
        at: new Date(future.getTime() + 1),
        count: 1,
        modelId: "nano-banana-2",
        planContext,
        resolution: "1K",
      })).id,
      secondPrice.price.id,
    );

    const grant = await grantCredits(pool, {
      amount: 100n,
      idempotencyKey: `m6-grant-${suffix}`,
      ownerId,
      reason: "m6_test_grant",
    });
    assert.deepEqual(
      [grant.account.availableBalance, grant.account.reservedBalance],
      [100n, 0n],
    );
    assert.equal(
      (await grantCredits(pool, {
        amount: 100n,
        idempotencyKey: `m6-grant-${suffix}`,
        ownerId,
        reason: "m6_test_grant",
      })).created,
      false,
    );
    await assert.rejects(
      grantCredits(pool, {
        amount: 101n,
        idempotencyKey: `m6-grant-${suffix}`,
        ownerId,
        reason: "m6_test_grant",
      }),
      (error) =>
        error instanceof BillingPersistenceError &&
        error.code === "CREDIT_IDEMPOTENCY_CONFLICT",
    );

    const settledJobId = randomUUID();
    const settledBatchId = await insertGenerationFixture(pool, {
      jobId: settledJobId,
      ownerId,
      suffix: `${suffix}-settled`,
    });
    const reservation = await reserveGenerationCredits(pool, {
      at: now,
      idempotencyKey: `m6-reserve-settle-${suffix}`,
      jobId: settledJobId,
      ownerId,
      planContext,
    });
    assert.deepEqual(
      [reservation.account.availableBalance, reservation.account.reservedBalance],
      [70n, 30n],
    );
    assert.equal(
      (await reserveGenerationCredits(pool, {
        at: new Date(now.getTime() + 1),
        idempotencyKey: `m6-reserve-settle-${suffix}`,
        jobId: settledJobId,
        ownerId,
        planContext,
      })).created,
      false,
    );
    const settled = await settleGenerationCredits(pool, {
      idempotencyKey: `m6-settle-${suffix}`,
      jobId: settledJobId,
      ownerId,
    });
    assert.deepEqual(
      [settled.account.availableBalance, settled.account.reservedBalance],
      [70n, 0n],
    );
    assert.equal(
      (await settleGenerationCredits(pool, {
        idempotencyKey: `m6-settle-${suffix}`,
        jobId: settledJobId,
        ownerId,
      })).created,
      false,
    );
    await assert.rejects(
      releaseGenerationCredits(pool, {
        idempotencyKey: `m6-release-after-settle-${suffix}`,
        jobId: settledJobId,
        ownerId,
      }),
      (error) => error.code === "CREDIT_RESERVATION_CLOSED",
    );
    const refunded = await refundGenerationCredits(pool, {
      idempotencyKey: `m6-refund-${suffix}`,
      jobId: settledJobId,
      ownerId,
    });
    assert.deepEqual(
      [refunded.account.availableBalance, refunded.account.reservedBalance],
      [100n, 0n],
    );
    assert.equal(
      (await refundGenerationCredits(pool, {
        idempotencyKey: `m6-refund-${suffix}`,
        jobId: settledJobId,
        ownerId,
      })).created,
      false,
    );
    await assert.rejects(
      refundGenerationCredits(pool, {
        idempotencyKey: `m6-second-refund-${suffix}`,
        jobId: settledJobId,
        ownerId,
      }),
      (error) => error.code === "CREDIT_ALREADY_REFUNDED",
    );

    const releasedJobId = randomUUID();
    await insertGenerationFixture(pool, {
      jobId: releasedJobId,
      ownerId,
      suffix: `${suffix}-released`,
    });
    await reserveGenerationCredits(pool, {
      at: now,
      idempotencyKey: `m6-reserve-release-${suffix}`,
      jobId: releasedJobId,
      ownerId,
      planContext,
    });
    const released = await releaseGenerationCredits(pool, {
      idempotencyKey: `m6-release-${suffix}`,
      jobId: releasedJobId,
      ownerId,
    });
    assert.deepEqual(
      [released.account.availableBalance, released.account.reservedBalance],
      [100n, 0n],
    );
    await assert.rejects(
      settleGenerationCredits(pool, {
        idempotencyKey: `m6-settle-after-release-${suffix}`,
        jobId: releasedJobId,
        ownerId,
      }),
      (error) => error.code === "CREDIT_RESERVATION_CLOSED",
    );

    const expensivePlan = `expensive-${suffix}`;
    await publishGenerationPriceVersion(pool, {
      count: 1,
      creditAmount: 120n,
      effectiveFrom: new Date(now.getTime() - 60_000),
      modelId: "nano-banana-2",
      planContext: expensivePlan,
      resolution: "1K",
      version: 1,
    });
    const insufficientJobId = randomUUID();
    const insufficientBatchId = await insertGenerationFixture(pool, {
      jobId: insufficientJobId,
      ownerId,
      suffix: `${suffix}-insufficient`,
    });
    await assert.rejects(
      reserveGenerationCredits(pool, {
        at: now,
        idempotencyKey: `m6-reserve-insufficient-${suffix}`,
        jobId: insufficientJobId,
        ownerId,
        planContext: expensivePlan,
      }),
      (error) => error.code === "INSUFFICIENT_POINTS",
    );
    const insufficientEvidence = await pool.query(
      `SELECT j.credit_reservation_entry_id, b.price_version_id
         FROM generation_jobs j
         JOIN generation_batches b ON b.id = j.batch_id
        WHERE j.id = $1 AND b.id = $2`,
      [insufficientJobId, insufficientBatchId],
    );
    assert.deepEqual(insufficientEvidence.rows[0], {
      credit_reservation_entry_id: null,
      price_version_id: null,
    });

    const snapshot = await pool.query(
      `SELECT price_version_id, quoted_credit_unit, quoted_credit_amount
         FROM generation_batches WHERE id = $1`,
      [settledBatchId],
    );
    assert.equal(snapshot.rows[0].price_version_id, firstPrice.price.id);
    assert.equal(snapshot.rows[0].quoted_credit_unit, "credit");
    assert.equal(snapshot.rows[0].quoted_credit_amount, "30");

    const ledger = await pool.query(
      `SELECT entry_type, amount
         FROM credit_ledger_entries
        WHERE owner_id = $1
        ORDER BY created_at, id`,
      [ownerId],
    );
    assert.deepEqual(
      ledger.rows.map((row) => [row.entry_type, row.amount]),
      [
        ["grant", "100"],
        ["reserve", "-30"],
        ["settle", "-30"],
        ["refund", "30"],
        ["reserve", "-30"],
        ["release", "30"],
      ],
    );
    const finalAccount = await pool.query(
      `SELECT available_balance, reserved_balance, version
         FROM credit_accounts WHERE owner_id = $1 AND unit = 'credit'`,
      [ownerId],
    );
    assert.deepEqual(finalAccount.rows[0], {
      available_balance: "100",
      reserved_balance: "0",
      version: "6",
    });

    await assert.rejects(
      pool.query(
        "UPDATE credit_ledger_entries SET reason = 'rewritten' WHERE id = $1",
        [reservation.entry.id],
      ),
      /immutable/,
    );
    await assert.rejects(
      pool.query("DELETE FROM price_versions WHERE id = $1", [firstPrice.price.id]),
      /immutable/,
    );
  },
);
