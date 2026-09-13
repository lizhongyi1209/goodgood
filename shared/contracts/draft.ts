import type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
  GenerationThinkingLevel,
  GptImageBackground,
  GptImageOutputFormat,
  GptImageQuality,
} from "@/shared/contracts/generation";

export type CreationDraftState = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  catalogModelId?: string;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  thinkingLevel?: GenerationThinkingLevel;
  googleSearch?: boolean;
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
}>;

export type CreationDraftRecord = Readonly<{
  state: CreationDraftState;
  version: number;
  expiresAt: string;
  updatedAt: string;
}>;
