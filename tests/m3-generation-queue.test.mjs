import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { createClient } from "redis";
import {
  dispatchPendingJobs,
  reconcileRecoverableJobs,
} from "../server/generation/queue.mjs";
import { GENERATION_READY_QUEUE } from "../server/generation/config.mjs";
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
const composeEnabled = process.env.GOODGOOD_M3_INTEGRATION === "1";
const databaseUrl =
  explicitDatabaseUrl ??
  "postgresql://goodgood:goodgood-local-only@127.0.0.1:5432/goodgood";
const webOrigin = process.env.GOODGOOD_M3_WEB_ORIGIN ?? "http://127.0.0.1:3000";
const redisUrl = process.env.GOODGOOD_M3_REDIS_URL ?? "redis://127.0.0.1:6379";

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test("concurrent outbox dispatchers atomically claim one queued job", async () => {
  const dispatchedAt = new Date("2026-09-07T14:29:23.500Z");
  const row = { dispatched_at: dispatchedAt, id: 7, job_id: "job-race" };
  const legacySelectGate = deferred();
  let legacySelectCount = 0;
  let atomicallyClaimed = false;
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (/WITH pending AS/.test(sql) && /FOR UPDATE SKIP LOCKED/.test(sql)) {
        if (atomicallyClaimed) return { rowCount: 0, rows: [] };
        atomicallyClaimed = true;
        return { rowCount: 1, rows: [row] };
      }
      if (/SELECT id, job_id/.test(sql)) {
        legacySelectCount += 1;
        if (legacySelectCount === 2) legacySelectGate.resolve();
        await legacySelectGate.promise;
        return { rowCount: 1, rows: [row] };
      }
      return { rowCount: 1, rows: [] };
    },
  };
  const pushes = [];
  const redis = {
    async lPush(queue, jobId) {
      pushes.push({ jobId, queue });
    },
  };

  const counts = await Promise.all([
    dispatchPendingJobs(pool, redis),
    dispatchPendingJobs(pool, redis),
  ]);

  assert.deepEqual(counts.sort(), [0, 1]);
  assert.deepEqual(pushes.map(({ jobId }) => jobId), ["job-race"]);
  assert.equal(legacySelectCount, 0);
  assert.ok(
    queries.some(({ sql }) =>
      /UPDATE generation_queue_outbox[\s\S]*RETURNING outbox.id/.test(sql),
    ),
  );
});

test("recoverable jobs wait for a stale dispatch window before requeue", async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rowCount: 0, rows: [] };
    },
  };

  assert.equal(await reconcileRecoverableJobs(pool, 15_000), 0);
  assert.deepEqual(calls[0].values, [15_000]);
  assert.match(
    calls[0].sql,
    /outbox\.dispatched_at < now\(\) - \(\$1 \* interval '1 millisecond'\)/,
  );
  assert.match(
    calls[0].sql,
    /WHERE generation_queue_outbox\.dispatched_at IS NULL[\s\S]*generation_queue_outbox\.dispatched_at < now\(\)/,
  );
});

test(
  "PostgreSQL outbox claim prevents duplicate concurrent delivery",
  { skip: !integrationEnabled, timeout: 15_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    const ownerId = randomUUID();
    const batchId = randomUUID();
    const jobId = randomUUID();
    context.after(async () => {
      await pool.query("DELETE FROM generation_queue_outbox WHERE job_id = $1", [jobId]);
      await pool.query("DELETE FROM generation_jobs WHERE id = $1", [jobId]);
      await pool.query("DELETE FROM generation_batches WHERE id = $1", [batchId]);
      await pool.query("DELETE FROM users WHERE id = $1", [ownerId]);
      await pool.end();
    });
    await applyMigrations({ databaseUrl, logger: { log() {} } });
    await pool.query(
      `INSERT INTO users (id, email)
       VALUES ($1, $2)`,
      [ownerId, `queue-${ownerId}@goodgood.invalid`],
    );
    await pool.query(
      `INSERT INTO generation_batches (
         id, owner_id, prompt, model_id, aspect_ratio, resolution,
         requested_count, input_hash
       ) VALUES ($1, $2, 'queue race test', 'nano-banana-2', '1:1', '1K', 1, $3)`,
      [batchId, ownerId, `queue-race-${jobId}`],
    );
    await pool.query(
      `INSERT INTO generation_jobs (id, batch_id, owner_id, idempotency_key)
       VALUES ($1, $2, $3, $4)`,
      [jobId, batchId, ownerId, `queue-race-${jobId}`],
    );
    await pool.query(
      `INSERT INTO generation_queue_outbox (job_id, created_at)
       VALUES ($1, '2000-01-01T00:00:00Z')`,
      [jobId],
    );

    const pushes = [];
    const redis = {
      async lPush(_queue, dispatchedJobId) {
        pushes.push(dispatchedJobId);
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    };
    await Promise.all([
      dispatchPendingJobs(pool, redis, 1),
      dispatchPendingJobs(pool, redis, 1),
    ]);

    assert.equal(pushes.filter((value) => value === jobId).length, 1);
    const outbox = await pool.query(
      `SELECT attempts, dispatched_at, dispatched_at IS NOT NULL AS dispatched
         FROM generation_queue_outbox WHERE job_id = $1`,
      [jobId],
    );
    assert.equal(outbox.rows[0].attempts, 1);
    assert.equal(outbox.rows[0].dispatched, true);
    assert.ok(outbox.rows[0].dispatched_at instanceof Date);

    const freshDispatch = outbox.rows[0].dispatched_at;
    await reconcileRecoverableJobs(pool, 15_000);
    const freshRecovery = await pool.query(
      "SELECT dispatched_at FROM generation_queue_outbox WHERE job_id = $1",
      [jobId],
    );
    assert.equal(
      freshRecovery.rows[0].dispatched_at.getTime(),
      freshDispatch.getTime(),
    );

    await pool.query(
      `UPDATE generation_queue_outbox
          SET dispatched_at = now() - interval '1 minute'
        WHERE job_id = $1`,
      [jobId],
    );
    await reconcileRecoverableJobs(pool, 15_000);
    const staleRecovery = await pool.query(
      "SELECT dispatched_at FROM generation_queue_outbox WHERE job_id = $1",
      [jobId],
    );
    assert.equal(staleRecovery.rows[0].dispatched_at, null);
  },
);

test(
  "Compose ignores duplicate active delivery and commits one result",
  { skip: !composeEnabled, timeout: 20_000 },
  async (context) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 2 });
    const redis = createClient({ url: redisUrl });
    context.after(async () => {
      if (redis.isOpen) await redis.quit();
      await pool.end();
    });
    await redis.connect();
    const idempotencyKey = `gg004-duplicate-${randomUUID()}`;
    const response = await fetch(`${webOrigin}/api/generations`, {
      body: JSON.stringify({
        aspectRatio: "1:1",
        count: 1,
        modelId: "nano-banana-2",
        prompt: "GG-004 slow active duplicate delivery regression",
        references: [],
        resolution: "1K",
      }),
      headers: {
        authorization: "Bearer goodgood-local-user-a-token",
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      method: "POST",
    });
    assert.equal(response.status, 202);
    const submitted = await response.json();
    await redis.lPush(
      GENERATION_READY_QUEUE,
      submitted.id,
      submitted.id,
      submitted.id,
    );

    const deadline = Date.now() + 15_000;
    let job;
    while (Date.now() < deadline) {
      const poll = await fetch(`${webOrigin}/api/generations/${submitted.id}`, {
        headers: { authorization: "Bearer goodgood-local-user-a-token" },
      });
      assert.equal(poll.status, 200);
      job = await poll.json();
      if (["failed", "succeeded"].includes(job.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(job?.state, "succeeded");
    assert.equal(job.error, null);
    assert.equal(job.outputs.length, 1);

    const evidence = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM generation_attempts WHERE job_id = $1) AS attempts,
         (SELECT count(*)::int FROM assets WHERE job_id = $1) AS assets,
         (SELECT count(*)::int FROM generation_job_events
           WHERE job_id = $1 AND event_type = 'worker_claimed') AS claims,
         (SELECT attempts FROM generation_queue_outbox WHERE job_id = $1) AS dispatches,
         (SELECT count(*)::int FROM credit_ledger_entries
           WHERE related_job_id = $1 AND entry_type = 'settle') AS settlements`,
      [submitted.id],
    );
    assert.deepEqual(evidence.rows[0], {
      assets: 1,
      attempts: 1,
      claims: 1,
      dispatches: 1,
      settlements: 1,
    });
  },
);
