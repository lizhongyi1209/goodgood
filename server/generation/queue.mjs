import {
  GENERATION_PROCESSING_QUEUE,
  GENERATION_READY_QUEUE,
} from "./config.mjs";

export async function dispatchPendingJobs(pool, redis, limit = 50) {
  const pending = await pool.query(
    `WITH pending AS (
       SELECT id
         FROM generation_queue_outbox
        WHERE dispatched_at IS NULL
        ORDER BY created_at ASC
        LIMIT $1
          FOR UPDATE SKIP LOCKED
     )
     UPDATE generation_queue_outbox AS outbox
        SET attempts = outbox.attempts + 1,
            dispatched_at = now(),
            last_error = NULL
       FROM pending
      WHERE outbox.id = pending.id
      RETURNING outbox.id, outbox.job_id, outbox.dispatched_at`,
    [limit],
  );

  for (const row of pending.rows) {
    try {
      await redis.lPush(GENERATION_READY_QUEUE, row.job_id);
    } catch (error) {
      await pool.query(
        `UPDATE generation_queue_outbox
            SET dispatched_at = NULL,
                last_error = $3
          WHERE id = $1 AND dispatched_at = $2`,
        [
          row.id,
          row.dispatched_at,
          error instanceof Error ? error.message.slice(0, 500) : String(error),
        ],
      );
      throw error;
    }
  }

  return pending.rowCount ?? 0;
}

export async function reconcileRecoverableJobs(pool, redispatchAfterMs = 15_000) {
  if (!Number.isInteger(redispatchAfterMs) || redispatchAfterMs <= 0) {
    throw new Error("Queue redispatch window must be a positive integer.");
  }
  const result = await pool.query(`
    INSERT INTO generation_queue_outbox (job_id)
    SELECT jobs.id
      FROM generation_jobs AS jobs
      LEFT JOIN generation_queue_outbox AS outbox ON outbox.job_id = jobs.id
     WHERE jobs.state IN ('queued', 'running', 'refining')
       AND (jobs.lease_expires_at IS NULL OR jobs.lease_expires_at < now())
       AND (
         outbox.id IS NULL OR
         outbox.dispatched_at IS NULL OR
         outbox.dispatched_at < now() - ($1 * interval '1 millisecond')
       )
    ON CONFLICT (job_id) DO UPDATE
      SET dispatched_at = NULL,
          last_error = NULL
    WHERE generation_queue_outbox.dispatched_at IS NULL
       OR generation_queue_outbox.dispatched_at < now() - ($1 * interval '1 millisecond')
  `, [redispatchAfterMs]);
  return result.rowCount ?? 0;
}

export function takeQueuedJob(redis) {
  return redis.rPopLPush(GENERATION_READY_QUEUE, GENERATION_PROCESSING_QUEUE);
}

export function acknowledgeQueuedJob(redis, jobId) {
  return redis.lRem(GENERATION_PROCESSING_QUEUE, 0, jobId);
}
