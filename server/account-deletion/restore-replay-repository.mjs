import {
  expireAvailableCreditsInTransaction,
  releaseGenerationCreditsInTransaction,
} from "../billing/repository.mjs";
import {
  purgeOwnerCreativeGraphInTransaction,
} from "./creative-repository.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";

const STEP_NAMES = Object.freeze([
  "wait_for_submitted_jobs",
  "delete_private_objects",
  "delete_creative_records",
  "delete_external_identities",
  "anonymize_goodgood_account",
]);

export class AccountDeletionRestoreReplayError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionRestoreReplayError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AccountDeletionRestoreReplayError(code, message);
}

async function assertIdentityConsistency(client, record) {
  const registers = await client.query(
    `SELECT request_id, target_owner_id, state
       FROM account_deletion_register
      WHERE request_id = $1 OR target_owner_id = $2
      ORDER BY request_id
      FOR UPDATE`,
    [record.requestId, record.targetOwnerId],
  );
  if (
    registers.rows.some(
      (row) =>
        row.request_id !== record.requestId ||
        row.target_owner_id !== record.targetOwnerId,
    )
  ) {
    fail(
      "REGISTER_REPLAY_IDENTITY_CONFLICT",
      "The restore contains a conflicting deletion-register identity.",
    );
  }
  const requests = await client.query(
    `SELECT id, target_owner_id, state
       FROM account_deletion_requests
      WHERE id = $1 OR target_owner_id = $2
      ORDER BY id
      FOR UPDATE`,
    [record.requestId, record.targetOwnerId],
  );
  if (
    requests.rows.some(
      (row) =>
        row.id !== record.requestId ||
        row.target_owner_id !== record.targetOwnerId,
    )
  ) {
    fail(
      "REGISTER_REPLAY_REQUEST_CONFLICT",
      "The restore contains a conflicting deletion-request identity.",
    );
  }
  return {
    register: registers.rows[0] ?? null,
    request: requests.rows[0] ?? null,
  };
}

async function assertNotSiteOwner(client, targetOwnerId) {
  const result = await client.query(
    `SELECT 1
       FROM system_role_assignments
      WHERE owner_id = $1 AND role = 'site_owner'
      LIMIT 1`,
    [targetOwnerId],
  );
  if (result.rowCount) {
    fail(
      "REGISTER_REPLAY_SITE_OWNER_FORBIDDEN",
      "Site-owner deletion requires a separate reviewed recovery runbook.",
    );
  }
}

async function readOwner(client, targetOwnerId) {
  const result = await client.query(
    `SELECT id, email, status, anonymized_at
       FROM users
      WHERE id = $1
      FOR UPDATE`,
    [targetOwnerId],
  );
  return result.rows[0] ?? null;
}

async function upsertProcessingRegister(client, record, replayedAt) {
  await client.query(
    `INSERT INTO account_deletion_register (
       request_id, target_owner_id, state, deadline_at, completed_at,
       audit_retention_until, created_at, updated_at
     ) VALUES ($1, $2, 'processing', $3, NULL, NULL, $4, $5)
     ON CONFLICT (request_id) DO UPDATE
       SET target_owner_id = EXCLUDED.target_owner_id,
           state = 'processing',
           deadline_at = EXCLUDED.deadline_at,
           completed_at = NULL,
           audit_retention_until = NULL,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
    [
      record.requestId,
      record.targetOwnerId,
      record.deadlineAt,
      record.createdAt,
      replayedAt,
    ],
  );
}

async function ensurePendingSteps(client, record) {
  for (const stepName of STEP_NAMES) {
    await client.query(
      `INSERT INTO account_deletion_steps (
         request_id, step_name, state, next_attempt_at, created_at, updated_at
       ) VALUES ($1, $2, 'pending', $3, $4, $4)
       ON CONFLICT (request_id, step_name) DO NOTHING`,
      [record.requestId, stepName, record.createdAt, record.createdAt],
    );
  }
  await client.query(
    `UPDATE account_deletion_steps
        SET state = 'pending',
            next_attempt_at = COALESCE(next_attempt_at, $2),
            lease_owner = NULL,
            lease_expires_at = NULL,
            updated_at = $2
      WHERE request_id = $1 AND state = 'running'`,
    [record.requestId, record.createdAt],
  );
}

async function prepareCompletedReplay(client, record, replayedAt, sha256) {
  await upsertProcessingRegister(client, record, replayedAt);
  await client.query(
    "DELETE FROM account_deletion_steps WHERE request_id = $1",
    [record.requestId],
  );
  for (const stepName of STEP_NAMES) {
    const creative = stepName === "delete_creative_records";
    await client.query(
      `INSERT INTO account_deletion_steps (
         request_id, step_name, state, attempt_count, last_attempt_at,
         next_attempt_at, lease_owner, lease_expires_at, completed_at,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3::text, 1, $4::timestamptz, NULL, $5::text,
         CASE WHEN $3::text = 'running'
           THEN statement_timestamp() + interval '10 minutes' ELSE NULL END,
         CASE WHEN $3::text = 'completed' THEN $6::timestamptz ELSE NULL END,
         $7::timestamptz, $4::timestamptz
       )`,
      [
        record.requestId,
        stepName,
        creative ? "running" : "completed",
        replayedAt,
        creative ? `restore-replay:${sha256}` : null,
        record.completedAt,
        record.createdAt,
      ],
    );
  }
}

async function releaseRestoredReservations(
  client,
  { record, sha256 },
) {
  const reservations = await client.query(
    `SELECT job.id
       FROM generation_jobs job
       JOIN credit_ledger_entries reservation
         ON reservation.id = job.credit_reservation_entry_id
        AND reservation.entry_type = 'reserve'
      WHERE job.owner_id = $1
        AND NOT EXISTS (
          SELECT 1
            FROM credit_ledger_entries closed
           WHERE closed.prior_entry_id = reservation.id
             AND closed.entry_type IN ('settle', 'release')
        )
      ORDER BY job.id
      FOR UPDATE OF job`,
    [record.targetOwnerId],
  );
  let releasedCredits = 0n;
  for (const row of reservations.rows) {
    const release = await releaseGenerationCreditsInTransaction(client, {
      actor: "system",
      idempotencyKey: `restore-deletion-release:${record.requestId}:${row.id}`,
      jobId: row.id,
      metadata: {
        deletionRequestId: record.requestId,
        registerExportSha256: sha256,
        restoreReplay: true,
      },
      ownerId: record.targetOwnerId,
      reason: "restore_account_deletion_release",
    });
    releasedCredits += BigInt(release.entry?.amount ?? 0);
  }
  return releasedCredits;
}

async function expireAndCloseCredits(client, record, sha256, replayedAt) {
  const accounts = await client.query(
    `SELECT id, unit, reserved_balance
       FROM credit_accounts
      WHERE owner_id = $1
      ORDER BY unit
      FOR UPDATE`,
    [record.targetOwnerId],
  );
  if (accounts.rows.some((row) => row.unit !== "credit")) {
    fail(
      "REGISTER_REPLAY_CREDIT_UNIT_UNSUPPORTED",
      "The restore contains a credit unit without a deletion policy.",
    );
  }
  if (accounts.rows.some((row) => BigInt(row.reserved_balance) !== 0n)) {
    fail(
      "REGISTER_REPLAY_RESERVATION_REMAINS",
      "The restore still contains reserved credit after replay release.",
    );
  }
  let expiredCredits = 0n;
  for (const account of accounts.rows) {
    const expiry = await expireAvailableCreditsInTransaction(client, {
      actor: "system",
      idempotencyKey: `restore-account-deletion-expire:${record.requestId}`,
      metadata: {
        deletionRequestId: record.requestId,
        registerExportSha256: sha256,
        restoreReplay: true,
      },
      ownerId: record.targetOwnerId,
      reason: "restore_account_deletion_expiry",
      unit: account.unit,
    });
    expiredCredits += expiry.expiredAmount;
  }
  const closed = await client.query(
    `UPDATE credit_accounts
        SET status = 'closed', updated_at = $2
      WHERE owner_id = $1
        AND available_balance = 0
        AND reserved_balance = 0
      RETURNING id`,
    [record.targetOwnerId, replayedAt],
  );
  if (closed.rowCount !== accounts.rowCount) {
    fail(
      "REGISTER_REPLAY_CREDIT_CLOSE_INCOMPLETE",
      "The restore credit accounts did not close at zero.",
    );
  }
  return expiredCredits;
}

async function localResiduals(client, targetOwnerId) {
  const result = await client.query(
    `SELECT
       ((SELECT count(*) FROM projects WHERE owner_id = $1)
        + (SELECT count(*) FROM generation_batches WHERE owner_id = $1)
        + (SELECT count(*) FROM generation_jobs WHERE owner_id = $1)
        + (SELECT count(*) FROM assets WHERE owner_id = $1)
        + (SELECT count(*) FROM creation_drafts WHERE owner_id = $1)
        + (SELECT count(*) FROM reference_assets WHERE owner_id = $1))::int
          AS creative_records,
       (SELECT count(*)::int FROM auth_sessions WHERE owner_id = $1) AS sessions,
       (SELECT count(*)::int FROM auth_identities WHERE owner_id = $1) AS identities,
       (SELECT count(*)::int FROM credit_accounts
         WHERE owner_id = $1
           AND (status <> 'closed' OR available_balance <> 0 OR reserved_balance <> 0))
          AS open_credit_accounts`,
    [targetOwnerId],
  );
  return result.rows[0];
}

async function finalizeRegister(
  client,
  {
    deletedCreativeRecords,
    deletedIdentities,
    deletedPrivateObjects,
    deletedSessions,
    expiredCredits,
    preserveCounts = false,
    record,
  },
) {
  await client.query(
    `UPDATE account_deletion_steps
        SET state = 'completed',
            next_attempt_at = NULL,
            last_block_code = NULL,
            lease_owner = NULL,
            lease_expires_at = NULL,
            last_target_object_count = CASE
              WHEN $2 THEN last_target_object_count
              WHEN step_name = 'delete_private_objects' THEN $3 ELSE 0 END,
            deleted_object_count = CASE
              WHEN $2 THEN deleted_object_count
              WHEN step_name = 'delete_private_objects' THEN $3 ELSE 0 END,
            last_target_creative_record_count = CASE
              WHEN $2 THEN last_target_creative_record_count
              WHEN step_name = 'delete_creative_records' THEN $4 ELSE 0 END,
            deleted_creative_record_count = CASE
              WHEN $2 THEN deleted_creative_record_count
              WHEN step_name = 'delete_creative_records' THEN $4 ELSE 0 END,
            last_target_identity_count = CASE
              WHEN $2 THEN last_target_identity_count
              WHEN step_name = 'delete_external_identities' THEN $5 ELSE 0 END,
            disabled_identity_count = CASE
              WHEN $2 THEN disabled_identity_count
              WHEN step_name = 'delete_external_identities' THEN $5 ELSE 0 END,
            deleted_identity_count = CASE
              WHEN $2 THEN deleted_identity_count
              WHEN step_name = 'delete_external_identities' THEN $5 ELSE 0 END,
            deleted_local_session_count = CASE
              WHEN $2 THEN deleted_local_session_count
              WHEN step_name = 'anonymize_goodgood_account' THEN $6 ELSE 0 END,
            deleted_local_identity_count = CASE
              WHEN $2 THEN deleted_local_identity_count
              WHEN step_name = 'anonymize_goodgood_account' THEN $5 ELSE 0 END,
            expired_credit_amount = CASE
              WHEN $2 THEN expired_credit_amount
              WHEN step_name = 'anonymize_goodgood_account' THEN $7 ELSE 0 END,
            completed_at = COALESCE(completed_at, $8),
            updated_at = $9
      WHERE request_id = $1`,
    [
      record.requestId,
      preserveCounts,
      deletedPrivateObjects,
      deletedCreativeRecords,
      deletedIdentities,
      deletedSessions,
      expiredCredits.toString(),
      record.completedAt,
      record.updatedAt,
    ],
  );
  await client.query(
    `UPDATE account_deletion_requests
        SET mail_reference_id = 'anonymized-deletion-evidence',
            state = 'completed',
            deadline_at = $2,
            completed_at = $3,
            updated_at = $4
      WHERE id = $1`,
    [record.requestId, record.deadlineAt, record.completedAt, record.updatedAt],
  );
  await client.query(
    `UPDATE account_deletion_register
        SET state = 'completed',
            deadline_at = $3,
            completed_at = $4,
            audit_retention_until = $5,
            created_at = $6,
            updated_at = $7
      WHERE request_id = $1 AND target_owner_id = $2`,
    [
      record.requestId,
      record.targetOwnerId,
      record.deadlineAt,
      record.completedAt,
      record.auditRetentionUntil,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

async function replayProcessingRecord(client, record, replayedAt) {
  const consistency = await assertIdentityConsistency(client, record);
  if (consistency.register?.state === "completed") {
    fail(
      "REGISTER_REPLAY_STATE_REGRESSION",
      "A processing export cannot regress a completed restore register.",
    );
  }
  await assertNotSiteOwner(client, record.targetOwnerId);
  const owner = await readOwner(client, record.targetOwnerId);
  if (!owner) {
    fail(
      "REGISTER_REPLAY_PROCESSING_OWNER_MISSING",
      "A processing deletion target is absent from the restore.",
    );
  }
  if (owner.anonymized_at !== null) {
    fail(
      "REGISTER_REPLAY_PROCESSING_OWNER_ANONYMIZED",
      "A processing export conflicts with an anonymized restore owner.",
    );
  }
  await upsertProcessingRegister(client, record, replayedAt);
  await ensurePendingSteps(client, record);
  await client.query(
    `UPDATE users
        SET status = 'suspended', updated_at = $2
      WHERE id = $1`,
    [record.targetOwnerId, replayedAt],
  );
  await client.query(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, $2)
      WHERE owner_id = $1`,
    [record.targetOwnerId, replayedAt],
  );
  return { requestPresent: consistency.request !== null };
}

async function replayCompletedRecord(
  client,
  { record, replayedAt, sha256 },
) {
  await assertIdentityConsistency(client, record);
  await assertNotSiteOwner(client, record.targetOwnerId);
  const owner = await readOwner(client, record.targetOwnerId);
  if (!owner) {
    await upsertProcessingRegister(client, record, replayedAt);
    await ensurePendingSteps(client, record);
    await finalizeRegister(client, {
      deletedCreativeRecords: 0,
      deletedIdentities: 0,
      deletedPrivateObjects: 0,
      deletedSessions: 0,
      expiredCredits: 0n,
      record,
    });
    return { kind: "missing" };
  }

  const expectedEmail = `deleted-${record.requestId.replaceAll("-", "")}@deleted.goodgood.invalid`;
  if (owner.anonymized_at !== null) {
    const residuals = await localResiduals(client, record.targetOwnerId);
    if (
      owner.email !== expectedEmail ||
      owner.status !== "suspended" ||
      Object.values(residuals).some((value) => Number(value) !== 0)
    ) {
      fail(
        "REGISTER_REPLAY_LOCAL_STATE_INCONSISTENT",
        "An anonymized restore owner still has local identity or content state.",
      );
    }
    await upsertProcessingRegister(client, record, replayedAt);
    await ensurePendingSteps(client, record);
    await finalizeRegister(client, {
      deletedCreativeRecords: 0,
      deletedIdentities: 0,
      deletedPrivateObjects: 0,
      deletedSessions: 0,
      expiredCredits: 0n,
      preserveCounts: true,
      record,
    });
    return { kind: "already" };
  }

  await client.query(
    `UPDATE users
        SET status = 'suspended', updated_at = $2
      WHERE id = $1`,
    [record.targetOwnerId, replayedAt],
  );
  await client.query(
    `UPDATE auth_sessions
        SET revoked_at = COALESCE(revoked_at, $2)
      WHERE owner_id = $1`,
    [record.targetOwnerId, replayedAt],
  );
  await prepareCompletedReplay(client, record, replayedAt, sha256);
  await releaseRestoredReservations(client, { record, sha256 });
  await lockReferenceLifecycle(client);
  const creative = await purgeOwnerCreativeGraphInTransaction(client, {
    now: replayedAt,
    requestId: record.requestId,
    targetOwnerId: record.targetOwnerId,
  });
  const expiredCredits = await expireAndCloseCredits(
    client,
    record,
    sha256,
    replayedAt,
  );
  const sessions = await client.query(
    "DELETE FROM auth_sessions WHERE owner_id = $1 RETURNING id",
    [record.targetOwnerId],
  );
  const identities = await client.query(
    "DELETE FROM auth_identities WHERE owner_id = $1 RETURNING id",
    [record.targetOwnerId],
  );
  const anonymized = await client.query(
    `UPDATE users
        SET email = $2,
            locale = 'zh-CN',
            status = 'suspended',
            anonymized_at = $3,
            updated_at = $4
      WHERE id = $1 AND anonymized_at IS NULL
      RETURNING id`,
    [record.targetOwnerId, expectedEmail, record.completedAt, record.updatedAt],
  );
  if (anonymized.rowCount !== 1) {
    fail(
      "REGISTER_REPLAY_OWNER_ANONYMIZATION_INCOMPLETE",
      "The restore owner could not be anonymized.",
    );
  }
  await finalizeRegister(client, {
    deletedCreativeRecords: creative.deletedRecordCount,
    deletedIdentities: identities.rowCount,
    deletedPrivateObjects: creative.privateObjectCount,
    deletedSessions: sessions.rowCount,
    expiredCredits,
    record,
  });
  const residuals = await localResiduals(client, record.targetOwnerId);
  if (Object.values(residuals).some((value) => Number(value) !== 0)) {
    fail(
      "REGISTER_REPLAY_VERIFICATION_FAILED",
      "Local identity or content state remains after restore replay.",
    );
  }
  return {
    deletedCreativeRecords: creative.deletedRecordCount,
    deletedIdentities: identities.rowCount,
    deletedSessions: sessions.rowCount,
    expiredCredits,
    kind: "applied",
  };
}

export async function applyAccountDeletionRegisterReplay(
  pool,
  { records, replayedAt, sha256 },
) {
  if (!pool || typeof pool.connect !== "function") {
    throw new Error("A PostgreSQL pool is required");
  }
  const client = await pool.connect();
  const result = {
    alreadyApplied: 0,
    completedApplied: 0,
    deletedCreativeRecords: 0,
    deletedIdentities: 0,
    deletedSessions: 0,
    expiredCredits: 0n,
    missingOwners: 0,
    processingBlocked: 0,
  };
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    for (const record of records) {
      if (record.state === "processing") {
        await replayProcessingRecord(client, record, replayedAt);
        result.processingBlocked += 1;
        continue;
      }
      const replay = await replayCompletedRecord(client, {
        record,
        replayedAt,
        sha256,
      });
      if (replay.kind === "missing") result.missingOwners += 1;
      else if (replay.kind === "already") result.alreadyApplied += 1;
      else {
        result.completedApplied += 1;
        result.deletedCreativeRecords += replay.deletedCreativeRecords;
        result.deletedIdentities += replay.deletedIdentities;
        result.deletedSessions += replay.deletedSessions;
        result.expiredCredits += replay.expiredCredits;
      }
    }
    await client.query("COMMIT");
    return Object.freeze({
      ...result,
      expiredCredits: result.expiredCredits.toString(),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof AccountDeletionRestoreReplayError) throw error;
    fail(
      "REGISTER_REPLAY_TRANSACTION_FAILED",
      "The isolated restore replay transaction failed.",
    );
  } finally {
    client.release();
  }
}
