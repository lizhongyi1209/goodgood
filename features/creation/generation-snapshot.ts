export type GenerationModelId =
  | "nano-banana-2"
  | "nano-banana-pro"
  | "gpt-image-2";

export type GenerationResolution = "1K" | "2K" | "4K";
export type GenerationCount = 1 | 2 | 4;

export type GenerationReference = Readonly<{
  id: string;
  url: string;
  name: string;
}>;

export type GenerationInputDraft = {
  prompt: string;
  references: GenerationReference[];
  modelId: GenerationModelId;
  ratioIndex: number;
  resolution: GenerationResolution;
  count: GenerationCount;
};

export type GenerationInputSnapshot = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  ratioIndex: number;
  resolution: GenerationResolution;
  count: GenerationCount;
}>;

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
    ratioIndex: draft.ratioIndex,
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
    ratioIndex: snapshot.ratioIndex,
    resolution: snapshot.resolution,
    count: snapshot.count,
  };
}
