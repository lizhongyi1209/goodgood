import type {
  GenerationAspectRatio,
  GenerationResolution,
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
  { id: "1:8", label: "1 : 8", value: 1 / 8, dimensions: { "1K": { width: 384, height: 3072 }, "2K": { width: 768, height: 6144 }, "4K": { width: 1536, height: 12288 } }, mode: "portrait" },
  { id: "1:4", label: "1 : 4", value: 1 / 4, dimensions: { "1K": { width: 512, height: 2048 }, "2K": { width: 1024, height: 4096 }, "4K": { width: 2048, height: 8192 } }, mode: "portrait" },
  { id: "9:16", label: "9 : 16", value: 9 / 16, dimensions: { "1K": { width: 768, height: 1376 }, "2K": { width: 1536, height: 2752 }, "4K": { width: 3072, height: 5504 } }, mode: "portrait" },
  { id: "2:3", label: "2 : 3", value: 2 / 3, dimensions: { "1K": { width: 848, height: 1264 }, "2K": { width: 1696, height: 2528 }, "4K": { width: 3392, height: 5056 } }, mode: "portrait" },
  { id: "3:4", label: "3 : 4", value: 3 / 4, dimensions: { "1K": { width: 896, height: 1200 }, "2K": { width: 1792, height: 2400 }, "4K": { width: 3584, height: 4800 } }, mode: "portrait" },
  { id: "4:5", label: "4 : 5", value: 4 / 5, dimensions: { "1K": { width: 928, height: 1152 }, "2K": { width: 1856, height: 2304 }, "4K": { width: 3712, height: 4608 } }, mode: "portrait" },
  { id: "1:1", label: "1 : 1", value: 1, dimensions: { "1K": { width: 1024, height: 1024 }, "2K": { width: 2048, height: 2048 }, "4K": { width: 4096, height: 4096 } }, mode: "square" },
  { id: "5:4", label: "5 : 4", value: 5 / 4, dimensions: { "1K": { width: 1152, height: 928 }, "2K": { width: 2304, height: 1856 }, "4K": { width: 4608, height: 3712 } }, mode: "landscape" },
  { id: "4:3", label: "4 : 3", value: 4 / 3, dimensions: { "1K": { width: 1200, height: 896 }, "2K": { width: 2400, height: 1792 }, "4K": { width: 4800, height: 3584 } }, mode: "landscape" },
  { id: "3:2", label: "3 : 2", value: 3 / 2, dimensions: { "1K": { width: 1264, height: 848 }, "2K": { width: 2528, height: 1696 }, "4K": { width: 5056, height: 3392 } }, mode: "landscape" },
  { id: "16:9", label: "16 : 9", value: 16 / 9, dimensions: { "1K": { width: 1376, height: 768 }, "2K": { width: 2752, height: 1536 }, "4K": { width: 5504, height: 3072 } }, mode: "landscape" },
  { id: "21:9", label: "21 : 9", value: 21 / 9, dimensions: { "1K": { width: 1584, height: 672 }, "2K": { width: 3168, height: 1344 }, "4K": { width: 6336, height: 2688 } }, mode: "landscape" },
  { id: "4:1", label: "4 : 1", value: 4, dimensions: { "1K": { width: 2048, height: 512 }, "2K": { width: 4096, height: 1024 }, "4K": { width: 8192, height: 2048 } }, mode: "landscape" },
  { id: "8:1", label: "8 : 1", value: 8, dimensions: { "1K": { width: 3072, height: 384 }, "2K": { width: 6144, height: 768 }, "4K": { width: 12288, height: 1536 } }, mode: "landscape" },
] as const satisfies readonly GenerationRatioOption[];

export const GENERATION_RATIO_MODES = [
  ["portrait", "竖版"],
  ["square", "方形"],
  ["landscape", "横版"],
] as const;

export const DEFAULT_GENERATION_RATIO_BY_MODE = {
  portrait: "4:5",
  square: "1:1",
  landscape: "16:9",
} as const satisfies Readonly<Record<GenerationRatioMode, GenerationAspectRatio>>;

export const GENERATION_RESOLUTION_OPTIONS = [
  { value: "1K", label: "标准" },
  { value: "2K", label: "高清" },
  { value: "4K", label: "超清" },
] as const satisfies readonly Readonly<{
  value: GenerationResolution;
  label: string;
}>[];

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
