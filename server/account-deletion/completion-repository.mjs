import { expireAvailableCreditsInTransaction } from "../billing/repository.mjs";

const REQUIRED_COMPLETED_STEPS = new Set([
  "wait_for_submitted_jobs",
  "delete_private_objects",
  "delete_creative_records",
  "delete_external_identities",
]);

export class AccountDeletionCompletionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionCompletionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AccountDeletionCompletionError(code, message);
}

export async function claimAccountDeletionCompletionStep(
  pool,
  { leaseExpiresAt, now, requestId = null, workerId },
) {
  const result = await pool.query(
    `WITH candidate AS (
       SELECT final_step.request_id
         FROM account_deletion_steps final_step
         JOIN account_deletion_register register
           ON register.request_id = final_step.request_id
         JOIN account_deletion_requests request
           ON request.id = final_step.request_id
          AND request.target_owner_id = register.target_owner_id
         JOIN account_deletion_steps identity_step
           ON identity_step.request_id = final_step.request_id
          AND identity_step.step_name = 'delete_external_identities'
        WHERE final_step.step_name = 'anonymize_goodgood_account'
          AND register.state = 'processing'
          AND request.state = 'processing'
          AND identity_step.state = 'completed'
          AND ($4::uuid IS NULL OR final_step.request_id = $4::uuid)
          AND (
            (final_step.state = 'pending'
              AND (final_step.next_attempt_at IS NULL
                OR final_step.next_attempt_at <= $1))
            OR (final_step.state = 'running'
              AND final_step.lease_expires_at <= $1)
          )
        ORDER BY register.deadline_at, final_step.request_id
        LIMIT 1
        FOR UPDATE OF final_step SKIP LOCKED
     )
     UPDATE account_deletion_steps final_step
        SET state = 'running',
            attempt_count = attempt_count + 1,
            last_attempt_at = $1,
            next_attempt_at = NULL,
            last_block_code = NULL,
            lease_owner = $2,
            lease_expires_at = $3,
            updated_at = $1
       FROM candidate
      WHERE final_step.request_id = candidate.request_id
        AND final_step.step_name = 'anonymize_goodgood_account'
     RETURNING final_step.request_id`,
    [now, workerId, leaseExpiresAt, requestId],
  );
  return result.rowCount ? { requestId: result.rows[0].request_id } : null;
}

async function assertCompletedPrerequisites(client, requestId) {
  const steps = await client.query(
    `SELECT step_name, state
       FROM account_deletion_steps
      WHERE request_id = $1
      ORDER BY step_name
      FOR UPDATE`,
    [requestId],
  );
  const completed = new Set(
    steps.rows
      .filter((row) => row.state === "completed")
      .map((row) => row.step_name),
  );
  for (const stepName of REQUIRED_COMPLETED_STEPS) {
    if (!completed.has(stepName)) {
      fail(
        "DELETION_PREREQUISITE_INCOMPLETE",
        "Every prior account-deletion step must be complete.",
      );
    }
  }
}

async function assertCreativeGraphEmpty(client, targetOwnerId) {
  const result = await client.query(
    `SELECT (
       (SELECT count(*) FROM projects WHERE owner_id = $1)
       + (SELECT count(*) FROM generation_batches WHERE owner_id = $1)
       + (SELECT count(*) FROM generation_jobs WHERE owner_id = $1)
       + (SELECT count(*) FROM assets WHERE owner_id = $1)
       + (SELECT count(*) FROM creation_drafts WHERE owner_id = $1)
       + (SELECT count(*) FROM reference_assets WHERE owner_id = $1)
     )::int AS count`,
    [targetOwnerId],
  );
  if ((result.rows[0]?.count ?? 0) !== 0) {
    fail(
      "CREATIVE_RECORDS_REMAIN",
      "Creative records remain before local account anonymization.",
    );
  }
}

export async function completeAccountDeletionLocally(
  pool,
  { now, requestId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT register.target_owner_id, owner.anonymized_at
         FROM account_deletion_steps final_step
         JOIN account_deletion_register register
           ON register.request_id = final_step.request_id
         JOIN account_deletion_requests request
           ON request.id = final_step.request_id
          AND request.target_owner_id = register.target_owner_id
         JOIN account_deletion_steps identity_step
           ON identity_step.request_id = final_step.request_id
          AND identity_step.step_name = 'delete_external_identities'
          AND identity_step.state = 'completed'
         JOIN users owner ON owner.id = register.target_owner_id
        WHERE final_step.request_id = $1
          AND final_step.step_name = 'anonymize_goodgood_account'
          AND final_step.state = 'running'
          AND final_step.lease_owner = $2
          AND final_step.lease_expires_at > $3
          AND register.state = 'processing'
          AND request.state = 'processing'
        FOR UPDATE OF final_step, register, request, owner`,
      [requestId, workerId, now],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return { completed: false, reason: "lost_lease" };
    }
    const targetOwnerId = locked.rows[0].target_owner_id;
    if (locked.rows[0].anonymized_at !== null) {
      fail(
        "LOCAL_ACCOUNT_STATE_INCONSISTENT",
        "The owner is already anonymized while the request remains processing.",
      );
    }
    await assertCompletedPrerequisites(client, requestId);
    await assertCreativeGraphEmpty(client, targetOwnerId);

    const role = await client.query(
      `SELECT 1
         FROM system_role_assignments
        WHERE owner_id = $1
        LIMIT 1`,
      [targetOwnerId],
    );
    if (role.rowCount) {
      fail(
        "SITE_OWNER_ANONYMIZATION_FORBIDDEN",
        "Site-owner deletion requires a separate reviewed runbook.",
      );
    }

    const sessions = await client.query(
      `SELECT id, revoked_at
         FROM auth_sessions
        WHERE owner_id = $1
        ORDER BY id
        FOR UPDATE`,
      [targetOwnerId],
    );
    if (sessions.rows.some((row) => row.revoked_at === null)) {
      fail(
        "ACTIVE_SESSION_REMAINS",
        "Every local session must be revoked before anonymization.",
      );
    }

    const identities = await client.query(
      `SELECT id, external_deleted_at
         FROM auth_identities
        WHERE owner_id = $1
        ORDER BY id
        FOR UPDATE`,
      [targetOwnerId],
    );
    if (identities.rows.some((row) => row.external_deleted_at === null)) {
      fail(
        "EXTERNAL_IDENTITY_EVIDENCE_MISSING",
        "Every identity mapping requires external deletion evidence.",
      );
    }

    const accounts = await client.query(
      `SELECT id, unit, available_balance, reserved_balance, status
         FROM credit_accounts
        WHERE owner_id = $1
        ORDER BY unit
        FOR UPDATE`,
      [targetOwnerId],
    );
    if (accounts.rows.some((row) => row.unit !== "credit")) {
      fail(
        "UNSUPPORTED_CREDIT_UNIT",
        "Every retained account unit must have a reviewed expiry policy.",
      );
    }
    if (accounts.rows.some((row) => BigInt(row.reserved_balance) !== 0n)) {
      fail(
        "CREDIT_RESERVATION_REMAINS",
        "Reserved credit remains before local account anonymization.",
      );
    }

    let expiredCreditAmount = 0n;
    for (const account of accounts.rows) {
      const expiry = await expireAvailableCreditsInTransaction(client, {
        actor: "system",
        idempotencyKey: `account-deletion-expire:${requestId}`,
        metadata: { deletionRequestId: requestId },
        ownerId: targetOwnerId,
        reason: "account_deletion_expiry",
        unit: account.unit,
      });
      expiredCreditAmount += expiry.expiredAmount;
    }
    const closedAccounts = await client.query(
      `UPDATE credit_accounts
          SET status = 'closed', updated_at = $2
        WHERE owner_id = $1
          AND available_balance = 0
          AND reserved_balance = 0
        RETURNING id`,
      [targetOwnerId, now],
    );
    if (closedAccounts.rowCount !== accounts.rowCount) {
      fail(
        "CREDIT_ACCOUNT_CLOSE_INCOMPLETE",
        "Every credit account must close with zero balances.",
      );
    }

    const deletedSessions = await client.query(
      `DELETE FROM auth_sessions
        WHERE owner_id = $1
        RETURNING id`,
      [targetOwnerId],
    );
    const deletedIdentities = await client.query(
      `DELETE FROM auth_identities
        WHERE owner_id = $1
          AND external_deleted_at IS NOT NULL
        RETURNING id`,
      [targetOwnerId],
    );
    if (deletedIdentities.rowCount !== identities.rowCount) {
      fail(
        "LOCAL_IDENTITY_DELETE_INCOMPLETE",
        "Every local identity mapping must be removed.",
      );
    }

    const owner = await client.query(
      `UPDATE users
          SET email = 'deleted-' || replace($2::text, '-', '')
              || '@deleted.goodgood.invalid',
              locale = 'zh-CN',
              status = 'suspended',
              anonymized_at = $3,
              updated_at = $3
        WHERE id = $1 AND anonymized_at IS NULL
        RETURNING id`,
      [targetOwnerId, requestId, now],
    );
    if (owner.rowCount !== 1) {
      fail(
        "LOCAL_OWNER_ANONYMIZATION_INCOMPLETE",
        "The local owner could not be anonymized.",
      );
    }

    const completedRequest = await client.query(
      `UPDATE account_deletion_requests
          SET mail_reference_id = 'anonymized-deletion-evidence',
              state = 'completed',
              completed_at = $2,
              updated_at = $2
        WHERE id = $1 AND state = 'processing'`,
      [requestId, now],
    );
    if (completedRequest.rowCount !== 1) {
      fail(
        "LOCAL_REQUEST_COMPLETION_INCOMPLETE",
        "The deletion request could not be completed atomically.",
      );
    }
    const completedStep = await client.query(
      `UPDATE account_deletion_steps
          SET state = 'completed',
              next_attempt_at = NULL,
              last_block_code = NULL,
              lease_owner = NULL,
              lease_expires_at = NULL,
              deleted_local_session_count = $4,
              deleted_local_identity_count = $5,
              expired_credit_amount = $6,
              completed_at = $3,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'anonymize_goodgood_account'
          AND lease_owner = $2`,
      [
        requestId,
        workerId,
        now,
        deletedSessions.rowCount,
        deletedIdentities.rowCount,
        expiredCreditAmount.toString(),
      ],
    );
    if (completedStep.rowCount !== 1) {
      fail(
        "LOCAL_STEP_COMPLETION_INCOMPLETE",
        "The local anonymization step could not be completed atomically.",
      );
    }
    const completedRegister = await client.query(
      `UPDATE account_deletion_register
          SET state = 'completed',
              completed_at = $2,
              audit_retention_until = $2::timestamptz + interval '12 months',
              updated_at = $2
        WHERE request_id = $1 AND state = 'processing'`,
      [requestId, now],
    );
    if (completedRegister.rowCount !== 1) {
      fail(
        "LOCAL_REGISTER_COMPLETION_INCOMPLETE",
        "The deletion register could not be completed atomically.",
      );
    }
    await client.query("COMMIT");
    return {
      completed: true,
      deletedIdentityCount: deletedIdentities.rowCount,
      deletedSessionCount: deletedSessions.rowCount,
      expiredCreditAmount: expiredCreditAmount.toString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deferAccountDeletionCompletionStep(
  pool,
  { now, requestId, retryAt, workerId },
) {
  const result = await pool.query(
    `UPDATE account_deletion_steps
        SET state = 'pending',
            next_attempt_at = $3,
            last_block_code = 'LOCAL_ANONYMIZATION_FAILED',
            lease_owner = NULL,
            lease_expires_at = NULL,
            updated_at = $4
      WHERE request_id = $1
        AND step_name = 'anonymize_goodgood_account'
        AND state = 'running'
        AND lease_owner = $2
        AND lease_expires_at > $4`,
    [requestId, workerId, retryAt, now],
  );
  return result.rowCount === 1;
}
