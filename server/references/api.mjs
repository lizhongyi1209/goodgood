import { createHash, randomUUID } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import {
  getGenerationResources,
  prepareObjectStorage,
} from "../generation/resources.mjs";
import { REFERENCE_LIMITS } from "./constants.mjs";
import {
  ReferencePersistenceError,
  ReferenceRequestError,
} from "./errors.mjs";
import {
  createPendingReferenceAssets,
  findReferenceAsset,
  markReferenceExpired,
  markReferenceReady,
  markReferenceRejected,
} from "./repository.mjs";
import { readReferenceObject, signReferenceUpload } from "./storage.mjs";
import {
  inspectReferenceImage,
  validateReferenceIds,
  validateReferenceUploadRequest,
} from "./validation.mjs";

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

export async function createReferenceUploads({ files, ownerContext }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const validatedFiles = validateReferenceUploadRequest({ files });
  const resources = await getGenerationResources();
  await prepareObjectStorage(resources);
  const rows = await createPendingReferenceAssets(resources.pool, {
    files: validatedFiles,
    ownerId,
    uploadTtlSeconds: REFERENCE_LIMITS.uploadTtlSeconds,
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

export async function completeReferenceUpload({ referenceId, ownerContext }) {
  validateReferenceIds([{ id: referenceId }]);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = await getGenerationResources();
  const row = await findReferenceAsset(resources.pool, { ownerId, referenceId });
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
    await markReferenceExpired(resources.pool, { ownerId, referenceId });
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
      }),
    );
  } catch (error) {
    if (error instanceof ReferenceRequestError && !error.retryable) {
      await markReferenceRejected(resources.pool, {
        errorCode: error.code,
        ownerId,
        referenceId,
      });
    }
    throw error;
  }
}

export function referenceApiError(error, referenceId = "") {
  const requestId = `req_${randomUUID()}`;
  if (
    error instanceof AuthenticationError ||
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
