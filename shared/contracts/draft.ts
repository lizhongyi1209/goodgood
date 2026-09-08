import type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
  GenerationThinkingLevel,
} from "@/shared/contracts/generation";

export type CreationDraftState = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  thinkingLevel?: GenerationThinkingLevel;
  googleSearch?: boolean;
}>;

export type CreationDraftRecord = Readonly<{
  state: CreationDraftState;
  version: number;
  expiresAt: string;
  updatedAt: string;
}>;
