export const SUPPORTED_GENERATION_RESOLUTIONS = Object.freeze([
  "1K",
  "2K",
  "4K",
]);

export const DURABLE_GENERATION_OUTPUT_COUNT = 1;
export const SUPPORTED_GPT_IMAGE_2_OUTPUT_COUNTS = Object.freeze([1, 2, 4]);
export const SUPPORTED_NANO_BANANA_2_OUTPUT_COUNTS = Object.freeze([1, 2, 4]);
export const SUPPORTED_GENERATION_THINKING_LEVELS = Object.freeze(["low", "high"]);
export const SUPPORTED_GPT_IMAGE_QUALITIES = Object.freeze(["auto", "low", "medium", "high"]);
export const SUPPORTED_GPT_IMAGE_BACKGROUNDS = Object.freeze(["auto", "transparent"]);
export const SUPPORTED_GPT_IMAGE_OUTPUT_FORMATS = Object.freeze(["png", "jpeg", "webp"]);
export const DEFAULT_GPT_IMAGE_OUTPUT_FORMAT = "jpeg";

const NANO_BANANA_2_ASPECT_RATIOS = Object.freeze([
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

const GPT_IMAGE_2_ASPECT_RATIOS = Object.freeze([
  "9:16",
  "2:3",
  "3:4",
  "1:1",
  "4:3",
  "3:2",
  "16:9",
]);

export const GPT_IMAGE_2_PIXEL_SIZES = Object.freeze({
  "9:16": Object.freeze({ "1K": "1024x1824", "2K": "2048x3648", "4K": "2160x3840" }),
  "2:3": Object.freeze({ "1K": "1024x1536", "2K": "2048x3072", "4K": "2336x3504" }),
  "3:4": Object.freeze({ "1K": "1024x1360", "2K": "2048x2736", "4K": "2448x3264" }),
  "1:1": Object.freeze({ "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" }),
  "4:3": Object.freeze({ "1K": "1360x1024", "2K": "2736x2048", "4K": "3264x2448" }),
  "3:2": Object.freeze({ "1K": "1536x1024", "2K": "3072x2048", "4K": "3504x2336" }),
  "16:9": Object.freeze({ "1K": "1824x1024", "2K": "3648x2048", "4K": "3840x2160" }),
});

export const GENERATION_MODEL_CAPABILITIES = Object.freeze({
  "nano-banana-2": Object.freeze({
    aspectRatios: NANO_BANANA_2_ASPECT_RATIOS,
    outputCounts: SUPPORTED_NANO_BANANA_2_OUTPUT_COUNTS,
    resolutions: SUPPORTED_GENERATION_RESOLUTIONS,
  }),
  "gpt-image-2": Object.freeze({
    aspectRatios: GPT_IMAGE_2_ASPECT_RATIOS,
    outputCounts: SUPPORTED_GPT_IMAGE_2_OUTPUT_COUNTS,
    resolutions: SUPPORTED_GENERATION_RESOLUTIONS,
  }),
});

export const SUPPORTED_GENERATION_MODEL_IDS = Object.freeze(
  Object.keys(GENERATION_MODEL_CAPABILITIES),
);

export const SUPPORTED_GENERATION_ASPECT_RATIOS = NANO_BANANA_2_ASPECT_RATIOS;
export const DURABLE_GENERATION_MODEL_ID = "nano-banana-2";

export function getGenerationModelCapability(modelId) {
  return GENERATION_MODEL_CAPABILITIES[modelId] ?? null;
}

export function isSupportedGenerationAspectRatio(modelId, value) {
  return getGenerationModelCapability(modelId)?.aspectRatios.includes(value) ?? false;
}

export function isSupportedGenerationResolution(modelId, value) {
  return getGenerationModelCapability(modelId)?.resolutions.includes(value) ?? false;
}

export function isSupportedGenerationInput({ aspectRatio, count, modelId, resolution }) {
  const capability = getGenerationModelCapability(modelId);
  return Boolean(
    capability &&
    capability.outputCounts.includes(count) &&
    capability.aspectRatios.includes(aspectRatio) &&
    capability.resolutions.includes(resolution),
  );
}

export function normalizeGenerationModelOptions({
  background,
  googleSearch,
  modelId,
  outputFormat,
  quality,
  thinkingLevel,
}) {
  const normalizedThinkingLevel =
    thinkingLevel ?? (modelId === "nano-banana-2" ? "high" : "low");
  const normalizedGoogleSearch = googleSearch ?? false;
  const normalizedQuality = quality ?? "auto";
  const normalizedBackground = background ?? "auto";
  const normalizedOutputFormat =
    outputFormat ?? (modelId === "gpt-image-2" ? DEFAULT_GPT_IMAGE_OUTPUT_FORMAT : "png");
  if (
    !SUPPORTED_GENERATION_THINKING_LEVELS.includes(normalizedThinkingLevel) ||
    typeof normalizedGoogleSearch !== "boolean" ||
    !SUPPORTED_GPT_IMAGE_QUALITIES.includes(normalizedQuality) ||
    !SUPPORTED_GPT_IMAGE_BACKGROUNDS.includes(normalizedBackground) ||
    !SUPPORTED_GPT_IMAGE_OUTPUT_FORMATS.includes(normalizedOutputFormat) ||
    (normalizedBackground === "transparent" && normalizedOutputFormat === "jpeg")
  ) {
    return null;
  }
  if (
    modelId !== "nano-banana-2" &&
    (normalizedThinkingLevel !== "low" || normalizedGoogleSearch)
  ) {
    return null;
  }
  if (
    modelId !== "gpt-image-2" &&
    (normalizedQuality !== "auto" ||
      normalizedBackground !== "auto" ||
      normalizedOutputFormat !== "png")
  ) {
    return null;
  }
  return Object.freeze({
    background: normalizedBackground,
    googleSearch: normalizedGoogleSearch,
    outputFormat: normalizedOutputFormat,
    quality: normalizedQuality,
    thinkingLevel: normalizedThinkingLevel,
  });
}

export function getGptImage2PixelSize(aspectRatio, resolution) {
  const size = GPT_IMAGE_2_PIXEL_SIZES[aspectRatio]?.[resolution];
  if (!size) {
    throw new Error("Unsupported GPT Image 2 aspect ratio or resolution.");
  }
  return size;
}
