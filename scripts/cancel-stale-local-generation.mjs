import assert from "node:assert/strict";
import net from "node:net";
import pg from "pg";
import { createClient } from "redis";
import { releaseGenerationCreditsInTransaction } from "../server/billing/repository.mjs";
import {
  GENERATION_PROCESSING_QUEUE,
  GENERATION_READY_QUEUE,
} from "../server/generation/config.mjs";

// One-off recovery for the 2026-09-28 queued development job. Never use this
// against a production database or a job that may have reached a provider.
const TARGET_PREFIX = "33735b64-";
const TARGET_CREATED_SECOND = "2026-09-28T03:24:26";
const LOCAL_REDIS_URL = "redis://127.0.0.1:56549/0";

function assertLocalTarget() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.port, "54449");
  assert.equal(database.pathname, "/goodgood");
  assert.equal(process.env.REDIS_URL, "redis://127.0.0.1:56449/0");
  assert.equal(process.env.OBJECT_STORAGE_ENDPOINT, "http://127.0.0.1:58049");
  assert.equal(process.env.OBJECT_STORAGE_BUCKET, "goodgood-gg052-local");
  assert.notEqual(process.env.NODE_ENV, "production");
}

function isWorkerPortListening() {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: 32142 });
    socket.setTimeout(1_000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve(false);
      else reject(error);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Worker port check timed out."));
    });
  });
}

async function readJob(client, jobId, { lock = false } = {}) {
  const result = await client.query(
    `SELECT j.id, j.owner_id, j.state, j.attempt_count, j.lease_owner,
            j.lease_expires_at, j.started_at, j.created_at,
            j.credit_reservation_entry_id, j.workspace_credit_reservation_entry_id,
            b.model_id, b.quoted_credit_amount, b.quoted_credit_unit,
            r.amount AS reserved_amount, r.owner_id AS reservation_owner_id,
            r.entry_type AS reservation_type, r.id AS reservation_id,
            o.id AS outbox_id, o.dispatched_at,
            (SELECT COUNT(*)::int FROM generation_attempts a WHERE a.job_id = j.id) AS attempt_rows,
            (SELECT COUNT(*)::int FROM credit_ledger_entries e
              WHERE e.prior_entry_id = j.credit_reservation_entry_id
                AND e.entry_type IN ('settle', 'release')) AS closure_count
       FROM generation_jobs j
       JOIN generation_batches b ON b.id = j.batch_id
       LEFT JOIN credit_ledger_entries r ON r.id = j.credit_reservation_entry_id
       LEFT JOIN generation_queue_outbox o ON o.job_id = j.id
      WHERE j.id = $1 ${lock ? "FOR UPDATE OF j" : ""}`,
    [jobId],
  );
  return result.rows[0] ?? null;
}

function assertExactJob(job, jobId, ownerId) {
  assert.ok(job, "The exact job does not exist in the local database.");
  assert.equal(job.id, jobId);
  assert.ok(job.id.startsWith(TARGET_PREFIX), "This tool is restricted to the old queued job.");
  assert.ok(job.created_at.toISOString().startsWith(TARGET_CREATED_SECOND),
    "Job creation time does not match the authorized old task.");
  assert.equal(job.owner_id, ownerId, "Job owner changed or does not match inspection.");
  assert.equal(job.model_id, "nano-banana-2");
  assert.ok(job.credit_reservation_entry_id && !job.workspace_credit_reservation_entry_id,
    "Expected exactly one personal credit reservation.");
  assert.equal(job.reservation_id, job.credit_reservation_entry_id);
  assert.equal(job.reservation_owner_id, ownerId);
  assert.equal(job.reservation_type, "reserve");
  assert.equal(BigInt(job.reserved_amount), -BigInt(job.quoted_credit_amount),
    "Reservation amount differs from the quoted amount.");
  assert.ok(job.outbox_id, "Queue outbox is missing.");
}

async function queueSnapshot(redis) {
  const [ready, processing] = await Promise.all([
    redis.lRange(GENERATION_READY_QUEUE, 0, -1),
    redis.lRange(GENERATION_PROCESSING_QUEUE, 0, -1),
  ]);
  return { ready, processing };
}

async function inspect(pool, redis) {
  const identity = await pool.query("SELECT current_database() AS name");
  assert.equal(identity.rows[0].name, "goodgood");
  const jobs = await pool.query(
    `SELECT id, state, attempt_count, created_at
       FROM generation_jobs
      WHERE id::text LIKE $1 OR state IN ('queued', 'running', 'refining')
      ORDER BY created_at`,
    [`${TARGET_PREFIX}%`],
  );
  const pendingOutbox = await pool.query(
    `SELECT o.job_id, j.state
       FROM generation_queue_outbox o
       JOIN generation_jobs j ON j.id = o.job_id
      WHERE o.dispatched_at IS NULL`,
  );
  const target = jobs.rows.find((job) => job.id.startsWith(TARGET_PREFIX));
  const detail = target ? await readJob(pool, target.id) : null;
  const balance = detail?.reservation_id
    ? await pool.query(
      `SELECT a.available_balance, a.reserved_balance
         FROM credit_accounts a
         JOIN credit_ledger_entries e ON e.account_id = a.id
        WHERE e.id = $1`,
      [detail.reservation_id],
    )
    : null;
  console.log(JSON.stringify({
    database: "127.0.0.1:54449/goodgood",
    redis: LOCAL_REDIS_URL,
    workerListening: await isWorkerPortListening(),
    jobs: jobs.rows,
    pendingOutbox: pendingOutbox.rows,
    target: detail ? {
      id: detail.id,
      model: detail.model_id,
      state: detail.state,
      attemptRows: detail.attempt_rows,
      attemptCount: detail.attempt_count,
      leaseOwner: detail.lease_owner,
      leaseExpiresAt: detail.lease_expires_at,
      startedAt: detail.started_at,
      personalReservationId: detail.credit_reservation_entry_id,
      workspaceReservationId: detail.workspace_credit_reservation_entry_id,
      reservedAmount: detail.reserved_amount,
      quotedCreditAmount: detail.quoted_credit_amount,
      quotedCreditUnit: detail.quoted_credit_unit,
      closureCount: detail.closure_count,
      outboxId: detail.outbox_id,
      outboxDispatchedAt: detail.dispatched_at,
      creditAccount: balance?.rows[0] ?? null,
    } : null,
    queue: await queueSnapshot(redis),
  }, null, 2));
}

async function cancel(pool, redis, jobId, ownerId) {
  assert.match(jobId, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  assert.match(ownerId, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  if (await isWorkerPortListening()) throw new Error("Worker is listening; cancel before starting it.");
  const before = await queueSnapshot(redis);
  assert.deepEqual(before.processing, [], "Processing queue must be empty.");
  assert.ok(before.ready.length === 0 ||
    (before.ready.length === 1 && before.ready[0] === jobId),
  "Only the exact old job may be in the ready queue.");

  const client = await pool.connect();
  let alreadyCancelled = false;
  try {
    await client.query("BEGIN");
    const job = await readJob(client, jobId, { lock: true });
    assertExactJob(job, jobId, ownerId);
    if (job.state === "cancelled") {
      assert.equal(job.closure_count, 1, "Cancelled job lacks exactly one reservation closure.");
      alreadyCancelled = true;
    } else {
      assert.deepEqual(before.ready, [jobId], "Queued job must be the only ready entry.");
      assert.equal(job.state, "queued", "Only an unclaimed queued job may be cancelled.");
      assert.equal(job.attempt_count, 0);
      assert.equal(job.attempt_rows, 0);
      assert.equal(job.lease_owner, null);
      assert.equal(job.lease_expires_at, null);
      assert.equal(job.started_at, null);
      assert.equal(job.closure_count, 0);

      await releaseGenerationCreditsInTransaction(client, {
        actor: "operator",
        idempotencyKey: `generation-release:${jobId}`,
        jobId,
        ownerId,
        reason: "local_stale_queued_generation_cancelled",
      });
      const changed = await client.query(
        `UPDATE generation_jobs
            SET state = 'cancelled', error_code = 'LOCAL_QUEUED_CANCELLED',
                error_title = '生成已取消',
                error_message = '旧的本地待处理任务已取消，预留积分已返还。',
                error_retryable = false, completed_at = now(), updated_at = now()
          WHERE id = $1 AND owner_id = $2 AND state = 'queued'
            AND attempt_count = 0 AND lease_owner IS NULL
            AND lease_expires_at IS NULL AND started_at IS NULL
          RETURNING id`,
        [jobId, ownerId],
      );
      assert.equal(changed.rowCount, 1, "Job state changed before cancellation.");
      await client.query(
        `INSERT INTO generation_job_events
           (job_id, sequence, from_state, to_state, event_type, detail)
         SELECT $1, COALESCE(MAX(sequence), 0) + 1,
                'queued', 'cancelled', 'operator_cancelled', $2::jsonb
           FROM generation_job_events WHERE job_id = $1`,
        [jobId, JSON.stringify({ reason: "stale_local_queue_before_worker_start" })],
      );
    }
    await client.query(
      `UPDATE generation_queue_outbox
          SET dispatched_at = COALESCE(dispatched_at, now()), last_error = NULL
        WHERE job_id = $1`,
      [jobId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Redis and PostgreSQL do not share a transaction. If cleanup is interrupted,
  // rerunning this command removes only this terminal job's ready-list entry.
  const removed = await redis.lRem(GENERATION_READY_QUEUE, 0, jobId);
  const after = await queueSnapshot(redis);
  const finalJob = await readJob(pool, jobId);
  const closure = await pool.query(
    `SELECT entry_type, amount, owner_id FROM credit_ledger_entries
      WHERE prior_entry_id = $1 AND entry_type IN ('settle', 'release')`,
    [finalJob.credit_reservation_entry_id],
  );
  assert.equal(finalJob.state, "cancelled");
  assert.equal(closure.rowCount, 1);
  assert.equal(closure.rows[0].entry_type, "release");
  assert.equal(closure.rows[0].owner_id, ownerId);
  assert.equal(BigInt(closure.rows[0].amount), -BigInt(finalJob.reserved_amount));
  assert.deepEqual(after, { ready: [], processing: [] }, "Queue is not empty after cancellation.");
  console.log(JSON.stringify({
    jobId,
    state: finalJob.state,
    creditReleased: closure.rows[0].amount,
    creditUnit: finalJob.quoted_credit_unit,
    redisEntriesRemoved: removed,
    alreadyCancelled,
    queue: after,
  }, null, 2));
}

assertLocalTarget();
const [operation, jobId, ownerId] = process.argv.slice(2);
assert.ok(operation === "inspect" || operation === "cancel",
  "Use inspect or cancel <full-job-id> <owner-id>.");
if (operation === "inspect") assert.equal(process.argv.length, 3);
else assert.equal(process.argv.length, 5);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const redis = createClient({ url: LOCAL_REDIS_URL });
try {
  await redis.connect();
  if (operation === "inspect") await inspect(pool, redis);
  else await cancel(pool, redis, jobId, ownerId);
} finally {
  await Promise.allSettled([redis.isOpen ? redis.quit() : Promise.resolve(), pool.end()]);
}
