import type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
} from "@/shared/contracts/generation";

export type CreationDraftState = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
}>;

export type CreationDraftRecord = Readonly<{
  state: CreationDraftState;
  version: number;
  expiresAt: string;
  updatedAt: string;
}>;
