/**
 * @param {{
 *   aspectRatio: string,
 *   background?: string,
 *   count: number,
 *   googleSearch?: boolean,
 *   modelId: string,
 *   outputFormat?: string,
 *   prompt: string,
 *   references: readonly { id: string, status?: string }[],
 *   resolution: string,
 *   quality?: string,
 *   thinkingLevel?: string,
 * }} draft
 */
export function createComposerCheckpoint(draft) {
  return JSON.stringify({
    aspectRatio: draft.aspectRatio,
    background: draft.background ?? "auto",
    count: draft.count,
    googleSearch: draft.googleSearch === true,
    modelId: draft.modelId,
    outputFormat:
      draft.outputFormat ?? (draft.modelId === "gpt-image-2" ? "jpeg" : "png"),
    prompt: draft.prompt.trim(),
    references: draft.references.map((reference) => ({
      id: reference.id,
      status: reference.status ?? "ready",
    })),
    resolution: draft.resolution,
    quality: draft.quality ?? "auto",
    thinkingLevel: draft.thinkingLevel ?? "low",
  });
}

/**
 * @param {{ checkpoint: string, current: string, hasUnprojectedWork?: boolean }} input
 */
export function hasMeaningfulUnsavedChanges(input) {
  return input.current !== input.checkpoint || input.hasUnprojectedWork === true;
}
