import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { applyMigrations } from "../server/persistence/migrate.mjs";
import { listCreditActivities } from "../server/billing/activity-repository.mjs";
import { readCreditActivities } from "../server/billing/activity-api.mjs";
import { grantCredits, releaseGenerationCredits } from "../server/billing/repository.mjs";
import { createGenerationJob } from "../server/generation/repository.mjs";
import { createProject } from "../server/projects/repository.mjs";

test("GG-261 isolated SQL verifies real source transactions, tombstones, frozen names and visible cursor pages", {
  skip: process.env.GOODGOOD_GG261_INTEGRATION !== "1", timeout: 30_000,
}, async () => {
  const target = new URL(process.env.GOODGOOD_GG261_DATABASE_URL ?? "http://invalid");
  assert.ok(["127.0.0.1", "localhost"].includes(target.hostname));
  assert.match(target.pathname, /^\/goodgood_gg261_source_test[a-z0-9_]*$/);
  assert.equal(process.env.GOODGOOD_GG261_NO_WORKER, "1");
  const pool = new pg.Pool({ connectionString: target.href, max: 3 });
  const ownerId = randomUUID(), otherOwner = randomUUID(), canvasId = randomUUID(), otherCanvas = randomUUID();
  const input = { prompt: "isolated source test", references: [], modelId: "nano-banana-2", aspectRatio: "1:1",
    resolution: "1K", count: 1, routingPolicy: "canvas-image-v1" };
  const counts = async () => (await pool.query(`SELECT
    (SELECT count(*)::int FROM generation_jobs) AS jobs,
    (SELECT count(*)::int FROM generation_batches) AS batches,
    (SELECT count(*)::int FROM credit_ledger_entries) AS ledger,
    (SELECT count(*)::int FROM generation_queue_outbox) AS outbox`)).rows[0];
  try {
    assert.equal((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount, 0);
    assert.equal((await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).rowCount, 0);
    const migrations = await applyMigrations({ databaseUrl: target.href, logger: { log() {} } });
    assert.ok(migrations.includes("0060_gg261_generation_canvas_project_source.sql"));
    await pool.query("INSERT INTO users(id,email,status) VALUES($1,'gg261-a@example.invalid','active'),($2,'gg261-b@example.invalid','active')", [ownerId, otherOwner]);
    const workspaceId = (await pool.query("SELECT id FROM workspaces WHERE personal_owner_id=$1", [ownerId])).rows[0].id;
    const otherWorkspace = (await pool.query("SELECT id FROM workspaces WHERE personal_owner_id=$1", [otherOwner])).rows[0].id;
    await grantCredits(pool, { ownerId, amount: 10_000n, reason: "isolated source verification", idempotencyKey: "gg261-source-grant" });
    for (const [id, workspace, owner, name] of [[canvasId, workspaceId, ownerId, "original canvas"],
      [otherCanvas, otherWorkspace, otherOwner, "other canvas"]]) await pool.query(`INSERT INTO canvas_projects
        (id,workspace_id,owner_id,name,document,content_hash) VALUES($1,$2,$3,$4,$5::jsonb,$6)`,
      [id, workspace, owner, name, JSON.stringify({ schemaVersion: 1, nodes: [], edges: [], generators: {} }), "a".repeat(64)]);
    const classic = await createProject(pool, { ownerId, workspaceId, name: "original classic", batchIds: [],
      idempotencyKey: "gg261-classic-create", state: { ...input, thinkingLevel: "high", googleSearch: false,
        quality: "auto", background: "auto", outputFormat: "png" } });
    const canvas = await createGenerationJob(pool, { ownerId, workspaceId, idempotencyKey: "gg261-canvas-job",
      input: { ...input, canvasProjectId: canvasId } });
    const classicJob = await createGenerationJob(pool, { ownerId, workspaceId, idempotencyKey: "gg261-classic-job",
      input: { ...input, projectId: classic.id } });
    assert.equal(canvas.row.canvas_project_id, canvasId);
    assert.equal(classicJob.row.project_id, classic.id);
    assert.equal((await pool.query("SELECT source_project_name FROM generation_batches WHERE id=$1", [canvas.row.batch_id])).rows[0].source_project_name, "original canvas");
    const before = await counts();
    for (const [index, context] of [
      { ownerId, workspaceId, canvasProjectId: randomUUID() },
      { ownerId, workspaceId, canvasProjectId: otherCanvas },
      { ownerId: otherOwner, workspaceId: otherWorkspace, canvasProjectId: canvasId },
      { ownerId, workspaceId: otherWorkspace, canvasProjectId: canvasId },
    ].entries()) {
      await assert.rejects(createGenerationJob(pool, { ownerId: context.ownerId, workspaceId: context.workspaceId,
        idempotencyKey: `gg261-denied-${index}`, input: { ...input, canvasProjectId: context.canvasProjectId } }),
      (error) => ["CANVAS_PROJECT_NOT_FOUND", "WORKSPACE_ACCESS_DENIED"].includes(error.code));
      assert.deepEqual(await counts(), before, "rejected sources must roll back jobs, batches, ledger and outbox");
    }
    await assert.rejects(pool.query("UPDATE generation_batches SET canvas_project_id=$2 WHERE id=$1", [classicJob.row.batch_id, canvasId]),
      (error) => error.code === "23514");
    await assert.rejects(pool.query("UPDATE generation_batches SET canvas_project_id=$2 WHERE id=$1", [canvas.row.batch_id, otherCanvas]),
      (error) => error.code === "23503");
    await pool.query("UPDATE canvas_projects SET name='renamed canvas' WHERE id=$1", [canvasId]);
    await pool.query("UPDATE projects SET name='renamed classic',status='archived' WHERE id=$1", [classic.id]);
    await pool.query("INSERT INTO canvas_project_deletions(project_id,workspace_id,owner_id) VALUES($1,$2,$3)", [canvasId, workspaceId, ownerId]);
    await assert.rejects(createGenerationJob(pool, { ownerId, workspaceId, idempotencyKey: "gg261-deleted-denied",
      input: { ...input, canvasProjectId: canvasId } }), (error) => error.code === "CANVAS_PROJECT_NOT_FOUND");
    assert.deepEqual(await counts(), before);
    const sources = (await listCreditActivities(pool, { ownerId })).items;
    const canvasActivity = sources.find((item) => item.taskId === canvas.row.id);
    const classicActivity = sources.find((item) => item.taskId === classicJob.row.id);
    assert.equal(canvasActivity.projectId, canvasId);
    assert.equal(canvasActivity.projectName, "original canvas");
    assert.equal(canvasActivity.modelName, canvas.row.catalog_model_name);
    assert.equal(classicActivity.projectId, classic.id);
    assert.equal(classicActivity.projectName, "original classic");
    for (let i = 0; i < 25; i += 1) await grantCredits(pool, {
      ownerId, amount: 1n, reason: "isolated visible page", idempotencyKey: `gg261-visible-${i}`,
    });
    for (let i = 0; i < 8; i += 1) {
      const hidden = await createGenerationJob(pool, { ownerId, workspaceId, idempotencyKey: `gg261-hidden-job-${i}`, input });
      await releaseGenerationCredits(pool, { ownerId, jobId: hidden.row.id, idempotencyKey: `gg261-hidden-release-${i}` });
    }
    const first = await listCreditActivities(pool, { ownerId, view: "usage", limit: 20 });
    const second = await listCreditActivities(pool, { ownerId, view: "usage", limit: 20, cursor: first.next });
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 8);
    assert.equal(second.next, null);
    const items = [...first.items, ...second.items];
    assert.equal(new Set(items.map((item) => item.id)).size, 28);
    assert.ok(items.every((item) => !["released", "refunded"].includes(item.status)));
    assert.equal((await listCreditActivities(pool, { ownerId, filter: "return" })).items.length, 8);
    await assert.rejects(listCreditActivities(pool, { ownerId: otherOwner, view: "usage", cursor: first.next }),
      (error) => error.code === "CREDIT_ACTIVITY_REQUEST_INVALID");
    const page = await readCreditActivities({ ownerContext: { ownerId }, input: { view: "usage", limit: 20 }, resources: { pool } });
    await assert.rejects(readCreditActivities({ ownerContext: { ownerId }, input: { view: "ledger", cursor: page.nextCursor },
      resources: { pool } }), (error) => error.code === "CREDIT_ACTIVITY_REQUEST_INVALID");
  } finally {
    await pool.end();
  }
});
