import { randomUUID } from "node:crypto";
import { ReferencePersistenceError } from "./errors.mjs";

export async function createPendingReferenceAssets(
  pool,
  { files, ownerId, uploadTtlSeconds },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const assets = [];
    for (const file of files) {
      const id = randomUUID();
      const objectKey = `references/${ownerId}/${id}/original`;
      const result = await client.query(
        `INSERT INTO reference_assets (
           id, owner_id, object_key, original_file_name, declared_mime_type,
           declared_byte_size, expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6,
                   now() + ($7 * interval '1 second'))
         RETURNING *`,
        [
          id,
          ownerId,
          objectKey,
          file.name,
          file.mimeType,
          file.byteSize,
          uploadTtlSeconds,
        ],
      );
      assets.push({ ...result.rows[0], client_id: file.clientId });
    }
    await client.query("COMMIT");
    return assets;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findReferenceAsset(pool, { ownerId, referenceId }) {
  const result = await pool.query(
    "SELECT * FROM reference_assets WHERE id = $1 AND owner_id = $2",
    [referenceId, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function markReferenceReady(
  pool,
  { byteSize, checksum, detectedMimeType, height, ownerId, referenceId, width },
) {
  const result = await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'ready', moderation_state = 'accepted',
            detected_mime_type = $3, byte_size = $4, pixel_width = $5,
            pixel_height = $6, checksum = $7, uploaded_at = now(),
            validated_at = now(), error_code = NULL, updated_at = now()
      WHERE id = $1 AND owner_id = $2 AND upload_state = 'pending'
      RETURNING *`,
    [
      referenceId,
      ownerId,
      detectedMimeType,
      byteSize,
      width,
      height,
      checksum,
    ],
  );
  if (!result.rowCount) {
    throw new ReferencePersistenceError(
      "REFERENCE_STATE_CONFLICT",
      "参考图上传状态已发生变化，请刷新后重试。",
      409,
    );
  }
  return result.rows[0];
}

export async function markReferenceRejected(
  pool,
  { errorCode, ownerId, referenceId },
) {
  await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'rejected', moderation_state = 'rejected',
            error_code = $3, validated_at = now(), updated_at = now()
      WHERE id = $1 AND owner_id = $2 AND upload_state = 'pending'`,
    [referenceId, ownerId, errorCode],
  );
}

export async function markReferenceExpired(pool, { ownerId, referenceId }) {
  await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'expired', error_code = 'UPLOAD_EXPIRED',
            updated_at = now()
      WHERE id = $1 AND owner_id = $2 AND upload_state = 'pending'`,
    [referenceId, ownerId],
  );
}

export async function findReadyReferences(
  pool,
  { lock = false, ownerId, referenceIds },
) {
  if (!referenceIds.length) return [];
  const result = await pool.query(
    `SELECT id, object_key, original_file_name
       FROM reference_assets
      WHERE owner_id = $1 AND id = ANY($2::uuid[])
        AND upload_state = 'ready' AND moderation_state = 'accepted'
        AND object_deleted_at IS NULL
      ${lock ? "FOR SHARE" : ""}`,
    [ownerId, referenceIds],
  );
  const byId = new Map(result.rows.map((row) => [row.id, row]));
  return referenceIds.map((id) => byId.get(id)).filter(Boolean);
}
