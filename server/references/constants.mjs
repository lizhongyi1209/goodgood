export const REFERENCE_LIMITS = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  maxDimension: 8_192,
  maxPixels: 40_000_000,
  maxReferences: 10,
  minDimension: 64,
  uploadTtlSeconds: 10 * 60,
});

export const REFERENCE_MIME_BY_FORMAT = Object.freeze({
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
});

export const REFERENCE_MIME_TYPES = Object.freeze(
  Object.values(REFERENCE_MIME_BY_FORMAT),
);
