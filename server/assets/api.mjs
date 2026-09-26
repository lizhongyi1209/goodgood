import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { presentGenerationJob } from "../generation/presenter.mjs";
import {
  findOwnerAsset,
  findOwnerAssetForDeletion,
  findOwnerAssetGenerationJobs,
} from "../generation/repository.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead, discardGeneratedAsset } from "../generation/storage.mjs";
import { readPrivateImagePreview } from "../images/private-preview.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

export class AssetRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AssetRequestError";
    this.code = code;
    this.retryable = false;
    this.status = status;
  }
}

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

export async function listAssets({
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const rows = await findOwnerAssetGenerationJobs(resources.pool, {
    ownerId,
    workspaceId,
  });
  return {
    batches: await Promise.all(
      rows.map((row) => presentGenerationJob(resources, row)),
    ),
  };
}

export async function getAssetDownloadUrl({
  assetId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  const asset = await findOwnerAsset(resources.pool, {
    assetId,
    ownerId,
    workspaceId,
  });
  if (!asset) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  return {
    url: await signAssetRead({
      bucket: resources.config.objectStorage.bucket,
      key: asset.object_key,
      publicStorage: resources.publicStorage,
    }),
  };
}

export async function readAssetPreview({
  assetId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  const resources = await getGenerationResources();
  const asset = await findOwnerAsset(resources.pool, { assetId, ownerId, workspaceId });
  if (!asset) throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  return readPrivateImagePreview({
    bucket: resources.config.objectStorage.bucket,
    key: asset.object_key,
    publicStorage: resources.publicStorage,
    storage: resources.storage,
  });
}

/**
 * Hard delete for one generated asset. The owning job and batch are retained so
 * settled credit-ledger entries and job history stay intact; only the asset row,
 * its organization metadata, and the stored object are removed.
 */
export async function deleteGeneratedAsset({
  assetId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
  resourcesOverride = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  const resources = resourcesOverride ?? await getGenerationResources();
  const asset = await findOwnerAssetForDeletion(resources.pool, {
    assetId,
    ownerId,
    workspaceId,
  });
  if (!asset) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  const client = await resources.pool.connect();
  try {
    await client.query("BEGIN");
    // asset_organization has no foreign key to assets, so it would silently
    // keep orphaned folder membership and tags.
    await client.query(
      `DELETE FROM asset_organization
        WHERE workspace_id = $1 AND owner_id = $2
          AND asset_kind = 'generated' AND asset_id = $3`,
      [asset.workspace_id, ownerId, assetId],
    );
    const removed = await client.query(
      `DELETE FROM assets WHERE id = $1 AND owner_id = $2 AND workspace_id = $3`,
      [assetId, ownerId, asset.workspace_id],
    );
    // A concurrent delete of the same image leaves nothing to remove; report it
    // rather than claiming a success that deleted no rows.
    if (!removed.rowCount) {
      throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  // Delete bytes only after the rows are durable; the reverse order could leave
  // a surviving row pointing at a missing object.
  await discardGeneratedAsset({
    bucket: resources.config.objectStorage.bucket,
    key: asset.object_key,
    storage: resources.storage,
  });
  return { id: assetId, deleted: true };
}

const UPLOADED_ASSET_TABLES = Object.freeze({
  reference: { table: "reference_assets", owner: "creator_owner_id",
    ready: "upload_state = 'ready' AND moderation_state = 'accepted' AND object_deleted_at IS NULL" },
  video: { table: "video_materials", owner: "owner_id", ready: "upload_state = 'ready'" },
  audio: { table: "audio_materials", owner: "owner_id", ready: "upload_state = 'ready'" },
});

/** Remove an owner-scoped upload. Reference rows remain as tombstones because
 * profiles and historical records can retain foreign keys to them. */
export async function deleteUploadedAsset({ kind, assetId, ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID, resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const source = Object.hasOwn(UPLOADED_ASSET_TABLES, kind) ? UPLOADED_ASSET_TABLES[kind] : null;
  if (!source || typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到该文件。", 404);
  }
  const resources = resourcesOverride ?? await getGenerationResources();
  const client = await resources.pool.connect();
  let objectKey;
  try {
    await client.query("BEGIN");
    const workspace = await resolveWorkspaceAccess(client, { ownerId, workspaceId, write: true });
    const found = await client.query(
      `SELECT object_key FROM ${source.table} WHERE id = $1 AND workspace_id = $2
        AND ${source.owner} = $3 AND ${source.ready} FOR UPDATE`,
      [assetId, workspace.id, ownerId],
    );
    if (!found.rowCount) throw new AssetRequestError("ASSET_NOT_FOUND", "未找到该文件。", 404);
    objectKey = found.rows[0].object_key;
    await client.query(
      `DELETE FROM asset_organization WHERE workspace_id = $1 AND owner_id = $2
        AND asset_kind = $3 AND asset_id = $4`,
      [workspace.id, ownerId, kind, assetId],
    );
    if (kind === "reference") {
      await client.query(
        `UPDATE reference_assets SET upload_state = 'expired', error_code = 'USER_DELETED',
          cleanup_eligible_at = now(), updated_at = now()
          WHERE id = $1 AND workspace_id = $2 AND creator_owner_id = $3`,
        [assetId, workspace.id, ownerId],
      );
    } else {
      await client.query(
        `DELETE FROM ${source.table} WHERE id = $1 AND workspace_id = $2 AND owner_id = $3`,
        [assetId, workspace.id, ownerId],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  // Hide the file durably before removing bytes, as in generated-asset deletion.
  try {
    await discardGeneratedAsset({ bucket: resources.config.objectStorage.bucket,
      key: objectKey, storage: resources.storage });
  } catch (error) {
    console.error(JSON.stringify({ event: "asset.uploaded_delete_storage_failed", kind,
      assetId, objectKey, message: error instanceof Error ? error.message : String(error) }));
    throw new AssetRequestError("ASSET_DELETE_INCOMPLETE",
      "文件已从资产中移除，但原文件清理失败，请联系支持处理。", 503);
  }
  if (kind === "reference") {
    await resources.pool.query(
      `UPDATE reference_assets SET object_deleted_at = now(), cleanup_eligible_at = NULL,
        updated_at = now() WHERE id = $1 AND creator_owner_id = $2
          AND upload_state = 'expired' AND error_code = 'USER_DELETED' AND object_deleted_at IS NULL`,
      [assetId, ownerId],
    );
  }
  return { id: assetId, deleted: true };
}

export function assetApiError(error, requestId = newRequestId()) {
  if (
    error instanceof AuthenticationError ||
    error instanceof AssetRequestError ||
    error instanceof OrganizationError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "asset.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "ASSET_LIBRARY_UNAVAILABLE",
        message: "资产库暂时无法读取，请重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
