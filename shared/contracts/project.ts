import type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationJob,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
} from "@/shared/contracts/generation";

export type ProjectStateSnapshot = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
}>;

export type ProjectRecord = Readonly<{
  id: string;
  name: string;
  state: ProjectStateSnapshot;
  batches: readonly GenerationJob[];
  createdAt: string;
  updatedAt: string;
}>;

export type ProjectSaveDraft = Readonly<{
  projectId?: string | null;
  idempotencyKey?: string;
  name: string;
  state: ProjectStateSnapshot;
  batchIds: readonly string[];
}>;
