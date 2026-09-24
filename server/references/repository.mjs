import { randomUUID } from "node:crypto";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { ReferencePersistenceError } from "./errors.mjs";

export async function createPendingReferenceAssets(
  pool,
  { files, ownerId, uploadTtlSeconds, workspaceId = null, newKey = (key) => key },
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    const assets = [];
    for (const file of files) {
      const id = randomUUID();
      const objectKey = newKey(`references/${workspace.id}/${ownerId}/${id}/original`);
      const result = await client.query(
        `INSERT INTO reference_assets (
           id, owner_id, workspace_id, creator_owner_id, object_key,
           original_file_name, declared_mime_type,
           declared_byte_size, expires_at
         ) VALUES ($1, $2, $3, $2, $4, $5, $6, $7,
                   now() + ($8 * interval '1 second'))
         RETURNING *`,
        [
          id,
          ownerId,
          workspace.id,
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

export async function findReferenceAsset(
  pool,
  { ownerId, referenceId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT * FROM reference_assets
      WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3`,
    [referenceId, workspace.id, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function findReusableReferenceAssets(
  pool,
  { ownerId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT id, object_key, original_file_name, detected_mime_type,
            byte_size, pixel_width, pixel_height, uploaded_at
       FROM reference_assets
      WHERE workspace_id = $1 AND creator_owner_id = $2
        AND upload_state = 'ready'
        AND moderation_state = 'accepted'
        AND object_deleted_at IS NULL
      ORDER BY uploaded_at DESC NULLS LAST, created_at DESC, id DESC`,
    [workspace.id, ownerId],
  );
  return result.rows;
}

export async function markReferenceReady(
  pool,
  {
    byteSize,
    checksum,
    detectedMimeType,
    height,
    ownerId,
    referenceId,
    width,
    workspaceId = null,
  },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'ready', moderation_state = 'accepted',
            detected_mime_type = $4, byte_size = $5, pixel_width = $6,
            pixel_height = $7, checksum = $8, uploaded_at = now(),
            validated_at = now(), error_code = NULL, updated_at = now()
      WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
        AND upload_state = 'pending'
      RETURNING *`,
    [
      referenceId,
      workspace.id,
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
  { errorCode, ownerId, referenceId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'rejected', moderation_state = 'rejected',
            error_code = $4, validated_at = now(), updated_at = now()
      WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
        AND upload_state = 'pending'`,
    [referenceId, workspace.id, ownerId, errorCode],
  );
}

export async function markReferenceExpired(
  pool,
  { ownerId, referenceId, workspaceId = null },
) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  await pool.query(
    `UPDATE reference_assets
        SET upload_state = 'expired', error_code = 'UPLOAD_EXPIRED',
            updated_at = now()
      WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3
        AND upload_state = 'pending'`,
    [referenceId, workspace.id, ownerId],
  );
}

export async function findReadyReferences(
  pool,
  { lock = false, ownerId, referenceIds, workspaceId = null },
) {
  if (!referenceIds.length) return [];
  const workspace = await resolveWorkspaceAccess(pool, {
    ownerId,
    workspaceId,
    write: lock,
  });
  const result = await pool.query(
    `SELECT id, object_key, original_file_name
       FROM reference_assets
      WHERE workspace_id = $1 AND creator_owner_id = $2
        AND id = ANY($3::uuid[])
        AND upload_state = 'ready' AND moderation_state = 'accepted'
        AND object_deleted_at IS NULL
      ${lock ? "FOR SHARE" : ""}`,
    [workspace.id, ownerId, referenceIds],
  );
  const byId = new Map(result.rows.map((row) => [row.id, row]));
  return referenceIds.map((id) => byId.get(id)).filter(Boolean);
}
