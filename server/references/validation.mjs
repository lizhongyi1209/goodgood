import {
  REFERENCE_LIMITS,
  REFERENCE_MIME_BY_FORMAT,
  REFERENCE_MIME_TYPES,
} from "./constants.mjs";
import { ReferenceRequestError } from "./errors.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sharpPromise;

function loadSharp() {
  sharpPromise ??= import(/* @vite-ignore */ "sharp").then(
    (module) => module.default,
  );
  return sharpPromise;
}

function normalizeFileName(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .trim()
    .slice(0, 255);
}

export function validateReferenceUploadRequest(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.files)) {
    throw new ReferenceRequestError(
      "INVALID_UPLOAD_REQUEST",
      "参考图上传请求格式不正确。",
    );
  }
  if (
    payload.files.length < 1 ||
    payload.files.length > REFERENCE_LIMITS.maxReferences
  ) {
    throw new ReferenceRequestError(
      "REFERENCE_LIMIT_EXCEEDED",
      `每次最多可上传 ${REFERENCE_LIMITS.maxReferences} 张参考图。`,
    );
  }

  const seenClientIds = new Set();
  return payload.files.map((file) => {
    const clientId = typeof file?.clientId === "string" ? file.clientId : "";
    const name = normalizeFileName(file?.name);
    const mimeType = typeof file?.mimeType === "string" ? file.mimeType : "";
    const byteSize = file?.byteSize;
    if (!clientId || clientId.length > 128 || seenClientIds.has(clientId)) {
      throw new ReferenceRequestError(
        "INVALID_UPLOAD_REQUEST",
        "参考图上传标识无效。",
      );
    }
    seenClientIds.add(clientId);
    if (!name) {
      throw new ReferenceRequestError(
        "INVALID_FILE_NAME",
        "参考图文件名无效。",
      );
    }
    if (!REFERENCE_MIME_TYPES.includes(mimeType)) {
      throw new ReferenceRequestError(
        "UPLOAD_TYPE_INVALID",
        "仅支持 JPEG、PNG 或 WebP 参考图。",
      );
    }
    if (!Number.isInteger(byteSize) || byteSize < 1) {
      throw new ReferenceRequestError(
        "UPLOAD_SIZE_INVALID",
        "参考图文件大小无效。",
      );
    }
    if (byteSize > REFERENCE_LIMITS.maxBytes) {
      throw new ReferenceRequestError(
        "UPLOAD_TOO_LARGE",
        "单张参考图不能超过 20 MB。",
      );
    }
    return { byteSize, clientId, mimeType, name };
  });
}

export function validateReferenceIds(references) {
  if (!Array.isArray(references)) return [];
  if (references.length > REFERENCE_LIMITS.maxReferences) {
    throw new ReferenceRequestError(
      "REFERENCE_LIMIT_EXCEEDED",
      `每次生成最多可使用 ${REFERENCE_LIMITS.maxReferences} 张参考图。`,
    );
  }
  const ids = references.map((reference) => reference?.id);
  if (ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    throw new ReferenceRequestError(
      "REFERENCE_INVALID",
      "参考图标识无效，请重新上传。",
    );
  }
  if (new Set(ids).size !== ids.length) {
    throw new ReferenceRequestError(
      "REFERENCE_DUPLICATE",
      "同一张参考图不能重复添加。",
    );
  }
  return ids;
}

export async function inspectReferenceImage({ bytes, declaredMimeType }) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) {
    throw new ReferenceRequestError(
      "UPLOAD_EMPTY",
      "上传的参考图为空，请重新选择文件。",
    );
  }
  if (bytes.length > REFERENCE_LIMITS.maxBytes) {
    throw new ReferenceRequestError(
      "UPLOAD_TOO_LARGE",
      "单张参考图不能超过 20 MB。",
    );
  }

  let metadata;
  try {
    const sharp = await loadSharp();
    const options = {
      failOn: "error",
      limitInputPixels: REFERENCE_LIMITS.maxPixels,
      sequentialRead: true,
    };
    metadata = await sharp(bytes, options).metadata();
    await sharp(bytes, options).stats();
  } catch {
    throw new ReferenceRequestError(
      "UPLOAD_DECODE_INVALID",
      "参考图无法完整解码，请重新导出为 JPEG、PNG 或 WebP。",
    );
  }

  const detectedMimeType = REFERENCE_MIME_BY_FORMAT[metadata.format];
  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw new ReferenceRequestError(
      "UPLOAD_TYPE_MISMATCH",
      "参考图的真实格式与文件类型不一致，请重新选择文件。",
    );
  }
  if ((metadata.pages ?? 1) !== 1) {
    throw new ReferenceRequestError(
      "UPLOAD_ANIMATION_UNSUPPORTED",
      "参考图暂不支持动画或多页图片。",
    );
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width < REFERENCE_LIMITS.minDimension ||
    height < REFERENCE_LIMITS.minDimension ||
    width > REFERENCE_LIMITS.maxDimension ||
    height > REFERENCE_LIMITS.maxDimension ||
    width * height > REFERENCE_LIMITS.maxPixels
  ) {
    throw new ReferenceRequestError(
      "UPLOAD_DIMENSIONS_INVALID",
      "参考图长宽需在 64 至 8192 像素之间，且总像素不能超过 4000 万。",
    );
  }

  return { detectedMimeType, height, width };
}
