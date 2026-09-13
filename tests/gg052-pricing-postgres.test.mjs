import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, copyFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import {
  createGenerationJob,
  claimGenerationJob,
} from "../server/generation/repository.mjs";
import {
  findCreditAccount,
  publishGenerationPriceVersion,
  refundGenerationCredits,
  settleGenerationCredits,
} from "../server/billing/repository.mjs";
import { readBillingSummary } from "../server/billing/api.mjs";
import { saveManagedModel } from "../server/admin/models.mjs";
import { MOCK_PROVIDER_ROUTE } from "../server/generation/provider-router.mjs";

const enabled = process.env.GOODGOOD_GG052_INTEGRATION === "1";
const databaseUrl = process.env.GOODGOOD_GG052_DATABASE_URL;
if (enabled) {
  const target = new URL(databaseUrl ?? "missing://target");
  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    !/^\/goodgood_gg052_pricing_test\w*$/.test(target.pathname) ||
    process.env.GOODGOOD_GG052_NO_WORKER !== "1"
  )
    throw new Error(
      "GG-052 writes require a named disposable loopback pricing database with no attached Worker.",
    );
}

test(
  "GG-052 PostgreSQL exchange preserves history and buying power, then publishes and settles fixed model quotes",
  { skip: !enabled },
  async (context) => {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), "gg052-migrations-"),
    );
    context.after(async () => {
      await pool.end();
      await rm(temporary, { recursive: true, force: true });
    });
    const quiet = { log() {} };
    for (const file of (await readdir("migrations")).filter(
      (file) => file.endsWith(".sql") && file < "0029",
    )) {
      await copyFile(path.join("migrations", file), path.join(temporary, file));
    }
    await applyMigrations({
      databaseUrl,
      migrationsDirectory: temporary,
      logger: quiet,
    });
    await publishGenerationPriceVersion(pool, {
      modelId: "nano-banana-2",
      resolution: "1K",
      count: 1,
      version: 2,
      creditUnit: "credit",
      creditAmount: 25n,
      effectiveFrom: new Date("2026-09-12T00:00:00Z"),
    });
    const ownerId = randomUUID(),
      accountId = randomUUID(),
      orgId = randomUUID(),
      orgAccount = randomUUID(),
      membership = randomUUID(),
      budgetId = randomUUID();
    const batchId = randomUUID(),
      legacyJob = randomUUID(),
      reserveId = randomUUID(),
      settleId = randomUUID();
    await pool.query(
      "INSERT INTO users (id,email,status) VALUES ($1,'gg052-pricing@goodgood.invalid','active')",
      [ownerId],
    );
    const workspaceId = (
      await pool.query("SELECT id FROM workspaces WHERE personal_owner_id=$1", [
        ownerId,
      ])
    ).rows[0].id;
    await pool.query(
      "INSERT INTO credit_accounts (id,owner_id,unit,available_balance,payment_funded_available_balance) VALUES ($1,$2,'credit',90,80)",
      [accountId, ownerId],
    );
    await pool.query(
      `INSERT INTO generation_batches (id,owner_id,workspace_id,creator_owner_id,prompt,model_id,aspect_ratio,resolution,requested_count,input_hash,quoted_credit_unit,quoted_credit_amount)
    VALUES ($1,$2,$3,$2,'legacy','nano-banana-2','1:1','1K',1,$4,'credit',10)`,
      [batchId, ownerId, workspaceId, "a".repeat(64)],
    );
    await pool.query(
      `INSERT INTO generation_jobs (id,batch_id,owner_id,workspace_id,creator_owner_id,idempotency_key,state)
    VALUES ($1,$2,$3,$4,$3,'gg052-legacy-job','succeeded')`,
      [legacyJob, batchId, ownerId, workspaceId],
    );
    await pool.query(
      `INSERT INTO credit_ledger_entries (id,account_id,owner_id,entry_type,amount,payment_funded_amount,idempotency_key,operation_hash,reason,actor,related_job_id,prior_entry_id)
    VALUES ($1,$2,$3,'grant',100,80,'legacy-grant',$7,'fixture','system',NULL,NULL),
      ($4,$2,$3,'reserve',-10,0,'legacy-reserve',$7,'fixture','system',$6,NULL),
      ($5,$2,$3,'settle',-10,0,'legacy-settle',$7,'fixture','worker',$6,$4)`,
      [
        randomUUID(),
        accountId,
        ownerId,
        reserveId,
        settleId,
        legacyJob,
        "b".repeat(64),
      ],
    );
    await pool.query(
      "UPDATE generation_jobs SET credit_reservation_entry_id=$2 WHERE id=$1",
      [legacyJob, reserveId],
    );
    await pool.query(
      "INSERT INTO workspaces (id,kind,name,created_by_owner_id) VALUES ($1,'organization','Pricing fixture',$2)",
      [orgId, ownerId],
    );
    await pool.query(
      "INSERT INTO workspace_memberships (id,workspace_id,owner_id,role,status) VALUES ($1,$2,$3,'org_owner','active')",
      [membership, orgId, ownerId],
    );
    await pool.query(
      "INSERT INTO workspace_credit_accounts (id,workspace_id,unit,available_balance,allocated_balance) VALUES ($1,$2,'credit',490,190)",
      [orgAccount, orgId],
    );
    await pool.query(
      "INSERT INTO member_budgets (id,workspace_id,membership_id,credit_limit,settled_usage) VALUES ($1,$2,$3,200,10)",
      [budgetId, orgId, membership],
    );
    const legacy = (
      await pool.query(
        "SELECT to_jsonb(e) AS record FROM credit_ledger_entries e WHERE account_id=$1 ORDER BY id",
        [accountId],
      )
    ).rows;
    const sql = await readFile(
      "migrations/0029_gg052_cent_credits_and_models.sql",
      "utf8",
    );
    // Explicitly prove the exchange fails with outstanding reservation; rollback leaves all records intact.
    await pool.query(
      "UPDATE credit_accounts SET reserved_balance=1 WHERE id=$1",
      [accountId],
    );
    const connection = await pool.connect();
    await connection.query("BEGIN");
    await assert.rejects(connection.query(sql), /drained/);
    await connection.query("ROLLBACK");
    connection.release();
    await pool.query(
      "UPDATE credit_accounts SET reserved_balance=0 WHERE id=$1",
      [accountId],
    );
    await applyMigrations({ databaseUrl, logger: quiet });
    assert.equal(
      (
        await pool.query(
          "SELECT prices FROM managed_models WHERE id='nano-banana-2'",
        )
      ).rows[0].prices["1K"].output,
      50,
    );
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      180n,
    );
    assert.equal(
      (await findCreditAccount(pool, { ownerId }))
        .paymentFundedAvailableBalance,
      160n,
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT to_jsonb(e) AS record FROM credit_ledger_entries e WHERE account_id=$1 ORDER BY id",
          [accountId],
        )
      ).rows,
      legacy,
    );
    assert.equal(
      (
        await pool.query("SELECT status FROM credit_accounts WHERE id=$1", [
          accountId,
        ])
      ).rows[0].status,
      "closed",
    );
    const org = (
      await pool.query(
        "SELECT * FROM workspace_credit_accounts WHERE workspace_id=$1 AND unit='credit-cny-cent'",
        [orgId],
      )
    ).rows[0];
    assert.equal(org.available_balance, "980");
    assert.equal(org.allocated_balance, "380");
    const budget = (
      await pool.query("SELECT * FROM member_budgets WHERE id=$1", [budgetId])
    ).rows[0];
    assert.equal(budget.credit_limit, "400");
    assert.equal(budget.settled_usage, "20");
    // Refund an old settled job into the new denomination, retaining its immutable settlement reference.
    await refundGenerationCredits(pool, {
      ownerId,
      jobId: legacyJob,
      idempotencyKey: "gg052-legacy-refund",
      reason: "pricing fixture refund",
    });
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      200n,
    );
    await assert.rejects(
      refundGenerationCredits(pool, {
        ownerId,
        jobId: legacyJob,
        idempotencyKey: "gg052-duplicate-refund",
        reason: "duplicate",
      }),
      (error) => error.code === "CREDIT_ALREADY_REFUNDED",
    );
    const ownerContext = { ownerId, systemRole: "site_owner" };
    const input = {
      id: "banana-studio",
      name: "Banana Studio",
      description: "",
      adapterId: "nano-banana-2",
      enabled: true,
      version: null,
      prices: {
        "1K": { output: 21 },
        "2K": { output: 32 },
        "4K": { output: 53 },
      },
    };
    const saved = await saveManagedModel({
      ownerContext,
      input,
      resources: { pool },
    });
    const generation = {
      prompt: "mock fixture only",
      references: [],
      modelId: "nano-banana-2",
      catalogModelId: "banana-studio",
      aspectRatio: "1:1",
      resolution: "1K",
      count: 1,
      expectedPriceVersion: 1,
    };
    const accepted = await createGenerationJob(pool, {
      ownerId,
      input: generation,
      idempotencyKey: "gg052-accepted",
    });
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      179n,
    );
    const changed = await saveManagedModel({
      ownerContext,
      input: {
        ...input,
        version: saved.model.version,
        prices: { ...input.prices, "1K": { output: 35 } },
      },
      resources: { pool },
    });
    await assert.rejects(
      createGenerationJob(pool, {
        ownerId,
        input: generation,
        idempotencyKey: "gg052-stale-price",
      }),
      (error) => error.code === "PRICE_CHANGED",
    );
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      179n,
    );
    await settleGenerationCredits(pool, {
      ownerId,
      jobId: accepted.row.id,
      idempotencyKey: "gg052-settle",
      reason: "fixture settlement",
    });
    const quote = (
      await pool.query(
        "SELECT quoted_credit_amount FROM generation_batches WHERE id=$1",
        [accepted.row.batch_id],
      )
    ).rows[0];
    assert.equal(quote.quoted_credit_amount, "21");
    await saveManagedModel({
      ownerContext,
      input: { ...input, version: changed.model.version, enabled: false },
      resources: { pool },
    });
    await assert.rejects(
      createGenerationJob(pool, {
        ownerId,
        input: { ...generation, expectedPriceVersion: 2 },
        idempotencyKey: "gg052-disabled",
      }),
      (error) => error.code === "MODEL_DISABLED",
    );
    assert.equal(
      (
        await readBillingSummary({ ownerContext, resources: { pool } })
      ).quotes.some((quote) => quote.catalogModelId === "banana-studio"),
      false,
    );
    // A task already accepted before disable can still claim its pinned adapter.
    const claim = await claimGenerationJob(pool, {
      jobId: accepted.row.id,
      workerId: "gg052-fixture-worker",
      leaseMs: 3000,
      attemptRoute: MOCK_PROVIDER_ROUTE,
    });
    assert.equal(claim.claimed, true);
    // No queue or provider is connected to this database; leave no active fixture jobs.
    await pool.query(
      "UPDATE generation_jobs SET state='succeeded',lease_owner=NULL,lease_expires_at=NULL WHERE id=$1",
      [accepted.row.id],
    );
  },
);
