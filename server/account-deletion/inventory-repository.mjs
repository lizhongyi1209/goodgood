import {
  createAccountDeletionInventoryEvidence,
} from "./inventory-contract.mjs";

export class AccountDeletionInventoryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionInventoryError";
    this.code = code;
  }
}

async function readRows(client, sql, targetOwnerId) {
  const result = await client.query(sql, [targetOwnerId]);
  return result.rows;
}

export async function readAccountDeletionInventory(pool, { requestId }) {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    transactionStarted = true;

    const scope = await client.query(
      `SELECT register.target_owner_id
         FROM account_deletion_register register
         JOIN account_deletion_requests request
           ON request.id = register.request_id
          AND request.target_owner_id = register.target_owner_id
         JOIN account_deletion_steps step
           ON step.request_id = register.request_id
          AND step.step_name = 'wait_for_submitted_jobs'
        WHERE register.request_id = $1
          AND register.state = 'processing'
          AND request.state = 'processing'
          AND step.state = 'completed'`,
      [requestId],
    );
    if (!scope.rowCount) {
      throw new AccountDeletionInventoryError(
        "ACCOUNT_DELETION_INVENTORY_NOT_READY",
        "The deletion request is unavailable or its submitted-job wait step is incomplete.",
      );
    }
    const targetOwnerId = scope.rows[0].target_owner_id;

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
    const assets = await readRows(
      client,
      "SELECT id FROM assets WHERE owner_id = $1 ORDER BY id",
      targetOwnerId,
    );
    const drafts = await readRows(
      client,
      "SELECT owner_id FROM creation_drafts WHERE owner_id = $1 ORDER BY owner_id",
      targetOwnerId,
    );
    const references = await readRows(
      client,
      "SELECT id FROM reference_assets WHERE owner_id = $1 ORDER BY id",
      targetOwnerId,
    );
    const privateObjects = await readRows(
      client,
      `SELECT object_key
         FROM (
           SELECT object_key
             FROM assets
            WHERE owner_id = $1 AND object_deleted_at IS NULL
           UNION
           SELECT object_key
             FROM reference_assets
            WHERE owner_id = $1 AND object_deleted_at IS NULL
         ) private_object
        ORDER BY object_key`,
      targetOwnerId,
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return createAccountDeletionInventoryEvidence({
      assets,
      drafts,
      generationBatches,
      generationJobs,
      privateObjects,
      projects,
      references,
    });
  } catch (error) {
    if (transactionStarted) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
