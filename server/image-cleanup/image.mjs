import { writeImageFileMetadata } from "../../features/assets/image-file-metadata.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "../../shared/contracts/upload-limits.mjs";
import { inspectReferenceImage } from "../references/validation.mjs";
import { REFERENCE_LIMITS } from "../references/constants.mjs";
import { ImageCleanupError } from "./errors.mjs";

export async function cleanImageMetadata(bytes, name) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) {
    throw new ImageCleanupError("IMAGE_CLEANUP_SIZE_INVALID", "请选择不超过20 MB的JPEG或PNG原图。", 413);
  }
  let cleaned;
  try { cleaned = writeImageFileMetadata(bytes, {}, { clear: true }); }
  catch (error) { throw new ImageCleanupError("IMAGE_CLEANUP_CONTAINER_INVALID", error.message || "原图结构无法安全清理。", 422); }
  // The pure container reader checks C2PA ambiguity before any orientation rewrite.
  const sharp = (await import("sharp")).default;
  let metadata;
  const options = { failOn: "error", limitInputPixels: REFERENCE_LIMITS.maxPixels };
  try { metadata = await sharp(bytes, options).metadata(); }
  catch { throw new ImageCleanupError("IMAGE_CLEANUP_DECODE_INVALID", "原图无法解码，请重新导出为JPEG或PNG。", 422); }
  await inspectReferenceImage({ bytes, declaredMimeType: cleaned.mimeType });
  if (metadata.orientation > 1 && metadata.orientation <= 8) {
    const oriented = await sharp(bytes, options).rotate().png().toBuffer();
    cleaned = writeImageFileMetadata(oriented, {}, { clear: true });
  }
  const output = Buffer.from(cleaned.bytes);
  if (output.length > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new ImageCleanupError("IMAGE_CLEANUP_OUTPUT_TOO_LARGE", "保留朝向后的副本超过20 MB，请使用较小的原图。", 413);
  const checked = await inspectReferenceImage({ bytes: output, declaredMimeType: cleaned.mimeType });
  const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 100).trim() || "GoodGood图片";
  return { bytes: output, name: `${basename}_去除AI.${cleaned.extension}`, mimeType: cleaned.mimeType,
    width: checked.width, height: checked.height, byteSize: output.length };
}
