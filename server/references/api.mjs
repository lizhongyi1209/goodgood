import { createHash } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import {
  getGenerationResources,
  prepareObjectStorage,
} from "../generation/resources.mjs";
import { findOwnerAsset } from "../generation/repository.mjs";
import { readPrivateObject } from "../generation/storage.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { REFERENCE_LIMITS } from "./constants.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import {
  ReferencePersistenceError,
  ReferenceRequestError,
} from "./errors.mjs";
import {
  createPendingReferenceAssets,
  createReadyReferenceFromGeneratedAsset,
  findReferenceAsset,
  findReusableReferenceAssets,
  markReferenceExpired,
  markReferenceReady,
  markReferenceRejected,
} from "./repository.mjs";
import { readPrivateImagePreview } from "../images/private-preview.mjs";
import { newLocalCloudReferenceKey } from "../generation/local-cloud-reference.mjs";
import { privateImageUrls } from "../../shared/private-image-urls.mjs";
import { deleteReferenceObject, readReferenceObject, signReferenceUpload, storeReferenceObject } from "./storage.mjs";
import { GENERATED_REFERENCE_SOURCE_LIMIT_BYTES, generatedAssetReferenceImage } from "./generated-asset-image.mjs";
import {
  inspectReferenceImage,
  validateReferenceIds,
  validateReferenceUploadRequest,
} from "./validation.mjs";

const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function publicReference(row) {
  return {
    height: row.pixel_height ?? undefined,
    id: row.id,
    mimeType: row.detected_mime_type ?? undefined,
    name: row.original_file_name,
    status: row.upload_state === "ready" ? "ready" : row.upload_state,
    width: row.pixel_width ?? undefined,
  };
}

function publicReusableReference(row) {
  return {
    byteSize: Number(row.byte_size ?? 0),
    height: Number(row.pixel_height ?? 0),
    id: row.id,
    mimeType: row.detected_mime_type,
    name: row.original_file_name,
    status: "ready",
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    url: privateImageUrls("reference", row.id).contentUrl,
    previewUrl: privateImageUrls("reference", row.id).previewUrl,
    width: Number(row.pixel_width ?? 0),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generatedReferenceId(assetId, revision) {
  const digest = Buffer.from(createHash("sha256").update(`goodgood:generated-reference:v1:${assetId}:${revision}`).digest().subarray(0, 16));
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Copy one owner-scoped generated output into the ready reference collection. */
export async function createReferenceFromGeneratedAsset({
  assetId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new ReferenceRequestError("ASSET_NOT_FOUND", "未找到可用的生成图片。", 404);
  }
  const normalizedAssetId = assetId.toLowerCase();
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const asset = await findOwnerAsset(resources.pool, {
    assetId: normalizedAssetId, ownerId, workspaceId,
  });
  if (!asset) throw new ReferenceRequestError("ASSET_NOT_FOUND", "未找到可用的生成图片。", 404);

  let referenceId;
  let objectKey;
  // A user may delete a derived reference while keeping its source image.
  // Move to the next stable slot rather than reviving the deleted tombstone.
  for (let revision = 0; revision < 32; revision += 1) {
    const candidateId = generatedReferenceId(normalizedAssetId, revision);
    const candidateKey = newLocalCloudReferenceKey(
      `references/${workspace.id}/${ownerId}/${candidateId}/original`,
      resources.config.cloudReference,
    );
    const existing = await findReferenceAsset(resources.pool, {
      ownerId, referenceId: candidateId, workspaceId,
    });
    if (existing?.object_key === candidateKey && existing.upload_state === "ready" &&
        existing.moderation_state === "accepted" && !existing.object_deleted_at) {
      return { id: existing.id, name: existing.original_file_name, status: "ready" };
    }
    if (!existing) {
      referenceId = candidateId;
      objectKey = candidateKey;
      break;
    }
  }
  if (!referenceId || !objectKey) {
    throw new ReferenceRequestError("REFERENCE_CONFLICT", "该图片的参考图记录已达到可用上限。", 409);
  }

  let object;
  try {
    object = await readPrivateObject({
      bucket: resources.config.objectStorage.bucket,
      key: asset.object_key,
      maxBytes: GENERATED_REFERENCE_SOURCE_LIMIT_BYTES,
      storage: resources.storage,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Private object exceeds the allowed size.") {
      throw new ReferenceRequestError("ASSET_TOO_LARGE", "生成图片过大，无法作为参考图。", 413);
    }
    throw error;
  }
  const image = await generatedAssetReferenceImage(object.bytes);
  const checksum = createHash("sha256").update(image.bytes).digest("hex");
  const extension = image.mimeType === "image/png" ? "png" : "jpg";
  await prepareObjectStorage(resources);
  const row = await createReadyReferenceFromGeneratedAsset(resources.pool, {
    assetId: normalizedAssetId,
    ownerId,
    referenceId,
    objectKey,
    workspaceId,
    file: { name: `generated-${normalizedAssetId.slice(0, 8)}.${extension}`,
      mimeType: image.mimeType, byteSize: image.bytes.length,
      width: image.width, height: image.height, checksum },
    storeObject: async () => {
      await storeReferenceObject({ bucket: resources.config.objectStorage.bucket,
        bytes: image.bytes, checksum, contentType: image.mimeType,
        key: objectKey, storage: resources.storage });
    },
    deleteObject: () => deleteReferenceObject({ bucket: resources.config.objectStorage.bucket,
      key: objectKey, storage: resources.storage }),
  });
  return { id: row.id, name: row.original_file_name, status: "ready" };
}

export async function readReferenceAssetPreview({
  referenceId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  validateReferenceIds([{ id: referenceId }]);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const row = await findReferenceAsset(resources.pool, {
    ownerId,
    referenceId,
    workspaceId,
  });
  if (!row || row.upload_state !== "ready" || row.moderation_state !== "accepted" || row.object_deleted_at) {
    throw new ReferenceRequestError("REFERENCE_NOT_FOUND", "未找到可读取的参考图素材。", 404);
  }
  return readPrivateImagePreview({
    bucket: resources.config.objectStorage.bucket,
    key: row.object_key,
    publicStorage: resources.publicStorage,
    storage: resources.storage,
  });
}

export async function listReferenceAssets({
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const rows = await findReusableReferenceAssets(resources.pool, {
    ownerId,
    workspaceId,
  });
  return {
    references: rows.map(publicReusableReference),
  };
}

export async function readReferenceAssetContent({
  referenceId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  validateReferenceIds([{ id: referenceId }]);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const row = await findReferenceAsset(resources.pool, {
    ownerId,
    referenceId,
    workspaceId,
  });
  if (
    !row ||
    row.upload_state !== "ready" ||
    row.moderation_state !== "accepted" ||
    row.object_deleted_at
  ) {
    throw new ReferenceRequestError(
      "REFERENCE_NOT_FOUND",
      "未找到可读取的参考图素材。",
      404,
    );
  }
  const object = await readReferenceObject({
    bucket: resources.config.objectStorage.bucket,
    key: row.object_key,
    storage: resources.storage,
  });
  return {
    bytes: object.bytes,
    mimeType: row.detected_mime_type || object.contentType || "application/octet-stream",
  };
}

export async function getReferenceUploadStatus({
  referenceId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  validateReferenceIds([{ id: referenceId }]);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const row = await findReferenceAsset(resources.pool, {
    ownerId,
    referenceId,
    workspaceId,
  });
  if (!row) {
    throw new ReferenceRequestError("REFERENCE_NOT_FOUND", "未找到该参考图。", 404);
  }
  return {
    id: row.id,
    name: row.original_file_name,
    status: row.upload_state,
    ...(row.error_code ? { errorCode: row.error_code } : {}),
  };
}

export async function createReferenceUploads({
  files,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const validatedFiles = validateReferenceUploadRequest({ files });
  const resources = await getGenerationResources();
  await prepareObjectStorage(resources);
  const rows = await createPendingReferenceAssets(resources.pool, {
    files: validatedFiles,
    ownerId,
    uploadTtlSeconds: REFERENCE_LIMITS.uploadTtlSeconds,
    workspaceId,
    newKey: (key) => newLocalCloudReferenceKey(key, resources.config.cloudReference),
  });

  return {
    uploads: await Promise.all(
      rows.map(async (row) => ({
        clientId: row.client_id,
        expiresAt: new Date(row.expires_at).toISOString(),
        headers: { "content-type": row.declared_mime_type },
        reference: {
          id: row.id,
          name: row.original_file_name,
          status: "uploading",
        },
        uploadUrl: await signReferenceUpload({
          bucket: resources.config.objectStorage.bucket,
          contentType: row.declared_mime_type,
          key: row.object_key,
          publicStorage: resources.publicStorage,
        }),
      })),
    ),
  };
}

export async function completeReferenceUpload({
  referenceId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  validateReferenceIds([{ id: referenceId }]);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const row = await findReferenceAsset(resources.pool, {
    ownerId,
    referenceId,
    workspaceId,
  });
  if (!row) {
    throw new ReferenceRequestError(
      "REFERENCE_NOT_FOUND",
      "未找到该参考图。",
      404,
    );
  }
  if (row.upload_state === "ready") return publicReference(row);
  if (row.upload_state !== "pending") {
    throw new ReferenceRequestError(
      row.error_code ?? "REFERENCE_NOT_READY",
      "该参考图未通过上传校验，请重新选择文件。",
      409,
    );
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await markReferenceExpired(resources.pool, {
      ownerId,
      referenceId,
      workspaceId,
    });
    throw new ReferenceRequestError(
      "UPLOAD_EXPIRED",
      "参考图上传已过期，请重新选择文件。",
      409,
    );
  }

  try {
    const object = await readReferenceObject({
      bucket: resources.config.objectStorage.bucket,
      key: row.object_key,
      storage: resources.storage,
    });
    if (object.bytes.length !== Number(row.declared_byte_size)) {
      throw new ReferenceRequestError(
        "UPLOAD_SIZE_MISMATCH",
        "参考图文件大小与上传请求不一致，请重新上传。",
      );
    }
    const image = await inspectReferenceImage({
      bytes: object.bytes,
      declaredMimeType: row.declared_mime_type,
    });
    const checksum = createHash("sha256").update(object.bytes).digest("hex");
    return publicReference(
      await markReferenceReady(resources.pool, {
        byteSize: object.bytes.length,
        checksum,
        detectedMimeType: image.detectedMimeType,
        height: image.height,
        ownerId,
        referenceId,
        width: image.width,
        workspaceId,
      }),
    );
  } catch (error) {
    if (error instanceof ReferenceRequestError && !error.retryable) {
      await markReferenceRejected(resources.pool, {
        errorCode: error.code,
        ownerId,
        referenceId,
        workspaceId,
      });
    }
    throw error;
  }
}

export function referenceApiError(
  error,
  referenceId = "",
  requestId = newRequestId(),
) {
  if (
    error instanceof AuthenticationError ||
    error instanceof OrganizationError ||
    error instanceof ReferenceRequestError ||
    error instanceof ReferencePersistenceError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          referenceId: referenceId || undefined,
          requestId,
          retryable: error.retryable ?? false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "reference.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "参考图服务暂时不可用，请稍后重试。",
        referenceId: referenceId || undefined,
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
