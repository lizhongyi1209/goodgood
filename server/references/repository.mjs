import { randomUUID } from "node:crypto";
import { createReusableReferenceUpload, lockReferenceUpload } from "./upload-reuse.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { ReferencePersistenceError, ReferenceRequestError } from "./errors.mjs";

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
    // Acquire all content locks in order for multi-file requests, avoiding lock inversions.
    for (const checksum of [...new Set(files.map((file) => file.checksum).filter(Boolean))].sort()) {
      await lockReferenceUpload(client, workspace.id, ownerId, checksum);
    }
    const assets = [];
    for (const file of files) {
      if (file.checksum) {
        assets.push(await createReusableReferenceUpload(client, { file, ownerId, workspaceId: workspace.id, uploadTtlSeconds, newKey }));
        continue;
      }
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

/**
 * The derived reference ID is stable for one generated asset. Keep the source
 * authorization check, image preparation and object write in one transaction.
 * Concurrent connections reuse the existing reference before reading or decoding
 * the original image, rather than only avoiding duplicate object writes.
 */
export async function createReadyReferenceFromGeneratedAsset(
  pool,
  { assetId, ownerId, referenceId, objectKey, workspaceId = null, prepareReference },
) {
  const client = await pool.connect();
  let stored = false;
  let committing = false;
  let preparedReference;
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, {
      ownerId,
      workspaceId,
      write: true,
    });
    const source = await client.query(
      `SELECT a.id FROM assets a
         JOIN generation_jobs j ON j.id = a.job_id
         JOIN generation_batches b ON b.id = a.batch_id
        WHERE a.id = $1 AND a.owner_id = $2 AND j.owner_id = $2
          AND b.owner_id = $2 AND a.workspace_id = $3
          AND j.workspace_id = $3 AND b.workspace_id = $3
          AND j.state = 'succeeded' AND a.moderation_state = 'accepted'
        FOR UPDATE OF a`,
      [assetId, ownerId, workspace.id],
    );
    if (!source.rowCount) {
      throw new ReferenceRequestError("ASSET_NOT_FOUND", "未找到可用的生成图片。", 404);
    }

    const existing = await client.query(
      "SELECT * FROM reference_assets WHERE id = $1 FOR UPDATE",
      [referenceId],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.workspace_id === workspace.id && row.creator_owner_id === ownerId &&
          row.object_key === objectKey && row.upload_state === "ready" &&
          row.moderation_state === "accepted" && !row.object_deleted_at) {
        await client.query("COMMIT");
        return row;
      }
      throw new ReferenceRequestError(
        "REFERENCE_CONFLICT",
        "该图片的参考图记录已不可用，请重新选择图片。",
        409,
      );
    }

    preparedReference = await prepareReference();
    const file = preparedReference.file;
    await preparedReference.storeObject();
    stored = true;
    const inserted = await client.query(
      `INSERT INTO reference_assets (
         id, owner_id, workspace_id, creator_owner_id, object_key,
         original_file_name, declared_mime_type, detected_mime_type,
         declared_byte_size, byte_size, pixel_width, pixel_height, checksum,
         upload_state, moderation_state, expires_at, uploaded_at, validated_at
       ) VALUES ($1, $2, $3, $2, $4, $5, $6, $6, $7, $7, $8, $9, $10,
                 'ready', 'accepted', now() + interval '30 minutes', now(), now())
       RETURNING *`,
      [referenceId, ownerId, workspace.id, objectKey, file.name, file.mimeType,
        file.byteSize, file.width, file.height, file.checksum],
    );
    committing = true;
    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (error) {
    if (stored && !committing) {
      try { await preparedReference.deleteObject(); } catch (cleanupError) {
        console.error(JSON.stringify({ event: "reference.generated_copy_cleanup_failed",
          referenceId, message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) }));
      }
    }
    await client.query("ROLLBACK").catch(() => {});
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
        AND upload_state = 'pending' AND expires_at > now()
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
    // Two consumers may complete the same shared pending original concurrently.
    const ready = await findReferenceAsset(pool, { ownerId, referenceId, workspaceId });
    if (ready?.upload_state === "ready" && ready.moderation_state === "accepted" && !ready.object_deleted_at &&
        ready.checksum === checksum && Number(ready.byte_size) === byteSize && ready.detected_mime_type === detectedMimeType) return ready;
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
