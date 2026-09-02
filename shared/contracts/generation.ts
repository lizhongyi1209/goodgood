export const GENERATION_MODEL_IDS = [
  "nano-banana-2",
  "nano-banana-pro",
  "gpt-image-2",
] as const;

export type GenerationModelId = (typeof GENERATION_MODEL_IDS)[number];

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
  references: GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  projectId?: string | null;
};

export type GenerationInputSnapshot = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  projectId?: string | null;
}>;

export type GenerationOutput = Readonly<{
  id: string;
  previewUrl: string;
  previewPosition: string;
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
