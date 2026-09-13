import type {
  GenerationInputDraft,
  GenerationInputSnapshot,
} from "@/shared/contracts/generation";
import {
  resolveGenerationThinkingLevelForModel,
  resolveGptImageOptionsForModel,
} from "@/features/creation/generation-options";

export type {
  GenerationAspectRatio,
  GenerationCount,
  GenerationInputDraft,
  GenerationInputSnapshot,
  GenerationModelId,
  GenerationReference,
  GenerationResolution,
  GenerationThinkingLevel,
  GptImageBackground,
  GptImageOutputFormat,
  GptImageQuality,
} from "@/shared/contracts/generation";

export function createGenerationInputSnapshot(
  draft: GenerationInputDraft,
): GenerationInputSnapshot {
  const references = draft.references.map((reference) =>
    Object.freeze({ ...reference }),
  );

  const gptImageOptions = resolveGptImageOptionsForModel(draft.modelId, draft);
  return Object.freeze({
    prompt: draft.prompt.trim(),
    ...(draft.composerPrompt ? { composerPrompt: draft.composerPrompt.trim() } : {}),
    references: Object.freeze(references),
    modelId: draft.modelId,
    ...(draft.expectedPriceVersion ? { expectedPriceVersion: draft.expectedPriceVersion } : {}),
    ...(draft.catalogModelId ? { catalogModelId: draft.catalogModelId } : {}),
    aspectRatio: draft.aspectRatio,
    resolution: draft.resolution,
    count: draft.count,
    thinkingLevel: resolveGenerationThinkingLevelForModel(draft.modelId),
    googleSearch:
      draft.modelId === "nano-banana-2" && draft.googleSearch === true,
    ...gptImageOptions,
    projectId: draft.projectId ?? null,
  });
}

export function restoreGenerationInputSnapshot(
  snapshot: GenerationInputSnapshot,
): GenerationInputDraft {
  return {
    prompt: snapshot.prompt,
    references: snapshot.references.map((reference) => ({ ...reference })),
    modelId: snapshot.modelId,
    ...(snapshot.catalogModelId ? { catalogModelId: snapshot.catalogModelId } : {}),
    aspectRatio: snapshot.aspectRatio,
    resolution: snapshot.resolution,
    count: snapshot.count,
    thinkingLevel:
      snapshot.thinkingLevel ??
      resolveGenerationThinkingLevelForModel(snapshot.modelId),
    googleSearch: snapshot.googleSearch === true,
    ...resolveGptImageOptionsForModel(snapshot.modelId, snapshot),
    projectId: snapshot.projectId ?? null,
  };
}
