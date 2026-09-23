import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources, prepareObjectStorage } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { referenceApiError } from "../references/api.mjs";
import { ReferenceRequestError } from "../references/errors.mjs";
import { PRIVATE_VIDEO_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_MIME_TYPES } from "../../shared/contracts/upload-limits.mjs";

export const VIDEO_MATERIAL_LIMITS = Object.freeze({
  maxBytes: PRIVATE_VIDEO_UPLOAD_MAX_BYTES,
  uploadTtlSeconds: 30 * 60,
  mimeTypes: PRIVATE_VIDEO_MIME_TYPES,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function validateId(id) {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    throw new ReferenceRequestError("VIDEO_MATERIAL_INVALID", "视频素材标识无效。", 400);
  }
}

export function validateVideoUploadRequest(file) {
  const clientId = typeof file?.clientId === "string" ? file.clientId : "";
  const name = typeof file?.name === "string"
    ? file.name.replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim().slice(0, 255)
    : "";
  const mimeType = file?.mimeType;
  const byteSize = file?.byteSize;
  if (!clientId || clientId.length > 128 || !name) {
    throw new ReferenceRequestError("INVALID_UPLOAD_REQUEST", "视频上传文件信息无效。", 400);
  }
  if (!VIDEO_MATERIAL_LIMITS.mimeTypes.includes(mimeType)) {
    throw new ReferenceRequestError("UPLOAD_TYPE_INVALID", "仅支持 MP4 或 MOV 视频。", 400);
  }
  if (!Number.isInteger(byteSize) || byteSize < 1) {
    throw new ReferenceRequestError("UPLOAD_SIZE_INVALID", "视频文件大小无效。", 400);
  }
  if (byteSize > VIDEO_MATERIAL_LIMITS.maxBytes) {
    throw new ReferenceRequestError("UPLOAD_TOO_LARGE", "单个视频不能超过 200 MB。", 400);
  }
  return { clientId, name, mimeType, byteSize };
}

async function findVideoMaterial(pool, { ownerId, workspaceId, materialId }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(
    `SELECT * FROM video_materials WHERE id = $1 AND workspace_id = $2 AND owner_id = $3`,
    [materialId, workspace.id, ownerId],
  );
  return result.rows[0] ?? null;
}

export async function createVideoMaterialUpload({ file, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const validated = validateVideoUploadRequest(file);
  const resources = resourcesOverride ?? await getGenerationResources();
  await prepareObjectStorage(resources);
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const materialId = randomUUID();
  const objectKey = `video-materials/${workspace.id}/${ownerId}/${materialId}/original`;
  const row = await resources.pool.query(
    `INSERT INTO video_materials (id, owner_id, workspace_id, object_key, original_file_name,
      declared_mime_type, declared_byte_size, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now() + ($8 * interval '1 second'))
     RETURNING expires_at`,
    [materialId, ownerId, workspace.id, objectKey, validated.name, validated.mimeType,
      validated.byteSize, VIDEO_MATERIAL_LIMITS.uploadTtlSeconds],
  );
  return {
    clientId: validated.clientId,
    material: { id: materialId, name: validated.name, status: "uploading" },
    expiresAt: new Date(row.rows[0].expires_at).toISOString(),
    headers: { "content-type": validated.mimeType },
    uploadUrl: await getSignedUrl(resources.publicStorage,
      new PutObjectCommand({ Bucket: resources.config.objectStorage.bucket,
        Key: objectKey, ContentType: validated.mimeType }),
      { expiresIn: VIDEO_MATERIAL_LIMITS.uploadTtlSeconds }),
  };
}

export function validateVideoObjectHeader(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp") {
    throw new ReferenceRequestError("UPLOAD_CONTENT_INVALID", "视频文件格式无效，请上传 MP4 或 MOV。", 400);
  }
  const brand = bytes.toString("ascii", 8, 12);
  if (mimeType === "video/quicktime") {
    if (brand !== "qt  ") throw new ReferenceRequestError("UPLOAD_TYPE_MISMATCH", "文件内容与 MOV 格式不符。", 400);
  } else if (brand === "qt  ") {
    throw new ReferenceRequestError("UPLOAD_TYPE_MISMATCH", "文件内容为 MOV，请按 MOV 格式上传。", 400);
  }
}

export async function completeVideoMaterialUpload({ materialId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  validateId(materialId);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const row = await findVideoMaterial(resources.pool, { materialId, ownerId, workspaceId });
  if (!row) throw new ReferenceRequestError("VIDEO_MATERIAL_NOT_FOUND", "未找到该视频素材。", 404);
  if (row.upload_state === "ready") return { id: row.id, name: row.original_file_name, status: "ready" };
  if (row.upload_state !== "pending") throw new ReferenceRequestError("VIDEO_MATERIAL_NOT_READY", "视频上传已失效，请重新选择文件。", 409);
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await resources.pool.query(`UPDATE video_materials SET upload_state='expired', error_code='UPLOAD_EXPIRED', updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND upload_state='pending'`, [materialId, ownerId]);
    throw new ReferenceRequestError("UPLOAD_EXPIRED", "视频上传已过期，请重新选择文件。", 409);
  }
  let head;
  try {
    head = await resources.storage.send(new HeadObjectCommand({ Bucket: resources.config.objectStorage.bucket, Key: row.object_key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey"].includes(error?.name)) {
      throw new ReferenceRequestError("UPLOAD_NOT_FOUND", "尚未收到视频文件，请重试上传。", 409, true);
    }
    throw error;
  }
  const contentLength = Number(head.ContentLength ?? 0);
  let failure = null;
  if (contentLength !== Number(row.declared_byte_size) || contentLength > VIDEO_MATERIAL_LIMITS.maxBytes) {
    failure = new ReferenceRequestError("UPLOAD_SIZE_MISMATCH", "视频文件大小与上传请求不一致，请重新上传。", 400);
  } else if (head.ContentType !== row.declared_mime_type) {
    failure = new ReferenceRequestError("UPLOAD_TYPE_MISMATCH", "视频文件格式与上传请求不一致，请重新上传。", 400);
  } else {
    const object = await resources.storage.send(new GetObjectCommand({
      Bucket: resources.config.objectStorage.bucket, Key: row.object_key, Range: "bytes=0-31",
    }));
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    try { validateVideoObjectHeader(bytes, row.declared_mime_type); } catch (error) { failure = error; }
  }
  if (failure) {
    await resources.pool.query(`UPDATE video_materials SET upload_state='rejected', error_code=$3, updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND upload_state='pending'`, [materialId, ownerId, failure.code]);
    throw failure;
  }
  const updated = await resources.pool.query(`UPDATE video_materials SET upload_state='ready', uploaded_at=now(),
    error_code=NULL, updated_at=now() WHERE id=$1 AND owner_id=$2 AND upload_state='pending' RETURNING *`,
    [materialId, ownerId]);
  if (!updated.rowCount) throw new ReferenceRequestError("VIDEO_MATERIAL_STATE_CONFLICT", "视频上传状态已变化，请刷新素材库。", 409);
  return { id: materialId, name: row.original_file_name, status: "ready" };
}

export async function getVideoMaterialStatus({ materialId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  validateId(materialId);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const row = await findVideoMaterial(resources.pool, { materialId, ownerId, workspaceId });
  if (!row) throw new ReferenceRequestError("VIDEO_MATERIAL_NOT_FOUND", "未找到该视频素材。", 404);
  return { id: row.id, name: row.original_file_name, status: row.upload_state,
    ...(row.error_code ? { errorCode: row.error_code } : {}) };
}

export async function listVideoMaterials({ ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const result = await resources.pool.query(`SELECT id, object_key, original_file_name, declared_mime_type,
      declared_byte_size, uploaded_at FROM video_materials
      WHERE workspace_id=$1 AND owner_id=$2 AND upload_state='ready'
      ORDER BY uploaded_at DESC, id DESC`, [workspace.id, ownerId]);
  return { materials: await Promise.all(result.rows.map(async (row) => ({
    id: row.id, mediaType: "video", name: row.original_file_name,
    mimeType: row.declared_mime_type, size: Number(row.declared_byte_size),
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    url: await signAssetRead({ bucket: resources.config.objectStorage.bucket,
      key: row.object_key, publicStorage: resources.publicStorage }),
  }))) };
}

export function videoMaterialApiError(error, materialId = "", requestId) {
  const result = referenceApiError(error, materialId, requestId);
  if (result.body.error.code === "INTERNAL_ERROR") {
    result.body.error.message = "视频素材服务暂时不可用，请稍后重试。";
  }
  return result;
}
