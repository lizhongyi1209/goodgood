import { gptPricingQualities } from "@/shared/contracts/gpt-quality-pricing.mjs";
import {
  GENERATION_COUNTS,
  isGptImageModelId,
  type GenerationCount,
  GenerationAspectRatio,
  GenerationModelId,
  GenerationResolution,
  GenerationThinkingLevel,
  GptImageBackground,
  GptImageOutputFormat,
  GptImageQuality,
} from "@/shared/contracts/generation";

export type GenerationRatioMode = "portrait" | "square" | "landscape";

export type PixelDimensions = Readonly<{
  width: number;
  height: number;
}>;

export type GenerationRatioOption = Readonly<{
  id: GenerationAspectRatio;
  label: string;
  value: number;
  dimensions: Readonly<Record<GenerationResolution, PixelDimensions>>;
  mode: GenerationRatioMode;
}>;

export const GENERATION_RATIO_OPTIONS = [
  {
    id: "1:8",
    label: "1 : 8",
    value: 1 / 8,
    dimensions: {
      "1K": { width: 384, height: 3072 },
      "2K": { width: 768, height: 6144 },
      "4K": { width: 1536, height: 12288 },
    },
    mode: "portrait",
  },
  {
    id: "1:4",
    label: "1 : 4",
    value: 1 / 4,
    dimensions: {
      "1K": { width: 512, height: 2048 },
      "2K": { width: 1024, height: 4096 },
      "4K": { width: 2048, height: 8192 },
    },
    mode: "portrait",
  },
  {
    id: "9:16",
    label: "9 : 16",
    value: 9 / 16,
    dimensions: {
      "1K": { width: 768, height: 1376 },
      "2K": { width: 1536, height: 2752 },
      "4K": { width: 3072, height: 5504 },
    },
    mode: "portrait",
  },
  {
    id: "2:3",
    label: "2 : 3",
    value: 2 / 3,
    dimensions: {
      "1K": { width: 848, height: 1264 },
      "2K": { width: 1696, height: 2528 },
      "4K": { width: 3392, height: 5056 },
    },
    mode: "portrait",
  },
  {
    id: "3:4",
    label: "3 : 4",
    value: 3 / 4,
    dimensions: {
      "1K": { width: 896, height: 1200 },
      "2K": { width: 1792, height: 2400 },
      "4K": { width: 3584, height: 4800 },
    },
    mode: "portrait",
  },
  {
    id: "4:5",
    label: "4 : 5",
    value: 4 / 5,
    dimensions: {
      "1K": { width: 928, height: 1152 },
      "2K": { width: 1856, height: 2304 },
      "4K": { width: 3712, height: 4608 },
    },
    mode: "portrait",
  },
  {
    id: "1:1",
    label: "1 : 1",
    value: 1,
    dimensions: {
      "1K": { width: 1024, height: 1024 },
      "2K": { width: 2048, height: 2048 },
      "4K": { width: 4096, height: 4096 },
    },
    mode: "square",
  },
  {
    id: "5:4",
    label: "5 : 4",
    value: 5 / 4,
    dimensions: {
      "1K": { width: 1152, height: 928 },
      "2K": { width: 2304, height: 1856 },
      "4K": { width: 4608, height: 3712 },
    },
    mode: "landscape",
  },
  {
    id: "4:3",
    label: "4 : 3",
    value: 4 / 3,
    dimensions: {
      "1K": { width: 1200, height: 896 },
      "2K": { width: 2400, height: 1792 },
      "4K": { width: 4800, height: 3584 },
    },
    mode: "landscape",
  },
  {
    id: "3:2",
    label: "3 : 2",
    value: 3 / 2,
    dimensions: {
      "1K": { width: 1264, height: 848 },
      "2K": { width: 2528, height: 1696 },
      "4K": { width: 5056, height: 3392 },
    },
    mode: "landscape",
  },
  {
    id: "16:9",
    label: "16 : 9",
    value: 16 / 9,
    dimensions: {
      "1K": { width: 1376, height: 768 },
      "2K": { width: 2752, height: 1536 },
      "4K": { width: 5504, height: 3072 },
    },
    mode: "landscape",
  },
  {
    id: "21:9",
    label: "21 : 9",
    value: 21 / 9,
    dimensions: {
      "1K": { width: 1584, height: 672 },
      "2K": { width: 3168, height: 1344 },
      "4K": { width: 6336, height: 2688 },
    },
    mode: "landscape",
  },
  {
    id: "4:1",
    label: "4 : 1",
    value: 4,
    dimensions: {
      "1K": { width: 2048, height: 512 },
      "2K": { width: 4096, height: 1024 },
      "4K": { width: 8192, height: 2048 },
    },
    mode: "landscape",
  },
  {
    id: "8:1",
    label: "8 : 1",
    value: 8,
    dimensions: {
      "1K": { width: 3072, height: 384 },
      "2K": { width: 6144, height: 768 },
      "4K": { width: 12288, height: 1536 },
    },
    mode: "landscape",
  },
] as const satisfies readonly GenerationRatioOption[];

export const GPT_IMAGE_2_RATIO_IDS = [
  "9:16",
  "2:3",
  "3:4",
  "1:1",
  "4:3",
  "3:2",
  "16:9",
] as const satisfies readonly GenerationAspectRatio[];

type GptImage2AspectRatio = (typeof GPT_IMAGE_2_RATIO_IDS)[number];

export const GPT_IMAGE_2_DIMENSIONS = {
  "9:16": {
    "1K": { width: 1024, height: 1824 },
    "2K": { width: 2048, height: 3648 },
    "4K": { width: 2160, height: 3840 },
  },
  "2:3": {
    "1K": { width: 1024, height: 1536 },
    "2K": { width: 2048, height: 3072 },
    "4K": { width: 2336, height: 3504 },
  },
  "3:4": {
    "1K": { width: 1024, height: 1360 },
    "2K": { width: 2048, height: 2736 },
    "4K": { width: 2448, height: 3264 },
  },
  "1:1": {
    "1K": { width: 1024, height: 1024 },
    "2K": { width: 2048, height: 2048 },
    "4K": { width: 2880, height: 2880 },
  },
  "4:3": {
    "1K": { width: 1360, height: 1024 },
    "2K": { width: 2736, height: 2048 },
    "4K": { width: 3264, height: 2448 },
  },
  "3:2": {
    "1K": { width: 1536, height: 1024 },
    "2K": { width: 3072, height: 2048 },
    "4K": { width: 3504, height: 2336 },
  },
  "16:9": {
    "1K": { width: 1824, height: 1024 },
    "2K": { width: 3648, height: 2048 },
    "4K": { width: 3840, height: 2160 },
  },
} as const satisfies Readonly<
  Record<
    GptImage2AspectRatio,
    Readonly<Record<GenerationResolution, PixelDimensions>>
  >
>;

export const GENERATION_RATIO_MODES = [
  ["portrait", "竖版"],
  ["square", "方形"],
  ["landscape", "横版"],
] as const;

export const DEFAULT_GENERATION_RATIO_BY_MODE = {
  portrait: "4:5",
  square: "1:1",
  landscape: "16:9",
} as const satisfies Readonly<
  Record<GenerationRatioMode, GenerationAspectRatio>
>;

export const GENERATION_RESOLUTION_OPTIONS = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
] as const satisfies readonly Readonly<{
  value: GenerationResolution;
  label: string;
}>[];

export const GPT_IMAGE_QUALITY_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "xhigh", label: "超高" },
  { value: "max", label: "最高" },
] as const satisfies readonly Readonly<{
  value: GptImageQuality;
  label: string;
}>[];

export function getGptImageQualityOptions(modelId: GenerationModelId) {
  return GPT_IMAGE_QUALITY_OPTIONS.filter(
    (option) =>
      option.value === "auto" ||
      gptPricingQualities(modelId).some((item) => item.id === option.value),
  );
}

export const GPT_IMAGE_BACKGROUND_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "transparent", label: "透明" },
] as const satisfies readonly Readonly<{
  value: GptImageBackground;
  label: string;
}>[];

export const GPT_IMAGE_OUTPUT_FORMAT_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const satisfies readonly Readonly<{
  value: GptImageOutputFormat;
  label: string;
}>[];

export const DEFAULT_GPT_IMAGE_OUTPUT_FORMAT = "jpeg" as const;

export function getGenerationRatio(
  ratio: GenerationAspectRatio,
): GenerationRatioOption {
  const option = GENERATION_RATIO_OPTIONS.find((item) => item.id === ratio);
  if (!option) throw new Error(`Unknown generation ratio: ${ratio}`);
  return option;
}

export function findGenerationRatioByLabel(
  label: string,
): GenerationRatioOption | undefined {
  return GENERATION_RATIO_OPTIONS.find((item) => item.label === label);
}

export function getGenerationRatioIndex(ratio: GenerationAspectRatio): number {
  const index = GENERATION_RATIO_OPTIONS.findIndex((item) => item.id === ratio);
  if (index < 0) throw new Error(`Unknown generation ratio: ${ratio}`);
  return index;
}

export function getGenerationRatioOptions(
  modelId: GenerationModelId,
): readonly GenerationRatioOption[] {
  if (modelId === "nano-banana-pro")
    return GENERATION_RATIO_OPTIONS.filter(
      (option) => !["1:8", "1:4", "4:1", "8:1"].includes(option.id),
    );
  if (!isGptImageModelId(modelId)) return GENERATION_RATIO_OPTIONS;
  return GENERATION_RATIO_OPTIONS.filter((option) =>
    GPT_IMAGE_2_RATIO_IDS.includes(option.id as GptImage2AspectRatio),
  );
}

export function getGenerationCountOptions(
  modelId: GenerationModelId,
): readonly GenerationCount[] {
  return modelId === "nano-banana-2" || isGptImageModelId(modelId)
    ? GENERATION_COUNTS
    : [1];
}

export function isGenerationCountSupported(
  modelId: GenerationModelId,
  count: GenerationCount,
): boolean {
  return getGenerationCountOptions(modelId).includes(count);
}

export function resolveGenerationCountForModel(
  modelId: GenerationModelId,
  count: GenerationCount,
): GenerationCount {
  return isGenerationCountSupported(modelId, count) ? count : 1;
}

export function resolveGenerationThinkingLevelForModel(
  modelId: GenerationModelId,
): GenerationThinkingLevel {
  return modelId === "nano-banana-2" ? "high" : "low";
}

export function resolveGoogleSearchForModel(
  modelId: GenerationModelId,
  googleSearch: boolean | undefined,
): boolean {
  return modelId === "nano-banana-2" && googleSearch === true;
}

export type GptImageOptions = Readonly<{
  background: GptImageBackground;
  outputFormat: GptImageOutputFormat;
  quality: GptImageQuality;
}>;

export function resolveGptImageOptionsForModel(
  modelId: GenerationModelId,
  options: Partial<GptImageOptions> = {},
): GptImageOptions {
  if (!isGptImageModelId(modelId)) {
    return { background: "auto", outputFormat: "png", quality: "auto" };
  }
  const background = GPT_IMAGE_BACKGROUND_OPTIONS.some(
    (option) => option.value === options.background,
  )
    ? (options.background as GptImageBackground)
    : "auto";
  const quality = getGptImageQualityOptions(modelId).some(
    (option) => option.value === options.quality,
  )
    ? (options.quality as GptImageQuality)
    : "auto";
  let outputFormat = GPT_IMAGE_OUTPUT_FORMAT_OPTIONS.some(
    (option) => option.value === options.outputFormat,
  )
    ? (options.outputFormat as GptImageOutputFormat)
    : DEFAULT_GPT_IMAGE_OUTPUT_FORMAT;
  if (background === "transparent" && outputFormat === "jpeg") {
    outputFormat = "png";
  }
  return { background, outputFormat, quality };
}

export function gptImageQualityLabel(value: GptImageQuality): string {
  return (
    GPT_IMAGE_QUALITY_OPTIONS.find((option) => option.value === value)?.label ??
    "自动"
  );
}

export function gptImageBackgroundLabel(value: GptImageBackground): string {
  return (
    GPT_IMAGE_BACKGROUND_OPTIONS.find((option) => option.value === value)
      ?.label ?? "自动"
  );
}

export function gptImageOutputFormatLabel(value: GptImageOutputFormat): string {
  return (
    GPT_IMAGE_OUTPUT_FORMAT_OPTIONS.find((option) => option.value === value)
      ?.label ?? "JPEG"
  );
}

export function getGenerationModelRatioIndex(
  modelId: GenerationModelId,
  ratio: GenerationAspectRatio,
): number {
  const index = getGenerationRatioOptions(modelId).findIndex(
    (option) => option.id === ratio,
  );
  if (index < 0) {
    throw new Error(`Unsupported generation ratio for ${modelId}: ${ratio}`);
  }
  return index;
}

export function getGenerationPixelDimensions(
  modelId: GenerationModelId,
  ratio: GenerationAspectRatio,
  resolution: GenerationResolution,
): PixelDimensions {
  if (isGptImageModelId(modelId)) {
    if (!GPT_IMAGE_2_RATIO_IDS.includes(ratio as GptImage2AspectRatio)) {
      throw new Error(`Unsupported generation ratio for ${modelId}: ${ratio}`);
    }
    return GPT_IMAGE_2_DIMENSIONS[ratio as GptImage2AspectRatio][resolution];
  }
  return getGenerationRatio(ratio).dimensions[resolution];
}

export function resolveGenerationAspectRatioForModel(
  modelId: GenerationModelId,
  ratio: GenerationAspectRatio,
): GenerationAspectRatio {
  const options = getGenerationRatioOptions(modelId);
  if (options.some((option) => option.id === ratio)) return ratio;
  const current = getGenerationRatio(ratio);
  const sameMode = options.filter((option) => option.mode === current.mode);
  const candidates = sameMode.length ? sameMode : options;
  return candidates.reduce((nearest, option) =>
    Math.abs(Math.log(option.value / current.value)) <
    Math.abs(Math.log(nearest.value / current.value))
      ? option
      : nearest,
  ).id;
}

export function getDefaultGenerationRatioForModelMode(
  modelId: GenerationModelId,
  mode: GenerationRatioMode,
): GenerationAspectRatio {
  return resolveGenerationAspectRatioForModel(
    modelId,
    DEFAULT_GENERATION_RATIO_BY_MODE[mode],
  );
}

export function getGenerationResolutionLabel(
  resolution: GenerationResolution,
): string {
  const option = GENERATION_RESOLUTION_OPTIONS.find(
    (item) => item.value === resolution,
  );
  if (!option) throw new Error(`Unknown generation resolution: ${resolution}`);
  return option.label;
}

export function formatPixelDimensions(dimensions: PixelDimensions): string {
  return `${dimensions.width} × ${dimensions.height}`;
}

type OptionalPixelDimensions = Readonly<{
  width?: number;
  height?: number;
}>;

function readPixelDimensions(
  dimensions?: OptionalPixelDimensions,
): PixelDimensions | undefined {
  const width = dimensions?.width;
  const height = dimensions?.height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }
  return { width, height };
}

export function getSharedPixelDimensions(
  outputs: readonly OptionalPixelDimensions[],
): PixelDimensions | undefined {
  const first = readPixelDimensions(outputs[0]);
  if (!first) return undefined;
  return outputs.every(
    (output) => output.width === first.width && output.height === first.height,
  )
    ? first
    : undefined;
}

export function formatGenerationResolution(
  resolution: GenerationResolution,
  dimensions?: OptionalPixelDimensions,
): string {
  const label = getGenerationResolutionLabel(resolution);
  const actualDimensions = readPixelDimensions(dimensions);
  return actualDimensions
    ? `${label} · ${formatPixelDimensions(actualDimensions)}`
    : label;
}

export function getRatioFrame(ratio: number) {
  const max = 96;
  let width = max;
  let height = width / ratio;
  if (height > max) {
    height = max;
    width = height * ratio;
  }
  return {
    x: 60 - width / 2,
    y: 56 - height / 2,
    width,
    height,
    guideX: 60 - height / 2,
    guideY: 56 - width / 2,
    guideWidth: height,
    guideHeight: width,
  };
}
