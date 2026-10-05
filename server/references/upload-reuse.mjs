import { createHash, randomUUID } from "node:crypto";
import { ReferenceRequestError } from "./errors.mjs";

export function referenceUploadClientKey(file) {
  return createHash("sha256").update(JSON.stringify([
    file.clientId, file.checksum, file.mimeType, file.byteSize, file.reuseExisting !== false,
  ])).digest("hex");
}
export function referenceUploadLockKey(workspaceId, ownerId, checksum) {
  return "goodgood:reference-upload:" + JSON.stringify([workspaceId, ownerId, checksum]);
}
export async function lockReferenceUpload(client, workspaceId, ownerId, checksum) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [referenceUploadLockKey(workspaceId, ownerId, checksum)]);
}
export function assertReferenceUploadChecksum(row, checksum) {
  if (row.declared_checksum && row.declared_checksum !== checksum) {
    throw new ReferenceRequestError("UPLOAD_CHECKSUM_MISMATCH", "图片文件与上传请求不一致，请重新选择文件。", 400);
  }
}

/** Called after workspace write authorization, within the upload transaction. */
export async function createReusableReferenceUpload(client, { file, ownerId, workspaceId, uploadTtlSeconds, newKey }) {
  await lockReferenceUpload(client, workspaceId, ownerId, file.checksum);
  const clientKey = referenceUploadClientKey(file);
  const existing = await client.query(
    `SELECT * FROM reference_assets
      WHERE workspace_id = $1 AND creator_owner_id = $2 AND object_deleted_at IS NULL
        AND ((upload_state = 'ready' AND moderation_state = 'accepted'
              AND (upload_client_key = $3 OR ($5 AND checksum = $4 AND detected_mime_type = $6 AND byte_size = $7)))
          OR (upload_state = 'pending' AND moderation_state = 'pending' AND expires_at > now()
              AND declared_checksum = $4 AND declared_mime_type = $6 AND declared_byte_size = $7
              AND (upload_client_key = $3 OR ($5 AND upload_reuse_existing))))
      ORDER BY CASE WHEN upload_client_key = $3 THEN 0 WHEN upload_state = 'ready' THEN 1 ELSE 2 END,
               created_at, id LIMIT 1 FOR UPDATE`,
    [workspaceId, ownerId, clientKey, file.checksum, file.reuseExisting !== false, file.mimeType, file.byteSize]);
  if (existing.rowCount) return { ...existing.rows[0], client_id: file.clientId };
  const id = randomUUID();
  const row = await client.query(
    `INSERT INTO reference_assets (id, owner_id, workspace_id, creator_owner_id, object_key,
       original_file_name, declared_mime_type, declared_byte_size, expires_at,
       declared_checksum, upload_client_key, upload_reuse_existing)
     VALUES ($1, $2, $3, $2, $4, $5, $6, $7, now() + ($8 * interval '1 second'), $9, $10, $11)
     RETURNING *`,
    [id, ownerId, workspaceId, newKey(`references/${workspaceId}/${ownerId}/${id}/original`),
      file.name, file.mimeType, file.byteSize, uploadTtlSeconds, file.checksum, clientKey, file.reuseExisting !== false]);
  return { ...row.rows[0], client_id: file.clientId };
}
