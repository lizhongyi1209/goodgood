import {
  createAccountDeletionInventoryEvidence,
} from "./inventory-contract.mjs";
import { lockReferenceLifecycle } from "../references/lifecycle-lock.mjs";

const SIGNED_UPLOAD_EXPIRY_GRACE_MILLISECONDS = 5 * 60 * 1_000;

async function readRows(client, sql, targetOwnerId) {
  const result = await client.query(sql, [targetOwnerId]);
  return result.rows;
}

function groupPrivateObjects(assetRows, referenceRows) {
  const objects = new Map();
  function add(kind, row) {
    let object = objects.get(row.object_key);
    if (!object) {
      object = { assetIds: [], objectKey: row.object_key, referenceIds: [] };
      objects.set(row.object_key, object);
    }
    object[kind].push(row.id);
  }
  for (const row of assetRows) add("assetIds", row);
  for (const row of referenceRows) add("referenceIds", row);
  return [...objects.values()]
    .map((object) => ({
      ...object,
      assetIds: object.assetIds.sort(),
      referenceIds: object.referenceIds.sort(),
    }))
    .sort((left, right) =>
      left.objectKey < right.objectKey
        ? -1
        : left.objectKey > right.objectKey
          ? 1
          : 0,
    );
}

async function readLockedInventory(client, targetOwnerId, now) {
  const projects = await readRows(
    client,
    "SELECT id FROM projects WHERE owner_id = $1 ORDER BY id",
    targetOwnerId,
  );
  const generationBatches = await readRows(
    client,
    "SELECT id FROM generation_batches WHERE owner_id = $1 ORDER BY id",
    targetOwnerId,
  );
  const generationJobs = await readRows(
    client,
    "SELECT id FROM generation_jobs WHERE owner_id = $1 ORDER BY id",
    targetOwnerId,
  );
  const assetRows = await readRows(
    client,
    `SELECT id, object_key, object_deleted_at
       FROM assets
      WHERE owner_id = $1
      ORDER BY id
      FOR UPDATE`,
    targetOwnerId,
  );
  const drafts = await readRows(
    client,
    "SELECT owner_id FROM creation_drafts WHERE owner_id = $1 ORDER BY owner_id",
    targetOwnerId,
  );
  const referenceRows = await readRows(
    client,
    `SELECT id, object_key, object_deleted_at, upload_state, expires_at
       FROM reference_assets
      WHERE owner_id = $1
      ORDER BY id
      FOR UPDATE`,
    targetOwnerId,
  );
  const liveObjects = groupPrivateObjects(
    assetRows.filter((row) => row.object_deleted_at === null),
    referenceRows.filter((row) => row.object_deleted_at === null),
  );
  const activeUploadKeys = new Set(
    referenceRows
      .filter(
        (row) =>
          row.object_deleted_at === null &&
          row.upload_state === "pending" &&
          new Date(row.expires_at).getTime() +
            SIGNED_UPLOAD_EXPIRY_GRACE_MILLISECONDS >
            now.getTime(),
      )
      .map((row) => row.object_key),
  );
  const objects = liveObjects.filter(
    (object) => !activeUploadKeys.has(object.objectKey),
  );
  const evidence = createAccountDeletionInventoryEvidence({
    assets: assetRows,
    drafts,
    generationBatches,
    generationJobs,
    privateObjects: liveObjects.map((object) => ({
      object_key: object.objectKey,
    })),
    projects,
    references: referenceRows,
  });
  return { evidence, objects, targetObjectCount: liveObjects.length };
}

export async function claimAccountDeletionObjectStep(
  pool,
  { leaseExpiresAt, now, objectLimit = 100, requestId = null, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockReferenceLifecycle(client);
    const claimed = await client.query(
      `WITH candidate AS (
         SELECT object_step.request_id
           FROM account_deletion_steps object_step
           JOIN account_deletion_register register
             ON register.request_id = object_step.request_id
           JOIN account_deletion_requests request
             ON request.id = object_step.request_id
            AND request.target_owner_id = register.target_owner_id
           JOIN account_deletion_steps wait_step
             ON wait_step.request_id = object_step.request_id
            AND wait_step.step_name = 'wait_for_submitted_jobs'
          WHERE object_step.step_name = 'delete_private_objects'
            AND register.state = 'processing'
            AND request.state = 'processing'
            AND wait_step.state = 'completed'
            AND ($4::uuid IS NULL OR object_step.request_id = $4::uuid)
            AND (
              (object_step.state = 'pending'
                AND (object_step.next_attempt_at IS NULL
                  OR object_step.next_attempt_at <= $1))
              OR (object_step.state = 'running'
                AND object_step.lease_expires_at <= $1)
            )
          ORDER BY register.deadline_at, object_step.request_id
          LIMIT 1
          FOR UPDATE OF object_step SKIP LOCKED
       )
       UPDATE account_deletion_steps object_step
          SET state = 'running',
              attempt_count = attempt_count + 1,
              last_attempt_at = $1,
              next_attempt_at = NULL,
              last_block_code = NULL,
              last_failed_object_count = 0,
              lease_owner = $2,
              lease_expires_at = $3,
              updated_at = $1
         FROM candidate, account_deletion_register register
        WHERE object_step.request_id = candidate.request_id
          AND object_step.step_name = 'delete_private_objects'
          AND register.request_id = candidate.request_id
       RETURNING object_step.request_id, register.target_owner_id`,
      [now, workerId, leaseExpiresAt, requestId],
    );
    if (!claimed.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const row = claimed.rows[0];
    const inventory = await readLockedInventory(
      client,
      row.target_owner_id,
      now,
    );
    await client.query(
      `UPDATE account_deletion_steps
          SET inventory_version = $3,
              inventory_sha256 = $4,
              last_target_object_count = $5,
              updated_at = $6
        WHERE request_id = $1
          AND step_name = 'delete_private_objects'
          AND lease_owner = $2`,
      [
        row.request_id,
        workerId,
        inventory.evidence.inventoryVersion,
        inventory.evidence.inventorySha256,
        inventory.targetObjectCount,
        now,
      ],
    );
    await client.query("COMMIT");
    return {
      inventorySha256: inventory.evidence.inventorySha256,
      inventoryVersion: inventory.evidence.inventoryVersion,
      objects: inventory.objects.slice(0, objectLimit),
      requestId: row.request_id,
      targetObjectCount: inventory.targetObjectCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordDeletedRows(
  client,
  { assetIds, now, objectKey, referenceIds, targetOwnerId },
) {
  if (assetIds.length) {
    await client.query(
      `UPDATE assets
          SET object_deleted_at = COALESCE(object_deleted_at, $4),
              updated_at = $4
        WHERE owner_id = $1 AND object_key = $2 AND id = ANY($3::uuid[])`,
      [targetOwnerId, objectKey, assetIds, now],
    );
    const verified = await client.query(
      `SELECT count(*)::int AS count
         FROM assets
        WHERE owner_id = $1 AND object_key = $2
          AND id = ANY($3::uuid[]) AND object_deleted_at IS NOT NULL`,
      [targetOwnerId, objectKey, assetIds],
    );
    if (verified.rows[0]?.count !== assetIds.length) {
      throw new Error("Generated-asset deletion evidence could not be recorded.");
    }
  }
  if (referenceIds.length) {
    await client.query(
      `UPDATE reference_assets
          SET object_deleted_at = COALESCE(object_deleted_at, $4),
              cleanup_error_code = NULL,
              cleanup_lease_owner = NULL,
              cleanup_lease_expires_at = NULL,
              updated_at = $4
        WHERE owner_id = $1 AND object_key = $2 AND id = ANY($3::uuid[])`,
      [targetOwnerId, objectKey, referenceIds, now],
    );
    const verified = await client.query(
      `SELECT count(*)::int AS count
         FROM reference_assets
        WHERE owner_id = $1 AND object_key = $2
          AND id = ANY($3::uuid[]) AND object_deleted_at IS NOT NULL`,
      [targetOwnerId, objectKey, referenceIds],
    );
    if (verified.rows[0]?.count !== referenceIds.length) {
      throw new Error("Reference deletion evidence could not be recorded.");
    }
  }
}

export async function markAccountDeletionObjectSucceeded(
  pool,
  { now, object, requestId, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT register.target_owner_id
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
        WHERE step.request_id = $1
          AND step.step_name = 'delete_private_objects'
          AND step.state = 'running'
          AND step.lease_owner = $2
          AND step.lease_expires_at > $3
        FOR UPDATE OF step`,
      [requestId, workerId, now],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return false;
    }
    await recordDeletedRows(client, {
      ...object,
      now,
      targetOwnerId: locked.rows[0].target_owner_id,
    });
    await client.query(
      `UPDATE account_deletion_steps
          SET deleted_object_count = deleted_object_count + 1,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'delete_private_objects'
          AND lease_owner = $2`,
      [requestId, workerId, now],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resolveAccountDeletionObjectStep(
  pool,
  { failedObjectCount, now, requestId, retryAt, workerId },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT register.target_owner_id
         FROM account_deletion_steps step
         JOIN account_deletion_register register
           ON register.request_id = step.request_id
        WHERE step.request_id = $1
          AND step.step_name = 'delete_private_objects'
          AND step.state = 'running'
          AND step.lease_owner = $2
          AND step.lease_expires_at > $3
        FOR UPDATE OF step`,
      [requestId, workerId, now],
    );
    if (!locked.rowCount) {
      await client.query("COMMIT");
      return { reason: "lost_lease", resolved: false };
    }
    const remaining = await client.query(
      `SELECT count(DISTINCT object_key)::int AS count
         FROM (
           SELECT object_key
             FROM assets
            WHERE owner_id = $1 AND object_deleted_at IS NULL
           UNION ALL
           SELECT object_key
             FROM reference_assets
            WHERE owner_id = $1 AND object_deleted_at IS NULL
         ) private_object`,
      [locked.rows[0].target_owner_id],
    );
    const remainingObjectCount = remaining.rows[0]?.count ?? 0;
    if (failedObjectCount > 0 || remainingObjectCount > 0) {
      await client.query(
        `UPDATE account_deletion_steps
            SET state = 'pending',
                next_attempt_at = $4,
                last_failed_object_count = $3,
                last_block_code = CASE
                  WHEN $3 > 0 THEN 'OBJECT_DELETE_FAILED'
                  ELSE NULL
                END,
                lease_owner = NULL,
                lease_expires_at = NULL,
                updated_at = $5
          WHERE request_id = $1
            AND step_name = 'delete_private_objects'
            AND lease_owner = $2`,
        [
          requestId,
          workerId,
          failedObjectCount,
          retryAt,
          now,
        ],
      );
      await client.query("COMMIT");
      return {
        remainingObjectCount,
        resolved: true,
        state: "pending",
      };
    }
    await client.query(
      `UPDATE account_deletion_steps
          SET state = 'completed',
              next_attempt_at = NULL,
              last_failed_object_count = 0,
              last_block_code = NULL,
              lease_owner = NULL,
              lease_expires_at = NULL,
              completed_at = $3,
              updated_at = $3
        WHERE request_id = $1
          AND step_name = 'delete_private_objects'
          AND lease_owner = $2`,
      [requestId, workerId, now],
    );
    await client.query("COMMIT");
    return { remainingObjectCount: 0, resolved: true, state: "completed" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
