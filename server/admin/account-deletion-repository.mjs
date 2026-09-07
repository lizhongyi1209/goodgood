import { randomUUID } from "node:crypto";
import {
  releaseGenerationCreditsInTransaction,
  runCreditTransaction,
} from "../billing/repository.mjs";
import { AdministrationError, adminAccessDeniedError } from "./errors.mjs";

function requestFromRow(row, created) {
  return {
    cancelledJobCount: Number(row.cancelled_job_count),
    created,
    createdAt: new Date(row.created_at).toISOString(),
    deadlineAt: new Date(row.deadline_at).toISOString(),
    id: row.id,
    releasedCredits: String(row.released_credit_amount),
    revokedSessionCount: Number(row.revoked_session_count),
    state: row.state,
    verificationConfirmedAt: new Date(
      row.verification_confirmed_at,
    ).toISOString(),
    verificationRequestedAt: new Date(
      row.verification_requested_at,
    ).toISOString(),
  };
}

async function assertSiteOwner(client, actorOwnerId) {
  const role = await client.query(
    `SELECT 1
       FROM system_role_assignments
      WHERE owner_id = $1 AND role = 'site_owner'
      LIMIT 1`,
    [actorOwnerId],
  );
  if (!role.rowCount) throw adminAccessDeniedError();
}

async function existingAction(client, actorOwnerId, idempotencyKey) {
  const result = await client.query(
    `SELECT id, action_type, operation_hash
       FROM administrative_actions
      WHERE actor_owner_id = $1 AND idempotency_key = $2`,
    [actorOwnerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function assertMatchingReplay(existing, operationHash) {
  if (
    existing.action_type !== "create_account_deletion_request" ||
    existing.operation_hash !== operationHash
  ) {
    throw new AdministrationError(
      "ADMIN_IDEMPOTENCY_CONFLICT",
      "该操作标识已经用于另一项管理操作。",
      409,
    );
  }
}

async function readRequestByAction(client, administrativeActionId) {
  const result = await client.query(
    `SELECT *
       FROM account_deletion_requests
      WHERE administrative_action_id = $1`,
    [administrativeActionId],
  );
  if (!result.rowCount) {
    throw new AdministrationError(
      "ADMIN_DELETION_REQUEST_INCONSISTENT",
      "删除请求记录不完整，请停止操作并检查审计记录。",
      409,
    );
  }
  return result.rows[0];
}

async function lockTarget(client, targetOwnerId) {
  const result = await client.query(
    `SELECT target.id, target.email, target.status,
            EXISTS (
              SELECT 1 FROM system_role_assignments role
               WHERE role.owner_id = target.id AND role.role = 'site_owner'
            ) AS is_site_owner
       FROM users target
      WHERE target.id = $1
      FOR UPDATE OF target`,
    [targetOwnerId],
  );
  if (!result.rowCount) {
    throw new AdministrationError(
      "ADMIN_ACCOUNT_NOT_FOUND",
      "没有找到该账户。",
      404,
    );
  }
  return result.rows[0];
}

async function assertNoExistingRequest(client, targetOwnerId) {
  const existing = await client.query(
    `SELECT id
       FROM account_deletion_requests
      WHERE target_owner_id = $1`,
    [targetOwnerId],
  );
  if (existing.rowCount) {
    throw new AdministrationError(
      "ADMIN_DELETION_REQUEST_EXISTS",
      "该账户已经存在不可撤销的删除请求。",
      409,
    );
  }
}

async function lockActiveJobs(client, targetOwnerId) {
  const result = await client.query(
    `SELECT job.id, job.state, job.credit_reservation_entry_id,
            EXISTS (
              SELECT 1
                FROM generation_attempts attempt
               WHERE attempt.job_id = job.id
                 AND attempt.state <> 'created'
            ) AS provider_submission_started
       FROM generation_jobs job
      WHERE job.owner_id = $1
        AND job.state IN ('queued', 'running', 'refining')
      ORDER BY job.id
      FOR UPDATE OF job`,
    [targetOwnerId],
  );
  return result.rows;
}

async function cancelUnsubmittedJobs(
  client,
  { deletionRequestId, jobs, releaseCreditsInTransaction, targetOwnerId },
) {
  let cancelledJobCount = 0;
  let releasedCreditAmount = 0n;

  for (const job of jobs) {
    if (job.provider_submission_started) continue;

    if (job.credit_reservation_entry_id) {
      const release = await releaseCreditsInTransaction(client, {
        actor: "system",
        idempotencyKey: `account-deletion-release:${job.id}`,
        jobId: job.id,
        metadata: { deletionRequestId },
        ownerId: targetOwnerId,
        reason: "account_deletion_unsubmitted_cancel",
      });
      releasedCreditAmount += BigInt(release.entry.amount);
    }

    await client.query(
      `UPDATE generation_jobs
          SET state = 'cancelled', completed_at = now(), updated_at = now(),
              lease_owner = NULL, lease_expires_at = NULL
        WHERE id = $1`,
      [job.id],
    );
    await client.query(
      `INSERT INTO generation_job_events (
         job_id, sequence, from_state, to_state, event_type, detail
       )
       SELECT $1, COALESCE(MAX(sequence), 0) + 1, $2, 'cancelled',
              'account_deletion_cancelled', $3::jsonb
         FROM generation_job_events
        WHERE job_id = $1`,
      [job.id, job.state, JSON.stringify({ deletionRequestId })],
    );
    await client.query(
      `UPDATE generation_queue_outbox
          SET cancelled_at = COALESCE(cancelled_at, now()), last_error = NULL
        WHERE job_id = $1`,
      [job.id],
    );
    cancelledJobCount += 1;
  }

  return { cancelledJobCount, releasedCreditAmount };
}

export function createAccountDeletionRequest(
  pool,
  {
    actorOwnerId,
    idempotencyKey,
    mailReferenceId,
    operationHash,
    reason,
    targetOwnerId,
    verificationConfirmedAt,
    verificationRequestedAt,
    verifiedEmail,
  },
  {
    releaseCreditsInTransaction = releaseGenerationCreditsInTransaction,
  } = {},
) {
  return runCreditTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`administration:${actorOwnerId}:${idempotencyKey}`],
    );

    const replay = await existingAction(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertMatchingReplay(replay, operationHash);
      return requestFromRow(await readRequestByAction(client, replay.id), false);
    }

    const target = await lockTarget(client, targetOwnerId);
    if (target.id === actorOwnerId || target.is_site_owner) {
      throw new AdministrationError(
        "ADMIN_SITE_OWNER_DELETION_FORBIDDEN",
        "站长账户不能通过账户管理页面创建删除请求。",
        409,
      );
    }
    if (target.email.toLowerCase() !== verifiedEmail) {
      throw new AdministrationError(
        "ADMIN_DELETION_VERIFICATION_MISMATCH",
        "验证邮箱与该账户当前登记邮箱不一致，请重新验证。",
        409,
      );
    }
    await assertNoExistingRequest(client, targetOwnerId);
    const jobs = await lockActiveJobs(client, targetOwnerId);

    const administrativeActionId = randomUUID();
    const deletionRequestId = randomUUID();
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         previous_status, resulting_status, reason,
         idempotency_key, operation_hash
       ) VALUES (
         $1, $2, $3, 'create_account_deletion_request',
         $4, 'suspended', $5, $6, $7
       )`,
      [
        administrativeActionId,
        actorOwnerId,
        targetOwnerId,
        target.status,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    await client.query(
      `INSERT INTO account_deletion_requests (
         id, actor_owner_id, target_owner_id, administrative_action_id,
         verification_requested_at, verification_confirmed_at,
         mail_reference_id, deadline_at, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, now() + interval '30 days', $8, $9)`,
      [
        deletionRequestId,
        actorOwnerId,
        targetOwnerId,
        administrativeActionId,
        verificationRequestedAt,
        verificationConfirmedAt,
        mailReferenceId,
        idempotencyKey,
        operationHash,
      ],
    );
    await client.query(
      `INSERT INTO account_deletion_register (
         request_id, target_owner_id, state, deadline_at
       ) VALUES ($1, $2, 'processing', now() + interval '30 days')`,
      [deletionRequestId, targetOwnerId],
    );
    await client.query(
      `INSERT INTO account_deletion_steps (
         request_id, step_name, state, next_attempt_at
       ) VALUES
         ($1, 'wait_for_submitted_jobs', 'pending', now()),
         ($1, 'delete_private_objects', 'pending', now()),
         ($1, 'delete_creative_records', 'pending', now()),
         ($1, 'delete_external_identities', 'pending', now()),
         ($1, 'anonymize_goodgood_account', 'pending', now())`,
      [deletionRequestId],
    );
    await client.query(
      `UPDATE users
          SET status = 'suspended', updated_at = now()
        WHERE id = $1`,
      [targetOwnerId],
    );
    const revoked = await client.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, now())
        WHERE owner_id = $1 AND revoked_at IS NULL
        RETURNING id`,
      [targetOwnerId],
    );
    const cancellation = await cancelUnsubmittedJobs(client, {
      deletionRequestId,
      jobs,
      releaseCreditsInTransaction,
      targetOwnerId,
    });
    const updated = await client.query(
      `UPDATE account_deletion_requests
          SET revoked_session_count = $2,
              cancelled_job_count = $3,
              released_credit_amount = $4,
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [
        deletionRequestId,
        revoked.rowCount ?? 0,
        cancellation.cancelledJobCount,
        cancellation.releasedCreditAmount.toString(),
      ],
    );
    return requestFromRow(updated.rows[0], true);
  });
}
