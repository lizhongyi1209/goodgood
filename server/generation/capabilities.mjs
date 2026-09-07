export const SUPPORTED_GENERATION_ASPECT_RATIOS = Object.freeze([
  "1:8",
  "1:4",
  "9:16",
  "2:3",
  "3:4",
  "4:5",
  "1:1",
  "5:4",
  "4:3",
  "3:2",
  "16:9",
  "21:9",
  "4:1",
  "8:1",
]);

export const SUPPORTED_GENERATION_RESOLUTIONS = Object.freeze([
  "1K",
  "2K",
  "4K",
]);

export const DURABLE_GENERATION_MODEL_ID = "nano-banana-2";
export const DURABLE_GENERATION_OUTPUT_COUNT = 1;

export function isSupportedGenerationAspectRatio(value) {
  return SUPPORTED_GENERATION_ASPECT_RATIOS.includes(value);
}

export function isSupportedGenerationResolution(value) {
  return SUPPORTED_GENERATION_RESOLUTIONS.includes(value);
}
