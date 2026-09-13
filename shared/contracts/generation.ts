export const GENERATION_MODEL_IDS = [
  "nano-banana-2",
  "nano-banana-pro",
  "gpt-image-2.5-sunburst",
  "gpt-image-2",
  "gpt-image-2.5-flare",
] as const;

export type GenerationModelId = (typeof GENERATION_MODEL_IDS)[number];

export const GPT_IMAGE_MODEL_IDS = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2",
  "gpt-image-2.5-flare",
] as const satisfies readonly GenerationModelId[];

export function isGptImageModelId(
  modelId: GenerationModelId,
): boolean {
  return GPT_IMAGE_MODEL_IDS.includes(
    modelId as (typeof GPT_IMAGE_MODEL_IDS)[number],
  );
}

export const GENERATION_ASPECT_RATIOS = [
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
] as const;

export type GenerationAspectRatio =
  (typeof GENERATION_ASPECT_RATIOS)[number];

export const GENERATION_RESOLUTIONS = ["1K", "2K", "4K"] as const;
export type GenerationResolution = (typeof GENERATION_RESOLUTIONS)[number];

export const GENERATION_COUNTS = [1, 2, 4] as const;
export type GenerationCount = (typeof GENERATION_COUNTS)[number];

export const GENERATION_THINKING_LEVELS = ["low", "high"] as const;
export type GenerationThinkingLevel =
  (typeof GENERATION_THINKING_LEVELS)[number];

export const GPT_IMAGE_QUALITIES = ["auto", "low", "medium", "high"] as const;
export type GptImageQuality = (typeof GPT_IMAGE_QUALITIES)[number];

export const GPT_IMAGE_BACKGROUNDS = ["auto", "transparent"] as const;
export type GptImageBackground = (typeof GPT_IMAGE_BACKGROUNDS)[number];

export const GPT_IMAGE_OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;
export type GptImageOutputFormat = (typeof GPT_IMAGE_OUTPUT_FORMATS)[number];

export const MAX_GENERATION_REFERENCES = 10;

export const GENERATION_JOB_STATES = [
  "queued",
  "running",
  "refining",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type GenerationJobState = (typeof GENERATION_JOB_STATES)[number];

export type GenerationErrorCode =
  | "MODEL_TIMEOUT"
  | "MODEL_REJECTED"
  | "CAPACITY_BUSY"
  | "SUBMISSION_UNKNOWN"
  | "INTERNAL_ERROR";

export type GenerationError = Readonly<{
  code: GenerationErrorCode;
  title: string;
  message: string;
  retryable: boolean;
}>;

export type GenerationReference = Readonly<{
  id: string;
  url: string;
  name: string;
  status: "uploading" | "ready" | "failed";
  errorMessage?: string;
}>;

export type GenerationInputDraft = {
  prompt: string;
  composerPrompt?: string;
  references: GenerationReference[];
  modelId: GenerationModelId;
  catalogModelId?: string;
  expectedPriceVersion?: number;
  catalogModelName?: string;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  thinkingLevel?: GenerationThinkingLevel;
  googleSearch?: boolean;
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
  projectId?: string | null;
};

export type GenerationInputSnapshot = Readonly<{
  prompt: string;
  /** Project context only; never sent as the model prompt. */
  composerPrompt?: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  catalogModelId?: string;
  expectedPriceVersion?: number;
  catalogModelName?: string;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  thinkingLevel?: GenerationThinkingLevel;
  googleSearch?: boolean;
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
  projectId?: string | null;
}>;

export type GenerationOutput = Readonly<{
  id: string;
  height?: number;
  previewUrl: string;
  previewPosition: string;
  width?: number;
}>;

export type GenerationJob = Readonly<{
  id: string;
  input: GenerationInputSnapshot;
  state: GenerationJobState;
  outputs: readonly GenerationOutput[];
  error: GenerationError | null;
  createdAt: string;
  updatedAt: string;
}>;
