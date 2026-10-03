import { createHash, randomUUID } from "node:crypto";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { reserveOrganizationGenerationCreditsInTransaction, settleOrganizationGenerationCreditsInTransaction } from "../organizations/credit-repository.mjs";
import { appendCreditEntryInTransaction, BillingPersistenceError } from "../billing/repository.mjs";
import { paymentFundedPortionForReservation } from "../billing/policy.mjs";
import { CREDIT_UNIT } from "../../shared/contracts/model-pricing.mjs";
import { IMAGE_CLEANUP_CREDIT_COST } from "../../shared/contracts/image-cleanup.mjs";
import { ImageCleanupError } from "./errors.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const amount = BigInt(IMAGE_CLEANUP_CREDIT_COST);
function resultFor(input, row) {
  if (!row || row.upload_state !== "ready" || row.moderation_state !== "accepted" || row.object_deleted_at) {
    throw new ImageCleanupError("IMAGE_CLEANUP_COPY_UNAVAILABLE", "本次处理已完成，但副本已不可用；重试不会再次收费。", 409);
  }
  return { requestId: input.requestId, chargedCredits: IMAGE_CLEANUP_CREDIT_COST,
    reference: { id: row.id, name: row.original_file_name, mimeType: row.detected_mime_type,
      width: row.pixel_width, height: row.pixel_height, byteSize: Number(row.byte_size) } };
}
export async function reserveImageCleanupCredits(client, workspace, ownerId, input, metadata, {
  append = appendCreditEntryInTransaction,
  reserveOrganization = reserveOrganizationGenerationCreditsInTransaction,
  settleOrganization = settleOrganizationGenerationCreditsInTransaction,
} = {}) {
  const key = `image-cleanup:${input.requestId}:reserve`;
  if (workspace.kind === "organization") {
    await reserveOrganization(client, { actorOwnerId: ownerId, amount,
      idempotencyKey: key, jobId: input.requestId, workspaceId: workspace.id, metadata,
      operationHash: hash({ id: input.requestId, type: "reserve", amount: IMAGE_CLEANUP_CREDIT_COST }), reason: "image_cleanup_reservation" });
    return async () => settleOrganization(client, {
      actor: "system", jobId: input.requestId, workspaceId: workspace.id,
      idempotencyKey: `image-cleanup:${input.requestId}:settle`, metadata,
      operationHash: hash({ id: input.requestId, type: "settle", amount: IMAGE_CLEANUP_CREDIT_COST }), reason: "image_cleanup_settlement" });
  }
  const account = (await client.query("SELECT * FROM credit_accounts WHERE owner_id=$1 AND unit=$2 FOR UPDATE", [ownerId, CREDIT_UNIT])).rows[0];
  const funded = account ? paymentFundedPortionForReservation({ available: account.available_balance,
    paymentFundedAvailable: account.payment_funded_available_balance ?? 0 }, amount) : null;
  if (funded === null) throw new BillingPersistenceError("INSUFFICIENT_POINTS", "积分不足，去除AI需要10积分。", 409);
  const reservation = await append(client, { accountRow: account, actor: "system",
    amount: -amount, paymentFundedAmount: -funded, entryType: "reserve", idempotencyKey: key, metadata,
    relatedImageCleanupId: input.requestId, reason: "image_cleanup_reservation" });
  return async () => {
    // Use the updated row, including reserved provenance, to close this reservation.
    const updated = (await client.query("SELECT * FROM credit_accounts WHERE id=$1 FOR UPDATE", [account.id])).rows[0];
    await append(client, { accountRow: updated, actor: "system", amount: -amount,
      paymentFundedAmount: -funded, entryType: "settle", idempotencyKey: `image-cleanup:${input.requestId}:settle`,
      priorEntryId: reservation.entry.id, relatedImageCleanupId: input.requestId, metadata, reason: "image_cleanup_settlement" });
  };
}

/** All DB writes and charge commit together; no running operation survives a rollback. */
export async function commitImageCleanup(pool, { ownerId, workspaceId = null, input, prepareCopy, resolveAccess = resolveWorkspaceAccess, reserveCredits = reserveImageCleanupCredits }) {
  const client = await pool.connect();
  let prepared, storageAttempted = false, committing = false;
  try {
    await client.query("BEGIN");
    const workspace = await resolveAccess(client, { ownerId, workspaceId, write: true });
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`image-cleanup:${input.requestId}`]);
    const fingerprint = hash(input);
    const existing = (await client.query("SELECT * FROM image_cleanup_operations WHERE id=$1 FOR UPDATE", [input.requestId])).rows[0];
    if (existing) {
      if (existing.owner_id !== ownerId || existing.workspace_id !== workspace.id || existing.input_hash !== fingerprint) {
        throw new ImageCleanupError("IMAGE_CLEANUP_CONFLICT", "本次操作编号已用于其他图片，请重新操作。", 409);
      }
      const copy = (await client.query("SELECT * FROM reference_assets WHERE id=$1 AND workspace_id=$2 AND creator_owner_id=$3", [existing.result_reference_id, workspace.id, ownerId])).rows[0];
      const result = resultFor(input, copy);
      committing = true; await client.query("COMMIT"); return result;
    }
    let projectName = null;
    if (input.projectId) {
      const project = (await client.query(`SELECT id,name FROM canvas_projects p
        WHERE id=$1 AND workspace_id=$2 AND owner_id=$3 AND NOT EXISTS
        (SELECT 1 FROM canvas_project_deletions d WHERE d.project_id=p.id AND d.workspace_id=p.workspace_id AND d.owner_id=p.owner_id) FOR UPDATE`,
      [input.projectId, workspace.id, ownerId])).rows[0];
      if (!project) throw new ImageCleanupError("IMAGE_CLEANUP_PROJECT_NOT_FOUND", "项目暂不可用，请刷新后重试。", 404);
      projectName = project.name;
    }
    const source = input.sourceKind === "reference"
      ? (await client.query(`SELECT * FROM reference_assets WHERE id=$1 AND workspace_id=$2 AND creator_owner_id=$3
          AND upload_state='ready' AND moderation_state='accepted' AND object_deleted_at IS NULL FOR UPDATE`, [input.sourceId, workspace.id, ownerId])).rows[0]
      : (await client.query(`SELECT a.id,a.object_key FROM assets a
          JOIN generation_jobs j ON j.id=a.job_id JOIN generation_batches b ON b.id=a.batch_id
          WHERE a.id=$1 AND a.workspace_id=$2 AND j.workspace_id=$2 AND b.workspace_id=$2
          AND a.owner_id=$3 AND j.owner_id=$3 AND b.owner_id=$3 AND j.state='succeeded' AND a.moderation_state='accepted' FOR UPDATE OF a`,
        [input.sourceId, workspace.id, ownerId])).rows[0];
    if (!source) throw new ImageCleanupError("IMAGE_CLEANUP_SOURCE_NOT_FOUND", "未找到可处理的原图，请等待上传完成或重新选择。", 404);
    await client.query(`INSERT INTO image_cleanup_operations(id,owner_id,workspace_id,canvas_project_id,source_kind,source_id,input_hash,state)
      VALUES($1,$2,$3,$4,$5,$6,$7,'running')`, [input.requestId, ownerId, workspace.id, input.projectId, input.sourceKind, input.sourceId, fingerprint]);
    const metadata = { activityCategory: "image_cleanup", imageCleanupId: input.requestId, batchReference: input.requestId,
      projectId: input.projectId, projectName, fixedCreditAmount: IMAGE_CLEANUP_CREDIT_COST };
    const settle = await reserveCredits(client, workspace, ownerId, input, metadata);
    const referenceId = randomUUID();
    prepared = await prepareCopy({ source, workspace, referenceId });
    storageAttempted = true; await prepared.storeObject();
    const f = prepared.file;
    const copy = (await client.query(`INSERT INTO reference_assets
      (id,owner_id,workspace_id,creator_owner_id,object_key,original_file_name,declared_mime_type,detected_mime_type,
       declared_byte_size,byte_size,pixel_width,pixel_height,checksum,upload_state,moderation_state,expires_at,uploaded_at,validated_at)
      VALUES($1,$2,$3,$2,$4,$5,$6,$6,$7,$7,$8,$9,$10,'ready','accepted',now()+interval '30 minutes',now(),now()) RETURNING *`,
    [referenceId, ownerId, workspace.id, prepared.objectKey, f.name, f.mimeType, f.byteSize, f.width, f.height, f.checksum])).rows[0];
    await settle();
    await client.query("UPDATE image_cleanup_operations SET state='succeeded',result_reference_id=$2,completed_at=now() WHERE id=$1", [input.requestId, referenceId]);
    const result = resultFor(input, copy);
    committing = true; await client.query("COMMIT"); return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    // A lost COMMIT reply may already have charged and published the copy. Retain
    // that object and let an identical request resolve its committed DB record.
    if (storageAttempted && !committing) {
      try { await prepared.deleteObject(); }
      catch { console.error(JSON.stringify({ event: "image_cleanup.rollback_object_cleanup_failed", operationId: input.requestId })); }
    }
    throw error;
  } finally { client.release(); }
}
