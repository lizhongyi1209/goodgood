function lifecycleClaimFromRow(row) {
  return {
    deadlineAt: new Date(row.deadline_at).toISOString(),
    requestId: row.request_id,
    targetOwnerId: row.target_owner_id,
  };
}

export async function inspectAccountDeletionLifecycle(pool, { now, requestId = null }) {
  const result = await pool.query(
    `SELECT
       count(*) FILTER (
         WHERE register.state = 'processing'
       )::int AS processing,
       count(*) FILTER (
         WHERE register.state = 'processing'
           AND register.deadline_at <= $1
       )::int AS overdue,
       count(*) FILTER (
         WHERE step.state = 'completed'
       )::int AS wait_completed,
       count(*) FILTER (
         WHERE step.state = 'running'
           AND step.lease_expires_at > $1
       )::int AS wait_leased,
       count(*) FILTER (
         WHERE register.state = 'processing'
           AND (
             (step.state = 'pending'
               AND (step.next_attempt_at IS NULL OR step.next_attempt_at <= $1))
             OR (step.state = 'running' AND step.lease_expires_at <= $1)
           )
       )::int AS wait_due
     FROM account_deletion_register register
     JOIN account_deletion_steps step
       ON step.request_id = register.request_id
      AND step.step_name = 'wait_for_submitted_jobs'
    WHERE ($2::uuid IS NULL OR register.request_id = $2::uuid)`,
    [now, requestId],
  );
  const row = result.rows[0] ?? {};
  return {
    overdue: Number(row.overdue ?? 0),
    processing: Number(row.processing ?? 0),
    waitCompleted: Number(row.wait_completed ?? 0),
    waitDue: Number(row.wait_due ?? 0),
    waitLeased: Number(row.wait_leased ?? 0),
  };
}

export async function claimAccountDeletionWaitStep(
  pool,
  { leaseExpiresAt, now, requestId = null, workerId },
) {
  const result = await pool.query(
    `WITH candidate AS (
       SELECT step.request_id
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
         JOIN account_deletion_requests request
           ON request.id = step.request_id
        WHERE step.step_name = 'wait_for_submitted_jobs'
          AND register.state = 'processing'
          AND request.state = 'processing'
          AND ($4::uuid IS NULL OR step.request_id = $4::uuid)
          AND (
            (step.state = 'pending'
              AND (step.next_attempt_at IS NULL OR step.next_attempt_at <= $1))
            OR (step.state = 'running' AND step.lease_expires_at <= $1)
          )
        ORDER BY register.deadline_at, step.request_id
        LIMIT 1
        FOR UPDATE OF step SKIP LOCKED
     )
     UPDATE account_deletion_steps step
        SET state = 'running',
            attempt_count = attempt_count + 1,
            last_attempt_at = $1,
            next_attempt_at = NULL,
            last_block_code = NULL,
            lease_owner = $2,
            lease_expires_at = $3,
            updated_at = $1
       FROM candidate, account_deletion_register register
      WHERE step.request_id = candidate.request_id
        AND step.step_name = 'wait_for_submitted_jobs'
        AND register.request_id = candidate.request_id
     RETURNING step.request_id, register.target_owner_id, register.deadline_at`,
    [now, workerId, leaseExpiresAt, requestId],
  );
  return result.rowCount ? lifecycleClaimFromRow(result.rows[0]) : null;
}

export async function resolveAccountDeletionWaitStep(
  pool,
  { now, requestId, retryAt, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT step.request_id, register.target_owner_id
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
        WHERE step.request_id = $1
          AND step.step_name = 'wait_for_submitted_jobs'
          AND step.state = 'running'
          AND step.lease_owner = $2
          AND step.lease_expires_at > $3
        FOR UPDATE OF step`,
      [requestId, workerId, now],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return { resolved: false, reason: "lost_lease" };
    }

    const activeJobs = await client.query(
      `SELECT job.id
         FROM generation_jobs job
        WHERE job.owner_id = $1
          AND job.state NOT IN ('succeeded', 'failed', 'cancelled')
          AND EXISTS (
            SELECT 1
              FROM generation_attempts attempt
             WHERE attempt.job_id = job.id
               AND attempt.state <> 'created'
          )
        ORDER BY job.id
        FOR UPDATE OF job`,
      [locked.rows[0].target_owner_id],
    );
    if (activeJobs.rowCount) {
      await client.query(
        `UPDATE account_deletion_steps
            SET state = 'pending',
                next_attempt_at = $4,
                last_active_job_count = $3,
                last_block_code = 'SUBMITTED_JOBS_ACTIVE',
                lease_owner = NULL,
                lease_expires_at = NULL,
                updated_at = $5
          WHERE request_id = $1
            AND step_name = 'wait_for_submitted_jobs'
            AND lease_owner = $2`,
        [requestId, workerId, activeJobs.rowCount, retryAt, now],
      );
      await client.query("COMMIT");
      return {
        activeSubmittedJobCount: activeJobs.rowCount,
        resolved: true,
        state: "pending",
      };
    }

    await client.query(
      `UPDATE account_deletion_steps
          SET state = 'completed',
              next_attempt_at = NULL,
              last_active_job_count = 0,
              last_block_code = NULL,
              lease_owner = NULL,
              lease_expires_at = NULL,
              completed_at = $3,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'wait_for_submitted_jobs'
          AND lease_owner = $2`,
      [requestId, workerId, now],
    );
    await client.query("COMMIT");
    return {
      activeSubmittedJobCount: 0,
      resolved: true,
      state: "completed",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
