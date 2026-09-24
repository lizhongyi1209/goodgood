import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources, prepareObjectStorage } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { referenceApiError } from "../references/api.mjs";
import { ReferenceRequestError } from "../references/errors.mjs";
import { PRIVATE_AUDIO_MIME_TYPES, PRIVATE_AUDIO_UPLOAD_MAX_BYTES } from "../../shared/contracts/upload-limits.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPLOAD_TTL_SECONDS = 30 * 60;

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function validateId(id) {
  if (typeof id !== "string" || !UUID.test(id)) {
    throw new ReferenceRequestError("AUDIO_MATERIAL_INVALID", "音频素材标识无效。", 400);
  }
}

export function validateAudioUploadRequest(file) {
  const clientId = typeof file?.clientId === "string" ? file.clientId : "";
  const name = typeof file?.name === "string"
    ? file.name.replace(/[\\/\u0000-\u001f\u007f]/g, "-").trim().slice(0, 255) : "";
  const mimeType = file?.mimeType;
  const byteSize = file?.byteSize;
  if (!clientId || clientId.length > 128 || !name) {
    throw new ReferenceRequestError("INVALID_UPLOAD_REQUEST", "音频上传文件信息无效。", 400);
  }
  if (!PRIVATE_AUDIO_MIME_TYPES.includes(mimeType)) {
    throw new ReferenceRequestError("UPLOAD_TYPE_INVALID", "仅支持 MP3 音频。", 400);
  }
  if (!Number.isInteger(byteSize) || byteSize < 1) {
    throw new ReferenceRequestError("UPLOAD_SIZE_INVALID", "音频文件大小无效。", 400);
  }
  if (byteSize > PRIVATE_AUDIO_UPLOAD_MAX_BYTES) {
    throw new ReferenceRequestError("UPLOAD_TOO_LARGE", "单个音频不能超过 20 MB。", 400);
  }
  return { clientId, name, mimeType, byteSize };
}

export function validateAudioObjectHeader(bytes, mimeType) {
  const mp3 = bytes.length >= 3 && (bytes.toString("ascii", 0, 3) === "ID3" ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  if (mimeType !== "audio/mpeg" || !mp3) {
    throw new ReferenceRequestError("UPLOAD_CONTENT_INVALID", "音频文件内容与所选格式不符。", 400);
  }
}

async function findAudioMaterial(pool, { materialId, ownerId, workspaceId }) {
  const workspace = await resolveWorkspaceAccess(pool, { ownerId, workspaceId });
  const result = await pool.query(`SELECT * FROM audio_materials WHERE id=$1 AND workspace_id=$2 AND owner_id=$3`,
    [materialId, workspace.id, ownerId]);
  return result.rows[0] ?? null;
}

export async function createAudioMaterialUpload({ file, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const validated = validateAudioUploadRequest(file);
  const resources = resourcesOverride ?? await getGenerationResources();
  await prepareObjectStorage(resources);
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const materialId = randomUUID();
  const objectKey = `audio-materials/${workspace.id}/${ownerId}/${materialId}/original`;
  const row = await resources.pool.query(`INSERT INTO audio_materials(id,owner_id,workspace_id,object_key,original_file_name,
      declared_mime_type,declared_byte_size,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,now()+($8 * interval '1 second')) RETURNING expires_at`,
    [materialId, ownerId, workspace.id, objectKey, validated.name, validated.mimeType, validated.byteSize, UPLOAD_TTL_SECONDS]);
  return {
    clientId: validated.clientId,
    material: { id: materialId, name: validated.name, status: "uploading" },
    expiresAt: new Date(row.rows[0].expires_at).toISOString(),
    headers: { "content-type": validated.mimeType },
    uploadUrl: await getSignedUrl(resources.publicStorage,
      new PutObjectCommand({ Bucket: resources.config.objectStorage.bucket, Key: objectKey, ContentType: validated.mimeType }),
      { expiresIn: UPLOAD_TTL_SECONDS }),
  };
}

export async function completeAudioMaterialUpload({ materialId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  validateId(materialId);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const row = await findAudioMaterial(resources.pool, { materialId, ownerId, workspaceId });
  if (!row) throw new ReferenceRequestError("AUDIO_MATERIAL_NOT_FOUND", "未找到该音频素材。", 404);
  if (row.upload_state === "ready") return { id: row.id, name: row.original_file_name, status: "ready" };
  if (row.upload_state !== "pending") throw new ReferenceRequestError("AUDIO_MATERIAL_NOT_READY", "音频上传已失效，请重新选择文件。", 409);
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await resources.pool.query(`UPDATE audio_materials SET upload_state='expired',error_code='UPLOAD_EXPIRED',updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND upload_state='pending'`, [materialId, ownerId]);
    throw new ReferenceRequestError("UPLOAD_EXPIRED", "音频上传已过期，请重新选择文件。", 409);
  }
  let head;
  try {
    head = await resources.storage.send(new HeadObjectCommand({ Bucket: resources.config.objectStorage.bucket, Key: row.object_key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey"].includes(error?.name)) {
      throw new ReferenceRequestError("UPLOAD_NOT_FOUND", "尚未收到音频文件，请重试上传。", 409, true);
    }
    throw error;
  }
  let failure = null;
  if (Number(head.ContentLength ?? 0) !== Number(row.declared_byte_size) || Number(head.ContentLength ?? 0) > PRIVATE_AUDIO_UPLOAD_MAX_BYTES) {
    failure = new ReferenceRequestError("UPLOAD_SIZE_MISMATCH", "音频文件大小与上传请求不一致，请重新上传。", 400);
  } else if (head.ContentType !== row.declared_mime_type) {
    failure = new ReferenceRequestError("UPLOAD_TYPE_MISMATCH", "音频文件格式与上传请求不一致，请重新上传。", 400);
  } else {
    const object = await resources.storage.send(new GetObjectCommand({ Bucket: resources.config.objectStorage.bucket,
      Key: row.object_key, Range: "bytes=0-31" }));
    try { validateAudioObjectHeader(Buffer.from(await object.Body.transformToByteArray()), row.declared_mime_type); }
    catch (error) { failure = error; }
  }
  if (failure) {
    await resources.pool.query(`UPDATE audio_materials SET upload_state='rejected',error_code=$3,updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND upload_state='pending'`, [materialId, ownerId, failure.code]);
    throw failure;
  }
  const updated = await resources.pool.query(`UPDATE audio_materials SET upload_state='ready',uploaded_at=now(),error_code=NULL,updated_at=now()
    WHERE id=$1 AND owner_id=$2 AND upload_state='pending' RETURNING id`, [materialId, ownerId]);
  if (!updated.rowCount) throw new ReferenceRequestError("AUDIO_MATERIAL_STATE_CONFLICT", "音频上传状态已变化，请刷新素材库。", 409);
  return { id: materialId, name: row.original_file_name, status: "ready" };
}

export async function getAudioMaterialStatus({ materialId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  validateId(materialId);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const row = await findAudioMaterial(resources.pool, { materialId, ownerId, workspaceId });
  if (!row) throw new ReferenceRequestError("AUDIO_MATERIAL_NOT_FOUND", "未找到该音频素材。", 404);
  return { id: row.id, name: row.original_file_name, status: row.upload_state,
    ...(row.error_code ? { errorCode: row.error_code } : {}) };
}

export async function listAudioMaterials({ ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const result = await resources.pool.query(`SELECT id,object_key,original_file_name,declared_mime_type,declared_byte_size,uploaded_at
    FROM audio_materials WHERE workspace_id=$1 AND owner_id=$2 AND upload_state='ready'
    ORDER BY uploaded_at DESC,id DESC`, [workspace.id, ownerId]);
  return { materials: await Promise.all(result.rows.map(async (row) => ({ id: row.id, mediaType: "audio", name: row.original_file_name,
    mimeType: row.declared_mime_type, size: Number(row.declared_byte_size),
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    url: await signAssetRead({ bucket: resources.config.objectStorage.bucket, key: row.object_key,
      publicStorage: resources.publicStorage }) }))) };
}

export async function getAudioMaterialContentUrl({ materialId, ownerContext, workspaceId = /** @type {string | null} */ (null), resourcesOverride = null }) {
  validateId(materialId);
  const ownerId = ownerIdFromContext(ownerContext);
  const resources = resourcesOverride ?? await getGenerationResources();
  const row = await findAudioMaterial(resources.pool, { materialId, ownerId, workspaceId });
  if (!row || row.upload_state !== "ready") throw new ReferenceRequestError("AUDIO_MATERIAL_NOT_FOUND", "未找到该音频素材。", 404);
  return { url: await signAssetRead({ bucket: resources.config.objectStorage.bucket, key: row.object_key,
    publicStorage: resources.publicStorage }) };
}

export function audioMaterialApiError(error, materialId = "", requestId) {
  const result = referenceApiError(error, materialId, requestId);
  if (result.body.error.code === "INTERNAL_ERROR") result.body.error.message = "音频素材服务暂时不可用，请稍后重试。";
  return result;
}
