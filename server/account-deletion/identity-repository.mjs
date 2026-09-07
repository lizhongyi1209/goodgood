function identityFromRow(row) {
  return {
    disabled: row.external_disabled_at !== null,
    id: row.id,
    issuer: row.issuer,
    subject: row.subject,
  };
}

async function lockLeasedIdentity(
  client,
  { identityId, now, requestId, workerId },
) {
  const result = await client.query(
    `SELECT identity.id, identity.external_disabled_at,
            identity.external_deleted_at
       FROM account_deletion_steps step
       JOIN account_deletion_register register
         ON register.request_id = step.request_id
       JOIN account_deletion_requests request
         ON request.id = step.request_id
        AND request.target_owner_id = register.target_owner_id
       JOIN auth_identities identity
         ON identity.owner_id = register.target_owner_id
        AND identity.id = $4
      WHERE step.request_id = $1
        AND step.step_name = 'delete_external_identities'
        AND step.state = 'running'
        AND step.lease_owner = $2
        AND step.lease_expires_at > $3
        AND register.state = 'processing'
        AND request.state = 'processing'
      FOR UPDATE OF step, identity`,
    [requestId, workerId, now, identityId],
  );
  return result.rows[0] ?? null;
}

export async function claimAccountDeletionIdentityStep(
  pool,
  {
    identityLimit = 100,
    leaseExpiresAt,
    now,
    requestId = null,
    workerId,
  },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      `WITH candidate AS (
         SELECT identity_step.request_id
           FROM account_deletion_steps identity_step
           JOIN account_deletion_register register
             ON register.request_id = identity_step.request_id
           JOIN account_deletion_requests request
             ON request.id = identity_step.request_id
            AND request.target_owner_id = register.target_owner_id
           JOIN account_deletion_steps creative_step
             ON creative_step.request_id = identity_step.request_id
            AND creative_step.step_name = 'delete_creative_records'
          WHERE identity_step.step_name = 'delete_external_identities'
            AND register.state = 'processing'
            AND request.state = 'processing'
            AND creative_step.state = 'completed'
            AND ($4::uuid IS NULL OR identity_step.request_id = $4::uuid)
            AND (
              (identity_step.state = 'pending'
                AND (identity_step.next_attempt_at IS NULL
                  OR identity_step.next_attempt_at <= $1))
              OR (identity_step.state = 'running'
                AND identity_step.lease_expires_at <= $1)
            )
          ORDER BY register.deadline_at, identity_step.request_id
          LIMIT 1
          FOR UPDATE OF identity_step SKIP LOCKED
       )
       UPDATE account_deletion_steps identity_step
          SET state = 'running',
              attempt_count = attempt_count + 1,
              last_attempt_at = $1,
              next_attempt_at = NULL,
              last_block_code = NULL,
              last_failed_identity_count = 0,
              lease_owner = $2,
              lease_expires_at = $3,
              updated_at = $1
         FROM candidate, account_deletion_register register
        WHERE identity_step.request_id = candidate.request_id
          AND identity_step.step_name = 'delete_external_identities'
          AND register.request_id = candidate.request_id
       RETURNING identity_step.request_id, register.target_owner_id`,
      [now, workerId, leaseExpiresAt, requestId],
    );
    if (!claimed.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const row = claimed.rows[0];
    const totals = await client.query(
      `SELECT count(*)::int AS count
         FROM auth_identities
        WHERE owner_id = $1`,
      [row.target_owner_id],
    );
    const identities = await client.query(
      `SELECT id, issuer, subject, external_disabled_at
         FROM auth_identities
        WHERE owner_id = $1
          AND external_deleted_at IS NULL
        ORDER BY id
        LIMIT $2
        FOR UPDATE`,
      [row.target_owner_id, identityLimit],
    );
    const targetIdentityCount = totals.rows[0]?.count ?? 0;
    await client.query(
      `UPDATE account_deletion_steps
          SET last_target_identity_count = $3,
              updated_at = $4
        WHERE request_id = $1
          AND step_name = 'delete_external_identities'
          AND lease_owner = $2`,
      [row.request_id, workerId, targetIdentityCount, now],
    );
    await client.query("COMMIT");
    return {
      identities: identities.rows.map(identityFromRow),
      requestId: row.request_id,
      targetIdentityCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markAccountDeletionIdentityDisabled(
  pool,
  { identityId, now, requestId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = await lockLeasedIdentity(client, {
      identityId,
      now,
      requestId,
      workerId,
    });
    if (!identity) {
      await client.query("COMMIT");
      return { recorded: false, reason: "lost_lease" };
    }
    const newlyRecorded = identity.external_disabled_at === null;
    if (newlyRecorded) {
      await client.query(
        `UPDATE auth_identities
            SET external_disabled_at = $2
          WHERE id = $1`,
        [identityId, now],
      );
      await client.query(
        `UPDATE account_deletion_steps
            SET disabled_identity_count = disabled_identity_count + 1,
                updated_at = $3
          WHERE request_id = $1
            AND step_name = 'delete_external_identities'
            AND lease_owner = $2`,
        [requestId, workerId, now],
      );
    }
    await client.query("COMMIT");
    return { newlyRecorded, recorded: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markAccountDeletionIdentityDeleted(
  pool,
  { identityId, now, requestId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = await lockLeasedIdentity(client, {
      identityId,
      now,
      requestId,
      workerId,
    });
    if (!identity) {
      await client.query("COMMIT");
      return { recorded: false, reason: "lost_lease" };
    }
    if (identity.external_disabled_at === null) {
      throw new Error("External identity deletion requires disable evidence.");
    }
    const newlyRecorded = identity.external_deleted_at === null;
    if (newlyRecorded) {
      await client.query(
        `UPDATE auth_identities
            SET external_deleted_at = $2
          WHERE id = $1`,
        [identityId, now],
      );
      await client.query(
        `UPDATE account_deletion_steps
            SET deleted_identity_count = deleted_identity_count + 1,
                updated_at = $3
          WHERE request_id = $1
            AND step_name = 'delete_external_identities'
            AND lease_owner = $2`,
        [requestId, workerId, now],
      );
    }
    await client.query("COMMIT");
    return { newlyRecorded, recorded: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveAccountDeletionIdentityStep(
  pool,
  { failedIdentityCount, now, requestId, retryAt, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT register.target_owner_id
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
         JOIN account_deletion_requests request
           ON request.id = step.request_id
          AND request.target_owner_id = register.target_owner_id
        WHERE step.request_id = $1
          AND step.step_name = 'delete_external_identities'
          AND step.state = 'running'
          AND step.lease_owner = $2
          AND step.lease_expires_at > $3
          AND register.state = 'processing'
          AND request.state = 'processing'
        FOR UPDATE OF step`,
      [requestId, workerId, now],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return { reason: "lost_lease", resolved: false };
    }
    const remaining = await client.query(
      `SELECT count(*)::int AS count
         FROM auth_identities
        WHERE owner_id = $1
          AND external_deleted_at IS NULL`,
      [locked.rows[0].target_owner_id],
    );
    const remainingIdentityCount = remaining.rows[0]?.count ?? 0;
    if (failedIdentityCount > 0 || remainingIdentityCount > 0) {
      await client.query(
        `UPDATE account_deletion_steps
            SET state = 'pending',
                next_attempt_at = $4,
                last_failed_identity_count = $3,
                last_block_code = CASE
                  WHEN $3 > 0 THEN 'IDENTITY_DELETE_FAILED'
                  ELSE NULL
                END,
                lease_owner = NULL,
                lease_expires_at = NULL,
                updated_at = $5
          WHERE request_id = $1
            AND step_name = 'delete_external_identities'
            AND lease_owner = $2`,
        [requestId, workerId, failedIdentityCount, retryAt, now],
      );
      await client.query("COMMIT");
      return {
        remainingIdentityCount,
        resolved: true,
        state: "pending",
      };
    }
    await client.query(
      `UPDATE account_deletion_steps
          SET state = 'completed',
              next_attempt_at = NULL,
              last_failed_identity_count = 0,
              last_block_code = NULL,
              lease_owner = NULL,
              lease_expires_at = NULL,
              completed_at = $3,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'delete_external_identities'
          AND lease_owner = $2`,
      [requestId, workerId, now],
    );
    await client.query("COMMIT");
    return { remainingIdentityCount: 0, resolved: true, state: "completed" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
