import { REFERENCE_LIMITS } from "./constants.mjs";
import { ReferenceRequestError } from "./errors.mjs";
import { inspectReferenceImage } from "./validation.mjs";

const SOURCE_LIMIT_BYTES = 50 * 1024 * 1024;

/** Normalize a private generated output to the JPEG/PNG reference contract. */
export async function generatedAssetReferenceImage(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) {
    throw new ReferenceRequestError("ASSET_IMAGE_INVALID", "生成图片内容不可用。", 422);
  }
  if (bytes.length > SOURCE_LIMIT_BYTES) {
    throw new ReferenceRequestError("ASSET_TOO_LARGE", "生成图片过大，无法作为参考图。", 413);
  }

  const sharp = (await import("sharp")).default;
  const options = { failOn: "error", limitInputPixels: REFERENCE_LIMITS.maxPixels };
  let metadata;
  try {
    metadata = await sharp(bytes, options).metadata();
  } catch {
    throw new ReferenceRequestError("ASSET_IMAGE_INVALID", "生成图片无法解码。", 422);
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if ((metadata.pages ?? 1) !== 1 || width < REFERENCE_LIMITS.minDimension ||
      height < REFERENCE_LIMITS.minDimension || width > REFERENCE_LIMITS.maxDimension ||
      height > REFERENCE_LIMITS.maxDimension || width * height > REFERENCE_LIMITS.maxPixels) {
    throw new ReferenceRequestError("ASSET_DIMENSIONS_INVALID", "生成图片尺寸不符合参考图要求。", 422);
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ReferenceRequestError("ASSET_FORMAT_INVALID", "该生成图片格式暂不能作为参考图。", 422);
  }

  let normalized = bytes;
  let mimeType = metadata.format === "jpeg" ? "image/jpeg" : "image/png";
  if (metadata.format === "webp" || bytes.length > REFERENCE_LIMITS.maxBytes) {
    try {
      const image = sharp(bytes, options).rotate();
      if (metadata.hasAlpha) {
        normalized = await image.png({ compressionLevel: 9 }).toBuffer();
        mimeType = "image/png";
      } else {
        normalized = await image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        mimeType = "image/jpeg";
      }
    } catch {
      throw new ReferenceRequestError("ASSET_IMAGE_INVALID", "生成图片转换失败。", 422);
    }
  }
  const checked = await inspectReferenceImage({ bytes: normalized, declaredMimeType: mimeType });
  return { bytes: normalized, mimeType, width: checked.width, height: checked.height };
}

export const GENERATED_REFERENCE_SOURCE_LIMIT_BYTES = SOURCE_LIMIT_BYTES;
