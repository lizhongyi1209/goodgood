/**
 * @param {{
 *   aspectRatio: string,
 *   count: number,
 *   modelId: string,
 *   prompt: string,
 *   references: readonly { id: string, status?: string }[],
 *   resolution: string,
 * }} draft
 */
export function createComposerCheckpoint(draft) {
  return JSON.stringify({
    aspectRatio: draft.aspectRatio,
    count: draft.count,
    modelId: draft.modelId,
    prompt: draft.prompt.trim(),
    references: draft.references.map((reference) => ({
      id: reference.id,
      status: reference.status ?? "ready",
    })),
    resolution: draft.resolution,
  });
}

/**
 * @param {{ checkpoint: string, current: string, hasUnprojectedWork?: boolean }} input
 */
export function hasMeaningfulUnsavedChanges(input) {
  return input.current !== input.checkpoint || input.hasUnprojectedWork === true;
}
