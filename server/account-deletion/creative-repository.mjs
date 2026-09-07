import {
  createAccountDeletionInventoryEvidence,
} from "./inventory-contract.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";

export class AccountDeletionCreativeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionCreativeError";
    this.code = code;
  }
}

async function readRows(client, sql, targetOwnerId) {
  const result = await client.query(sql, [targetOwnerId]);
  return result.rows;
}

async function readCreativeGraph(client, targetOwnerId, { lock = false } = {}) {
  const suffix = lock ? " FOR UPDATE" : "";
  const projects = await readRows(
    client,
    `SELECT id FROM projects WHERE owner_id = $1 ORDER BY id${suffix}`,
    targetOwnerId,
  );
  const generationBatches = await readRows(
    client,
    `SELECT id FROM generation_batches WHERE owner_id = $1 ORDER BY id${suffix}`,
    targetOwnerId,
  );
  const generationJobs = await readRows(
    client,
    `SELECT id FROM generation_jobs WHERE owner_id = $1 ORDER BY id${suffix}`,
    targetOwnerId,
  );
  const assets = await readRows(
    client,
    `SELECT id, object_key, object_deleted_at
       FROM assets
      WHERE owner_id = $1
      ORDER BY id${suffix}`,
    targetOwnerId,
  );
  const drafts = await readRows(
    client,
    `SELECT owner_id FROM creation_drafts
      WHERE owner_id = $1 ORDER BY owner_id${suffix}`,
    targetOwnerId,
  );
  const references = await readRows(
    client,
    `SELECT id, object_key, object_deleted_at
       FROM reference_assets
      WHERE owner_id = $1
      ORDER BY id${suffix}`,
    targetOwnerId,
  );
  const generationAttempts = await readRows(
    client,
    `SELECT attempt.id
       FROM generation_attempts attempt
       JOIN generation_jobs job ON job.id = attempt.job_id
      WHERE job.owner_id = $1
      ORDER BY attempt.id${lock ? " FOR UPDATE OF attempt" : ""}`,
    targetOwnerId,
  );
  const generationEvents = await readRows(
    client,
    `SELECT event.id
       FROM generation_job_events event
       JOIN generation_jobs job ON job.id = event.job_id
      WHERE job.owner_id = $1
      ORDER BY event.id${lock ? " FOR UPDATE OF event" : ""}`,
    targetOwnerId,
  );
  const queueRows = await readRows(
    client,
    `SELECT outbox.id
       FROM generation_queue_outbox outbox
       JOIN generation_jobs job ON job.id = outbox.job_id
      WHERE job.owner_id = $1
      ORDER BY outbox.id${lock ? " FOR UPDATE OF outbox" : ""}`,
    targetOwnerId,
  );
  const privateObjects = [
    ...assets.filter((row) => row.object_deleted_at === null),
    ...references.filter((row) => row.object_deleted_at === null),
  ]
    .map((row) => row.object_key)
    .filter((objectKey, index, keys) => keys.indexOf(objectKey) === index)
    .sort()
    .map((object_key) => ({ object_key }));
  const evidence = createAccountDeletionInventoryEvidence({
    assets,
    drafts,
    generationBatches,
    generationJobs,
    privateObjects,
    projects,
    references,
  });
  return {
    evidence,
    targetRecordCount:
      projects.length +
      generationBatches.length +
      generationJobs.length +
      assets.length +
      drafts.length +
      references.length +
      generationAttempts.length +
      generationEvents.length +
      queueRows.length,
  };
}

async function assertCreativeGraphIntegrity(client, targetOwnerId) {
  const result = await client.query(
    `SELECT (
       EXISTS (
         SELECT 1
           FROM generation_batches batch
           JOIN projects project ON project.id = batch.project_id
          WHERE batch.owner_id = $1 AND project.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM generation_jobs job
           JOIN generation_batches batch ON batch.id = job.batch_id
          WHERE job.owner_id = $1 AND batch.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM generation_jobs job
           JOIN generation_jobs source ON source.id = job.retry_of_job_id
          WHERE job.owner_id = $1 AND source.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM assets asset
           JOIN generation_jobs job ON job.id = asset.job_id
           JOIN generation_batches batch ON batch.id = asset.batch_id
          WHERE asset.owner_id = $1
            AND (
              job.owner_id <> $1
              OR batch.owner_id <> $1
              OR job.batch_id <> asset.batch_id
            )
       ) OR EXISTS (
         SELECT 1
           FROM generation_batches batch
           JOIN projects project ON project.id = batch.project_id
          WHERE project.owner_id = $1 AND batch.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM generation_jobs job
           JOIN generation_batches batch ON batch.id = job.batch_id
          WHERE batch.owner_id = $1 AND job.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM generation_jobs job
           JOIN generation_jobs source ON source.id = job.retry_of_job_id
          WHERE source.owner_id = $1 AND job.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM assets asset
           JOIN generation_jobs job ON job.id = asset.job_id
          WHERE job.owner_id = $1 AND asset.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM assets asset
           JOIN generation_batches batch ON batch.id = asset.batch_id
          WHERE batch.owner_id = $1 AND asset.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM credit_ledger_entries ledger
           JOIN generation_jobs job ON job.id = ledger.related_job_id
          WHERE job.owner_id = $1 AND ledger.owner_id <> $1
       ) OR EXISTS (
         SELECT 1
           FROM credit_ledger_entries ledger
           JOIN generation_jobs job ON job.id = ledger.related_job_id
          WHERE ledger.owner_id = $1 AND job.owner_id <> $1
       )
     ) AS invalid`,
    [targetOwnerId],
  );
  if (result.rows[0]?.invalid) {
    throw new AccountDeletionCreativeError(
      "CREATIVE_GRAPH_INVALID",
      "The owner-scoped creative graph violates its ownership boundary.",
    );
  }
}

export async function claimAccountDeletionCreativeStep(
  pool,
  { leaseExpiresAt, now, requestId = null, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      `WITH candidate AS (
         SELECT creative_step.request_id
           FROM account_deletion_steps creative_step
           JOIN account_deletion_register register
             ON register.request_id = creative_step.request_id
           JOIN account_deletion_requests request
             ON request.id = creative_step.request_id
            AND request.target_owner_id = register.target_owner_id
           JOIN account_deletion_steps object_step
             ON object_step.request_id = creative_step.request_id
            AND object_step.step_name = 'delete_private_objects'
          WHERE creative_step.step_name = 'delete_creative_records'
            AND register.state = 'processing'
            AND request.state = 'processing'
            AND object_step.state = 'completed'
            AND ($4::uuid IS NULL OR creative_step.request_id = $4::uuid)
            AND (
              (creative_step.state = 'pending'
                AND (creative_step.next_attempt_at IS NULL
                  OR creative_step.next_attempt_at <= $1))
              OR (creative_step.state = 'running'
                AND creative_step.lease_expires_at <= $1)
            )
          ORDER BY register.deadline_at, creative_step.request_id
          LIMIT 1
          FOR UPDATE OF creative_step SKIP LOCKED
       )
       UPDATE account_deletion_steps creative_step
          SET state = 'running',
              attempt_count = attempt_count + 1,
              last_attempt_at = $1,
              next_attempt_at = NULL,
              last_block_code = NULL,
              last_failed_creative_record_count = 0,
              lease_owner = $2,
              lease_expires_at = $3,
              updated_at = $1
         FROM candidate, account_deletion_register register
        WHERE creative_step.request_id = candidate.request_id
          AND creative_step.step_name = 'delete_creative_records'
          AND register.request_id = candidate.request_id
       RETURNING creative_step.request_id, register.target_owner_id`,
      [now, workerId, leaseExpiresAt, requestId],
    );
    if (!claimed.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const row = claimed.rows[0];
    await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [row.target_owner_id],
    );
    await lockReferenceLifecycle(client);
    const graph = await readCreativeGraph(client, row.target_owner_id, {
      lock: true,
    });
    await client.query(
      `UPDATE account_deletion_steps
          SET inventory_version = $3,
              inventory_sha256 = $4,
              last_target_creative_record_count = $5,
              updated_at = $6
        WHERE request_id = $1
          AND step_name = 'delete_creative_records'
          AND lease_owner = $2`,
      [
        row.request_id,
        workerId,
        graph.evidence.inventoryVersion,
        graph.evidence.inventorySha256,
        graph.targetRecordCount,
        now,
      ],
    );
    await client.query("COMMIT");
    return {
      inventorySha256: graph.evidence.inventorySha256,
      inventoryVersion: graph.evidence.inventoryVersion,
      requestId: row.request_id,
      targetRecordCount: graph.targetRecordCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteRows(client, sql, targetOwnerId) {
  const result = await client.query(sql, [targetOwnerId]);
  return result.rowCount ?? 0;
}

export async function purgeOwnerCreativeGraphInTransaction(
  client,
  { graph = null, now, requestId, targetOwnerId },
) {
  const lockedGraph = graph ?? await readCreativeGraph(client, targetOwnerId, {
    lock: true,
  });
  await assertCreativeGraphIntegrity(client, targetOwnerId);

  await client.query(
    `UPDATE credit_ledger_entries ledger
        SET related_job_id = NULL,
            account_deletion_request_id = $2,
            creative_link_deleted_at = $3
       FROM generation_jobs job
      WHERE ledger.related_job_id = job.id
        AND job.owner_id = $1
        AND ledger.owner_id = $1
        AND ledger.creative_link_deleted_at IS NULL`,
    [targetOwnerId, requestId, now],
  );
  await client.query(
    `UPDATE generation_jobs
        SET retry_of_job_id = NULL
      WHERE owner_id = $1 AND retry_of_job_id IS NOT NULL`,
    [targetOwnerId],
  );
  await client.query(
    `UPDATE content_reports
        SET state = 'resolved', resolution = 'removed', resolved_at = $2,
            retention_until = $2::timestamptz + interval '12 months',
            updated_at = $2
      WHERE target_owner_id = $1 AND state = 'open'`,
    [targetOwnerId, now],
  );

  let deletedRecordCount = 0;
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM assets WHERE owner_id = $1",
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    `DELETE FROM generation_job_events event
      USING generation_jobs job
      WHERE event.job_id = job.id AND job.owner_id = $1`,
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    `DELETE FROM generation_attempts attempt
      USING generation_jobs job
      WHERE attempt.job_id = job.id AND job.owner_id = $1`,
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    `DELETE FROM generation_queue_outbox outbox
      USING generation_jobs job
      WHERE outbox.job_id = job.id AND job.owner_id = $1`,
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM generation_jobs WHERE owner_id = $1",
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM generation_batches WHERE owner_id = $1",
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM projects WHERE owner_id = $1",
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM creation_drafts WHERE owner_id = $1",
    targetOwnerId,
  );
  deletedRecordCount += await deleteRows(
    client,
    "DELETE FROM reference_assets WHERE owner_id = $1",
    targetOwnerId,
  );

  if (deletedRecordCount !== lockedGraph.targetRecordCount) {
    throw new AccountDeletionCreativeError(
      "CREATIVE_DELETE_INCOMPLETE",
      "The owner-scoped creative graph was not deleted completely.",
    );
  }
  const remaining = await readCreativeGraph(client, targetOwnerId);
  if (remaining.targetRecordCount !== 0) {
    throw new AccountDeletionCreativeError(
      "CREATIVE_DELETE_INCOMPLETE",
      "Creative records remain after the deletion transaction.",
    );
  }
  return Object.freeze({
    deletedRecordCount,
    privateObjectCount: lockedGraph.evidence.counts.privateObjects,
  });
}

export async function deleteAccountDeletionCreativeRecords(
  pool,
  { inventorySha256, now, requestId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT register.target_owner_id, step.inventory_sha256
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
         JOIN account_deletion_requests request
           ON request.id = step.request_id
          AND request.target_owner_id = register.target_owner_id
         JOIN account_deletion_steps object_step
           ON object_step.request_id = step.request_id
          AND object_step.step_name = 'delete_private_objects'
          AND object_step.state = 'completed'
        WHERE step.request_id = $1
          AND step.step_name = 'delete_creative_records'
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
      return { completed: false, reason: "lost_lease" };
    }
    const targetOwnerId = locked.rows[0].target_owner_id;
    await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [targetOwnerId],
    );
    await lockReferenceLifecycle(client);
    const graph = await readCreativeGraph(client, targetOwnerId, { lock: true });
    if (
      graph.evidence.inventorySha256 !== inventorySha256 ||
      locked.rows[0].inventory_sha256 !== inventorySha256
    ) {
      throw new AccountDeletionCreativeError(
        "CREATIVE_INVENTORY_DRIFT",
        "The owner-scoped creative inventory changed after it was claimed.",
      );
    }
    if (graph.evidence.counts.privateObjects !== 0) {
      throw new AccountDeletionCreativeError(
        "PRIVATE_OBJECTS_REMAIN",
        "Private object evidence remains before creative record deletion.",
      );
    }
    const { deletedRecordCount } =
      await purgeOwnerCreativeGraphInTransaction(client, {
        graph,
        now,
        requestId,
        targetOwnerId,
      });
    await client.query(
      `UPDATE account_deletion_steps
          SET state = 'completed',
              next_attempt_at = NULL,
              last_block_code = NULL,
              lease_owner = NULL,
              lease_expires_at = NULL,
              deleted_creative_record_count = $4,
              last_failed_creative_record_count = 0,
              completed_at = $3,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'delete_creative_records'
          AND lease_owner = $2`,
      [requestId, workerId, now, deletedRecordCount],
    );
    await client.query("COMMIT");
    return { completed: true, deletedRecordCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deferAccountDeletionCreativeStep(
  pool,
  { failedRecordCount, now, requestId, retryAt, workerId },
) {
  const result = await pool.query(
    `UPDATE account_deletion_steps
        SET state = 'pending',
            next_attempt_at = $4,
            last_block_code = 'CREATIVE_DELETE_FAILED',
            last_failed_creative_record_count = $3,
            lease_owner = NULL,
            lease_expires_at = NULL,
            updated_at = $5
      WHERE request_id = $1
        AND step_name = 'delete_creative_records'
        AND state = 'running'
        AND lease_owner = $2
        AND lease_expires_at > $5`,
    [requestId, workerId, failedRecordCount, retryAt, now],
  );
  return result.rowCount === 1;
}
