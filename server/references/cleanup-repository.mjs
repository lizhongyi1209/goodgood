import { lockReferenceLifecycle } from "./lifecycle-lock.mjs";

const HAS_PERSISTED_REFERENCE = `
  (
    EXISTS (
      SELECT 1
        FROM generation_batches batch
       WHERE batch.owner_id = ra.owner_id
         AND EXISTS (
           SELECT 1
             FROM jsonb_array_elements(batch.reference_snapshot) snapshot
            WHERE snapshot->>'id' = ra.id::text
         )
    )
    OR EXISTS (
      SELECT 1
        FROM projects project
       WHERE project.owner_id = ra.owner_id
         AND EXISTS (
           SELECT 1
             FROM jsonb_array_elements(project.reference_snapshot) snapshot
            WHERE snapshot->>'id' = ra.id::text
         )
    )
    OR EXISTS (
      SELECT 1
        FROM creation_drafts draft
       WHERE draft.owner_id = ra.owner_id
         AND draft.expires_at > $1
         AND EXISTS (
           SELECT 1
             FROM jsonb_array_elements(draft.reference_snapshot) snapshot
            WHERE snapshot->>'id' = ra.id::text
         )
    )
  )
`;

export async function inspectReferenceCleanup(
  pool,
  { now, orphanedBefore, ownerId = null },
) {
  const result = await pool.query(
    `SELECT
       count(*) FILTER (
         WHERE ra.object_deleted_at IS NULL
           AND ra.cleanup_eligible_at IS NULL
           AND (
             (ra.upload_state = 'pending' AND ra.expires_at <= $1)
             OR ra.upload_state IN ('rejected', 'expired')
             OR (ra.upload_state = 'ready' AND ra.updated_at <= $2)
           )
           AND NOT ${HAS_PERSISTED_REFERENCE}
       )::int AS eligible_to_stage,
       count(*) FILTER (
         WHERE ra.object_deleted_at IS NULL
           AND (
             (ra.upload_state = 'pending' AND ra.expires_at <= $1)
             OR ra.upload_state IN ('rejected', 'expired')
             OR (ra.upload_state = 'ready' AND ra.updated_at <= $2)
           )
           AND ${HAS_PERSISTED_REFERENCE}
       )::int AS protected,
       count(*) FILTER (
         WHERE ra.object_deleted_at IS NULL
           AND ra.cleanup_eligible_at <= $1
           AND (ra.cleanup_lease_expires_at IS NULL OR ra.cleanup_lease_expires_at <= $1)
           AND NOT ${HAS_PERSISTED_REFERENCE}
       )::int AS due_for_deletion
     FROM reference_assets ra
    WHERE ($3::uuid IS NULL OR ra.owner_id = $3::uuid)`,
    [now, orphanedBefore, ownerId],
  );
  return {
    dueForDeletion: result.rows[0]?.due_for_deletion ?? 0,
    eligibleToStage: result.rows[0]?.eligible_to_stage ?? 0,
    protected: result.rows[0]?.protected ?? 0,
  };
}

export async function stageAndClaimReferenceCleanup(
  pool,
  {
    cleanupEligibleAt,
    cleanupRunId,
    leaseExpiresAt,
    limit,
    now,
    orphanedBefore,
    ownerId = null,
  },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockReferenceLifecycle(client);
    const rescued = await client.query(
      `UPDATE reference_assets ra
          SET upload_state = 'ready', cleanup_eligible_at = NULL,
              cleanup_error_code = NULL, error_code = NULL,
              cleanup_lease_owner = NULL, cleanup_lease_expires_at = NULL,
              updated_at = $1
        WHERE ra.object_deleted_at IS NULL
          AND ra.upload_state = 'expired'
          AND ra.error_code = 'REFERENCE_ORPHANED'
          AND ($2::uuid IS NULL OR ra.owner_id = $2::uuid)
          AND ${HAS_PERSISTED_REFERENCE}`,
      [now, ownerId],
    );
    const expired = await client.query(
      `UPDATE reference_assets ra
          SET upload_state = 'expired', error_code = 'UPLOAD_EXPIRED',
              updated_at = $1
        WHERE ra.object_deleted_at IS NULL
          AND ra.upload_state = 'pending'
          AND ra.expires_at <= $1
          AND ($2::uuid IS NULL OR ra.owner_id = $2::uuid)`,
      [now, ownerId],
    );
    const staged = await client.query(
      `UPDATE reference_assets ra
          SET cleanup_eligible_at = $3,
              upload_state = CASE
                WHEN ra.upload_state = 'ready' THEN 'expired'
                ELSE ra.upload_state
              END,
              error_code = CASE
                WHEN ra.upload_state = 'ready' THEN 'REFERENCE_ORPHANED'
                ELSE ra.error_code
              END,
              cleanup_error_code = NULL,
              updated_at = $1
        WHERE ra.object_deleted_at IS NULL
          AND ra.cleanup_eligible_at IS NULL
          AND ($4::uuid IS NULL OR ra.owner_id = $4::uuid)
          AND (
            ra.upload_state IN ('rejected', 'expired')
            OR (ra.upload_state = 'ready' AND ra.updated_at <= $2)
          )
          AND NOT ${HAS_PERSISTED_REFERENCE}`,
      [now, orphanedBefore, cleanupEligibleAt, ownerId],
    );
    const claimed = await client.query(
      `WITH candidates AS (
         SELECT ra.id
           FROM reference_assets ra
          WHERE ra.object_deleted_at IS NULL
            AND ra.cleanup_eligible_at <= $1
            AND (ra.cleanup_lease_expires_at IS NULL OR ra.cleanup_lease_expires_at <= $1)
            AND ($3::uuid IS NULL OR ra.owner_id = $3::uuid)
            AND NOT ${HAS_PERSISTED_REFERENCE}
          ORDER BY ra.cleanup_eligible_at, ra.id
          LIMIT $2
          FOR UPDATE SKIP LOCKED
       )
       UPDATE reference_assets ra
          SET cleanup_lease_owner = $5,
              cleanup_lease_expires_at = $4,
              cleanup_error_code = NULL
         FROM candidates
        WHERE ra.id = candidates.id
       RETURNING ra.id, ra.owner_id, ra.object_key, ra.upload_state`,
      [now, limit, ownerId, leaseExpiresAt, cleanupRunId],
    );
    await client.query("COMMIT");
    return {
      candidates: claimed.rows,
      expired: expired.rowCount,
      rescued: rescued.rowCount,
      staged: staged.rowCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markReferenceCleanupSucceeded(
  pool,
  { cleanupRunId, now, referenceId },
) {
  const result = await pool.query(
    `UPDATE reference_assets
        SET object_deleted_at = $3,
            cleanup_attempt_count = cleanup_attempt_count + 1,
            cleanup_last_attempt_at = $3,
            cleanup_error_code = NULL,
            cleanup_lease_owner = NULL,
            cleanup_lease_expires_at = NULL,
            updated_at = $3
      WHERE id = $1 AND cleanup_lease_owner = $2
        AND object_deleted_at IS NULL`,
    [referenceId, cleanupRunId, now],
  );
  return result.rowCount === 1;
}

export async function markReferenceCleanupFailed(
  pool,
  { cleanupRunId, errorCode, now, referenceId },
) {
  const result = await pool.query(
    `UPDATE reference_assets
        SET cleanup_attempt_count = cleanup_attempt_count + 1,
            cleanup_last_attempt_at = $3,
            cleanup_error_code = $4,
            cleanup_lease_owner = NULL,
            cleanup_lease_expires_at = NULL,
            updated_at = $3
      WHERE id = $1 AND cleanup_lease_owner = $2
        AND object_deleted_at IS NULL`,
    [referenceId, cleanupRunId, now, errorCode],
  );
  return result.rowCount === 1;
}
