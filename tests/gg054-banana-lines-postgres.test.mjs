import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { saveManagedModel } from "../server/admin/models.mjs";
import {
  findCreditAccount,
  grantCredits,
} from "../server/billing/repository.mjs";
import { readBillingSummary } from "../server/billing/api.mjs";
import {
  createGenerationJob,
  claimGenerationJob,
  completeGenerationJob,
  failGenerationJob,
} from "../server/generation/repository.mjs";
import { generationProviderRouteForModel } from "../server/generation/provider-router.mjs";
import {
  grantOrganizationCredits,
  setMemberBudget,
} from "../server/organizations/credit-repository.mjs";
import { createProject, findProject } from "../server/projects/repository.mjs";
import {
  saveCreationDraft,
  findCreationDraft,
} from "../server/drafts/repository.mjs";
import { validateDraftMutation } from "../server/drafts/validation.mjs";
import { normalizeGenerationModelOptions } from "../server/generation/capabilities.mjs";

const enabled = process.env.GOODGOOD_GG054_INTEGRATION === "1";
const databaseUrl = process.env.GOODGOOD_GG054_DATABASE_URL;
if (enabled) {
  const target = new URL(databaseUrl ?? "missing://target");
  if (
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    !/^\/goodgood_gg054_lines_test\w*$/.test(target.pathname) ||
    process.env.GOODGOOD_GG054_NO_WORKER !== "1"
  ) {
    throw new Error(
      "GG-054 writes require a named disposable loopback lines database with no attached Worker.",
    );
  }
}
const prices = (amount) =>
  Object.fromEntries(
    ["1K", "2K", "4K"].map((key) => [key, { output: amount }]),
  );

test(
  "Banana SQL migration preserves history; pinned line quotes settle personal/enterprise credits and failures release once",
  { skip: !enabled, timeout: 40_000 },
  async (context) => {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), "gg054-migrations-"),
    );
    context.after(async () => {
      await pool.end();
      const resolved = path.resolve(temporary);
      assert.ok(
        resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
          path.basename(resolved).startsWith("gg054-migrations-"),
      );
      await rm(resolved, { recursive: true, force: true });
    });
    assert.equal(
      (await pool.query("SELECT current_database() AS name")).rows[0].name,
      new URL(databaseUrl).pathname.slice(1),
    );
    const quiet = { log() {} };
    for (const file of (await readdir("migrations")).filter(
      (file) => file.endsWith(".sql") && file < "0031",
    ))
      await copyFile(path.join("migrations", file), path.join(temporary, file));
    await applyMigrations({
      databaseUrl,
      migrationsDirectory: temporary,
      logger: quiet,
    });
    const ownerId = randomUUID(),
      legacyBatch = randomUUID(),
      legacyJob = randomUUID();
    await pool.query(
      "INSERT INTO users (id,email,status) VALUES ($1,'gg054-lines@goodgood.invalid','active')",
      [ownerId],
    );
    await pool.query(
      `INSERT INTO system_role_assignments (id,owner_id,role,source,assigned_by_operator_id,reason,idempotency_key,operation_hash)
    VALUES ($1,$2,'site_owner','bootstrap','gg054-fixture','isolated test','gg054-site-owner',$3)`,
      [randomUUID(), ownerId, "1".repeat(64)],
    );
    const workspaceId = (
      await pool.query("SELECT id FROM workspaces WHERE personal_owner_id=$1", [
        ownerId,
      ])
    ).rows[0].id;
    await grantCredits(pool, {
      ownerId,
      amount: 1000n,
      idempotencyKey: "gg054-fixture-grant",
      reason: "isolated fixture",
      actor: "system",
    });
    await pool.query(
      `INSERT INTO generation_batches (id,owner_id,workspace_id,creator_owner_id,prompt,model_id,aspect_ratio,resolution,requested_count,input_hash,quoted_credit_unit,quoted_credit_amount)
    VALUES ($1,$2,$3,$2,'legacy','nano-banana-2','1:1','1K',1,$4,'credit-cny-cent',20)`,
      [legacyBatch, ownerId, workspaceId, "a".repeat(64)],
    );
    await pool.query(
      `INSERT INTO generation_jobs (id,batch_id,owner_id,workspace_id,creator_owner_id,idempotency_key,state)
    VALUES ($1,$2,$3,$4,$3,'gg054-legacy','succeeded')`,
      [legacyJob, legacyBatch, ownerId, workspaceId],
    );
    const history = async () => ({
      ledger: (
        await pool.query(
          "SELECT to_jsonb(e) AS record FROM credit_ledger_entries e ORDER BY id",
        )
      ).rows,
      prices: (
        await pool.query(
          "SELECT to_jsonb(p) AS record FROM price_versions p ORDER BY id",
        )
      ).rows,
      batch: (
        await pool.query(
          "SELECT input_hash,quoted_credit_unit,quoted_credit_amount FROM generation_batches WHERE id=$1",
          [legacyBatch],
        )
      ).rows,
    });
    const before = await history();
    await applyMigrations({ databaseUrl, logger: quiet });
    assert.deepEqual(await history(), before);
    assert.equal(
      (
        await pool.query(
          "SELECT image_line FROM generation_batches WHERE id=$1",
          [legacyBatch],
        )
      ).rows[0].image_line,
      null,
    );
    const migrated = (
      await pool.query(
        "SELECT prices,lines FROM managed_models WHERE id='nano-banana-2'",
      )
    ).rows[0];
    assert.deepEqual(migrated.lines.special.prices, migrated.prices);
    assert.equal(migrated.lines.quality.enabled, false);
    assert.deepEqual(migrated.lines.dedicated.prices, {});

    const ownerContext = { ownerId, systemRole: "site_owner" };
    let model = {
      id: "banana-line-lab",
      name: "Banana line test",
      description: "",
      adapterId: "nano-banana-pro",
      enabled: true,
      version: null,
      prices: prices(30),
      lines: {
        special: { enabled: true, prices: prices(30) },
        quality: { enabled: true, prices: prices(42) },
        dedicated: { enabled: true, prices: prices(95) },
      },
    };
    const save = async (changes) => {
      model = (
        await saveManagedModel({
          ownerContext,
          input: { ...model, ...changes },
          resources: { pool },
        })
      ).model;
    };
    await save({});
    const input = {
      prompt: "isolated synthetic fixture",
      references: [],
      modelId: "nano-banana-pro",
      catalogModelId: model.id,
      aspectRatio: "1:1",
      resolution: "1K",
      count: 1,
      expectedPriceVersion: 1,
    };
    const create = (key, line, extra = {}) =>
      createGenerationJob(pool, {
        ownerId,
        idempotencyKey: key,
        input: { ...input, imageLine: line },
        ...extra,
      });
    const personal = await create("gg054-quality", "quality");
    assert.equal(personal.row.image_line, "quality");
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      958n,
    );
    assert.equal((await create("gg054-quality", "quality")).created, false);
    await assert.rejects(
      create("gg054-quality", "dedicated"),
      (error) => error.code === "IDEMPOTENCY_CONFLICT",
    );
    await save({
      lines: { ...model.lines, quality: { enabled: true, prices: prices(55) } },
    });
    await assert.rejects(
      create("gg054-stale", "quality"),
      (error) => error.code === "PRICE_CHANGED",
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT DISTINCT plan_context FROM price_versions WHERE model_id=$1 AND version=2",
          [model.id],
        )
      ).rows,
      [{ plan_context: "banana-quality" }],
    );
    await save({
      lines: {
        ...model.lines,
        quality: { ...model.lines.quality, enabled: false },
      },
    });
    await assert.rejects(
      create("gg054-disabled", "quality"),
      (error) => error.code === "MODEL_DISABLED",
    );
    const summary = await readBillingSummary({
      ownerContext,
      resources: { pool },
    });
    assert.equal(
      summary.quotes.some(
        (quote) =>
          quote.catalogModelId === model.id && quote.imageLine === "quality",
      ),
      false,
    );

    const workerId = "gg054-synthetic-direct-test";
    const claim = (jobId) =>
      claimGenerationJob(pool, {
        jobId,
        workerId,
        leaseMs: 30_000,
        attemptRouteForModel: (modelId, line) =>
          generationProviderRouteForModel("mock", modelId, line),
      });
    const finish = async (job) => {
      const accepted = await claim(job.id);
      assert.equal(accepted.claimed, true);
      assert.equal(accepted.route.imageLine, job.image_line);
      const completion = {
        jobId: job.id,
        workerId,
        attemptId: accepted.attempt.id,
        resultHash: "f".repeat(64),
        assets: [
          {
            id: randomUUID(),
            ownerId,
            batchId: job.batch_id,
            ordinal: 1,
            objectKey: `gg054-synthetic/${job.id}.png`,
            checksum: "c".repeat(64),
            mimeType: "image/png",
            pixelWidth: 1,
            pixelHeight: 1,
            aspectRatio: 1,
            byteSize: 68,
          },
        ],
      };
      assert.equal(
        (await completeGenerationJob(pool, completion)).completed,
        true,
      );
      assert.equal(
        (await completeGenerationJob(pool, completion)).reason,
        "already_succeeded",
      );
    };
    await finish(personal.row);
    const account = await findCreditAccount(pool, { ownerId });
    assert.equal(account.availableBalance, 958n);
    assert.equal(account.reservedBalance, 0n);
    assert.equal(
      (
        await pool.query(
          "SELECT quoted_credit_amount FROM generation_batches WHERE id=$1",
          [personal.row.batch_id],
        )
      ).rows[0].quoted_credit_amount,
      "42",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) AS count FROM credit_ledger_entries WHERE related_job_id=$1 AND entry_type='settle'",
          [personal.row.id],
        )
      ).rows[0].count,
      "1",
    );

    const orgId = randomUUID(),
      membershipId = randomUUID();
    await pool.query(
      "INSERT INTO workspaces (id,kind,name,created_by_owner_id) VALUES ($1,'organization','GG054 isolated organization',$2)",
      [orgId, ownerId],
    );
    await pool.query(
      "INSERT INTO workspace_memberships (id,workspace_id,owner_id,role,status) VALUES ($1,$2,$3,'org_owner','active')",
      [membershipId, orgId, ownerId],
    );
    await grantOrganizationCredits(pool, {
      actorOwnerId: ownerId,
      workspaceId: orgId,
      amount: 1000,
      idempotencyKey: "gg054-org-grant",
      reason: "isolated fixture",
      operationHash: "2".repeat(64),
    });
    await setMemberBudget(pool, {
      actorOwnerId: ownerId,
      workspaceId: orgId,
      membershipId,
      creditLimit: 500,
      expectedVersion: 0,
      idempotencyKey: "gg054-org-budget",
      reason: "isolated fixture",
      operationHash: "3".repeat(64),
    });
    const enterprise = await create("gg054-org-dedicated", "dedicated", {
      workspaceId: orgId,
    });
    await finish(enterprise.row);
    const failed = await create("gg054-org-special", "special", {
      workspaceId: orgId,
    });
    const failedClaim = await claim(failed.row.id);
    const failure = {
      attemptId: failedClaim.attempt.id,
      workerId,
      jobId: failed.row.id,
      error: {
        code: "PROVIDER_FAILED",
        title: "Synthetic",
        message: "isolated fixture",
        retryable: true,
      },
    };
    assert.equal(await failGenerationJob(pool, failure), true);
    assert.equal(await failGenerationJob(pool, failure), false);
    const org = (
      await pool.query(
        "SELECT available_balance,reserved_balance FROM workspace_credit_accounts WHERE workspace_id=$1",
        [orgId],
      )
    ).rows[0];
    assert.deepEqual(org, { available_balance: "905", reserved_balance: "0" });
    const budget = (
      await pool.query(
        "SELECT settled_usage,reserved_usage FROM member_budgets WHERE membership_id=$1",
        [membershipId],
      )
    ).rows[0];
    assert.deepEqual(budget, { settled_usage: "95", reserved_usage: "0" });
    assert.equal(
      (await findCreditAccount(pool, { ownerId })).availableBalance,
      958n,
    );

    const state = {
      ...input,
      ...normalizeGenerationModelOptions({
        modelId: input.modelId,
        imageLine: "dedicated",
      }),
    };
    const project = await createProject(pool, {
      ownerId,
      batchIds: [personal.row.id],
      state,
      name: "Line restore",
      idempotencyKey: "gg054-project",
    });
    assert.equal(
      (await findProject(pool, { ownerId, projectId: project.id })).image_line,
      "dedicated",
    );
    const draft = validateDraftMutation({
      state: { ...input, imageLine: "quality" },
      expectedVersion: null,
    });
    await saveCreationDraft(pool, { ownerId, ...draft });
    assert.equal(
      (await findCreationDraft(pool, { ownerId })).image_line,
      "quality",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*) AS count FROM generation_jobs WHERE state IN ('queued','running','refining')",
        )
      ).rows[0].count,
      "0",
    );
  },
);
