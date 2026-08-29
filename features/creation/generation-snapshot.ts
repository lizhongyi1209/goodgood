import type {
  GenerationInputDraft,
  GenerationInputSnapshot,
} from "@/shared/contracts/generation";

export type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationInputDraft,
  GenerationInputSnapshot,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
} from "@/shared/contracts/generation";

export function createGenerationInputSnapshot(
  draft: GenerationInputDraft,
): GenerationInputSnapshot {
  const references = draft.references.map((reference) =>
    Object.freeze({ ...reference }),
  );

  return Object.freeze({
    prompt: draft.prompt.trim(),
    references: Object.freeze(references),
    modelId: draft.modelId,
    aspectRatio: draft.aspectRatio,
    resolution: draft.resolution,
    count: draft.count,
  });
}

export function restoreGenerationInputSnapshot(
  snapshot: GenerationInputSnapshot,
): GenerationInputDraft {
  return {
    prompt: snapshot.prompt,
    references: snapshot.references.map((reference) => ({ ...reference })),
    modelId: snapshot.modelId,
    aspectRatio: snapshot.aspectRatio,
    resolution: snapshot.resolution,
    count: snapshot.count,
  };
}
