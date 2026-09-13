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
const GPT_IMAGE_MODEL_IDS = new Set([
  "gpt-image-2.5-sunburst",
  "gpt-image-2",
  "gpt-image-2.5-flare",
]);

export function createComposerCheckpoint(draft) {
  return JSON.stringify({
    aspectRatio: draft.aspectRatio,
    background: draft.background ?? "auto",
    count: draft.count,
    googleSearch: draft.googleSearch === true,
    modelId: draft.modelId,
    ...(draft.imageLine && draft.imageLine !== "special" ? { imageLine: draft.imageLine } : {}),
    ...(draft.catalogModelId ? { catalogModelId: draft.catalogModelId } : {}),
    outputFormat:
      draft.outputFormat ?? (GPT_IMAGE_MODEL_IDS.has(draft.modelId) ? "jpeg" : "png"),
    prompt: draft.prompt.trim(),
    references: draft.references.map((reference) => ({
      id: reference.id,
      status: reference.status ?? "ready",
    })),
    resolution: draft.resolution,
    quality: draft.quality ?? "auto",
    thinkingLevel:
      draft.thinkingLevel ??
      (draft.modelId === "nano-banana-2" ? "high" : "low"),
  });
}

/**
 * @param {{ checkpoint: string, current: string, hasUnprojectedWork?: boolean }} input
 */
export function hasMeaningfulUnsavedChanges(input) {
  return input.current !== input.checkpoint || input.hasUnprojectedWork === true;
}
