import {
  GENERATION_PROCESSING_QUEUE,
  GENERATION_READY_QUEUE,
} from "./config.mjs";

export async function dispatchPendingJobs(pool, redis, limit = 50) {
  const pending = await pool.query(
    `SELECT id, job_id
       FROM generation_queue_outbox
      WHERE dispatched_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );

  for (const row of pending.rows) {
    try {
      await redis.lPush(GENERATION_READY_QUEUE, row.job_id);
      await pool.query(
        `UPDATE generation_queue_outbox
            SET attempts = attempts + 1,
                dispatched_at = now(),
                last_error = NULL
          WHERE id = $1`,
        [row.id],
      );
    } catch (error) {
      await pool.query(
        `UPDATE generation_queue_outbox
            SET attempts = attempts + 1,
                last_error = $2
          WHERE id = $1`,
        [row.id, error instanceof Error ? error.message.slice(0, 500) : String(error)],
      );
      throw error;
    }
  }

  return pending.rowCount ?? 0;
}

export async function reconcileRecoverableJobs(pool) {
  const result = await pool.query(`
    INSERT INTO generation_queue_outbox (job_id)
    SELECT id
      FROM generation_jobs
     WHERE state IN ('queued', 'running', 'refining')
       AND (lease_expires_at IS NULL OR lease_expires_at < now())
    ON CONFLICT (job_id) DO UPDATE
      SET dispatched_at = NULL,
          last_error = NULL
  `);
  return result.rowCount ?? 0;
}

export function takeQueuedJob(redis) {
  return redis.rPopLPush(GENERATION_READY_QUEUE, GENERATION_PROCESSING_QUEUE);
}

export function acknowledgeQueuedJob(redis, jobId) {
  return redis.lRem(GENERATION_PROCESSING_QUEUE, 0, jobId);
}
