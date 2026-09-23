import sharp from "sharp";
import { NormalizedProviderError } from "./provider.mjs";

// GoodGood's O1Key upload budget. O1Key receives one multipart upload per
// reference and then URL references; these are operational limits, not an
// assertion that Gemini and OpenAI have identical inline-body limits.
export const PROVIDER_REFERENCE_LIMITS = Object.freeze({
  maxBytesPerImage: 10_000_000,
  maxBytesPerRequest: 32_000_000,
  maxEdge: 4_096,
  maxPixels: 8_000_000,
});

function inputError(message) {
  return new NormalizedProviderError({
    code: "REFERENCE_INPUT_INVALID",
    message,
    retryable: false,
  });
}

export function providerReferenceByteBudget(referenceCount) {
  if (!Number.isInteger(referenceCount) || referenceCount < 1 || referenceCount > 10) {
    throw inputError("参考图数量超出模型支持范围，请减少后重试。");
  }
  return Math.min(
    PROVIDER_REFERENCE_LIMITS.maxBytesPerImage,
    Math.floor(PROVIDER_REFERENCE_LIMITS.maxBytesPerRequest / referenceCount),
  );
}

export async function prepareProviderReference(reference, byteBudget) {
  if (!Buffer.isBuffer(reference?.bytes) ||
      !["image/jpeg", "image/png", "image/webp"].includes(reference.mimeType) ||
      !Number.isInteger(byteBudget) || byteBudget < 1 ||
      byteBudget > PROVIDER_REFERENCE_LIMITS.maxBytesPerImage) {
    throw inputError("参考图无法用于当前模型，请重新上传后重试。");
  }

  let metadata;
  try {
    metadata = await sharp(reference.bytes, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw inputError("参考图无法解码，请重新上传后重试。");
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw inputError("参考图尺寸无效，请重新上传后重试。");
  if (reference.bytes.length <= byteBudget &&
      Math.max(width, height) <= PROVIDER_REFERENCE_LIMITS.maxEdge &&
      width * height <= PROVIDER_REFERENCE_LIMITS.maxPixels) {
    return reference;
  }

  const swap = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  const orientedWidth = swap ? height : width;
  const orientedHeight = swap ? width : height;
  const scale = Math.min(
    1,
    PROVIDER_REFERENCE_LIMITS.maxEdge / Math.max(orientedWidth, orientedHeight),
    Math.sqrt(PROVIDER_REFERENCE_LIMITS.maxPixels / (orientedWidth * orientedHeight)),
  );
  const attempts = [
    { scale: 1, quality: 90 },
    { scale: 0.8, quality: 84 },
    { scale: 0.65, quality: 78 },
    { scale: 0.5, quality: 72 },
  ];
  for (const attempt of attempts) {
    const targetWidth = Math.max(64, Math.floor(orientedWidth * scale * attempt.scale));
    const targetHeight = Math.max(64, Math.floor(orientedHeight * scale * attempt.scale));
    let bytes;
    try {
      bytes = await sharp(reference.bytes, {
        failOn: "error",
        limitInputPixels: 40_000_000,
        sequentialRead: true,
      })
        .rotate()
        .resize({ width: targetWidth, height: targetHeight, fit: "inside", withoutEnlargement: true })
        .webp({ quality: attempt.quality, alphaQuality: attempt.quality, effort: 4 })
        .toBuffer();
    } catch {
      throw inputError("参考图优化失败，请换一张图片后重试。");
    }
    if (bytes.length <= byteBudget) {
      return {
        bytes,
        mimeType: "image/webp",
        name: `${reference.name ?? "reference"}.webp`,
      };
    }
  }
  throw inputError("参考图自动优化后仍超出模型输入范围，请减少图片或改用更小的图片。");
}
