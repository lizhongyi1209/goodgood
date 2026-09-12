/**
 * A separator is exactly three ASCII hyphens on its own line.
 * @param {string} prompt
 */
export function parsePromptBatch(prompt) {
  const source = prompt.replace(/\r\n?/g, "\n");
  const segments = source.split(/^[\t ]*---[\t ]*$/m);
  return Object.freeze({
    hasSeparator: segments.length > 1,
    prompts: Object.freeze(segments.map((segment) => segment.trim()).filter(Boolean)),
  });
}

/** @param {string} prompt @param {number} count */
export function promptBatchOutputCount(prompt, count) {
  return parsePromptBatch(prompt).prompts.length * count;
}

/** @param {string} segment @param {string} context */
export function promptContextForRetry(segment, context) {
  const batch = parsePromptBatch(context);
  return batch.hasSeparator && batch.prompts.includes(segment) ? context : segment;
}
