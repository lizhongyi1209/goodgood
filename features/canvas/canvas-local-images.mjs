import { PRIVATE_IMAGE_MIME_TYPES, PRIVATE_IMAGE_UPLOAD_MAX_BYTES, PRIVATE_VIDEO_MIME_TYPES, PRIVATE_VIDEO_UPLOAD_MAX_BYTES } from "../../shared/contracts/upload-limits.mjs";

/**
 * @template {{name: string, type: string, size: number}} T
 * @param {Iterable<T>} files
 * @returns {{accepted: T[], errors: string[]}}
 */
export function selectCanvasImageFiles(files) {
  /** @type {T[]} */
  const accepted = [];
  const errors = [];
  for (const file of files) {
    if (!PRIVATE_IMAGE_MIME_TYPES.includes(file.type) || file.size < 1 || file.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) {
      errors.push(`${file.name} 无法添加。请选择 20 MB 以内的 JPEG 或 PNG 图片。`);
      continue;
    }
    accepted.push(file);
  }
  return { accepted, errors };
}

/**
 * @template {{name: string, type: string, size: number}} T
 * @param {Iterable<T>} files
 * @returns {{accepted: T[], errors: string[]}}
 */
export function selectCanvasMediaFiles(files) {
  /** @type {T[]} */
  const accepted = [];
  const errors = [];
  for (const file of files) {
    if (PRIVATE_IMAGE_MIME_TYPES.includes(file.type)) {
      const image = selectCanvasImageFiles([file]);
      accepted.push(...image.accepted);
      errors.push(...image.errors);
    } else if (PRIVATE_VIDEO_MIME_TYPES.includes(file.type) && /\.mp4$/i.test(file.name)) {
      if (file.size < 1 || file.size > PRIVATE_VIDEO_UPLOAD_MAX_BYTES) {
        errors.push(`${file.name} 无法添加。请选择 20 MB 以内的 MP4 视频。`);
      } else {
        accepted.push(file);
      }
    } else {
      errors.push(`${file.name} 无法添加。画布仅支持 20 MB 以内的 JPEG、PNG 图片或 MP4 视频。`);
    }
  }
  return { accepted, errors };
}

/** @param {{x: number, y: number}} point @param {number} count */
export function canvasImagePositions(point, count) {
  const spacing = 254;
  return Array.from({ length: count }, (_, index) => ({
    x: point.x - (count * spacing - 16) / 2 + index * spacing,
    y: point.y - 120,
  }));
}
