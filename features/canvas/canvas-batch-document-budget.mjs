import { canvasImageSlotFrozenInput } from "./canvas-image-slots.mjs";

// Match the current cloud canvas-document ceiling; this is a byte budget,
// not a separate cap on tasks, candidates, or concurrent requests.
export const CANVAS_BATCH_DOCUMENT_BYTE_LIMIT = 1024 * 1024;
const UUID_PLACEHOLDER = "00000000-0000-4000-8000-000000000000";
const utf8 = new TextEncoder();

/** baseBytes already includes the target node's empty imageSlots: [] array. */
export function createCanvasBatchDocumentBudget(baseBytes) {
  if (!Number.isSafeInteger(baseBytes) || baseBytes < 0) {
    throw new RangeError("Canvas document base bytes must be a nonnegative safe integer.");
  }
  let bytes = baseBytes;
  let slots = 0;
  return {
    get bytes() { return bytes; },
    append(snapshot, count) {
      if (!Number.isSafeInteger(count) || count < 0 || bytes > CANVAS_BATCH_DOCUMENT_BYTE_LIMIT) return false;
      if (!count) return true;
      let recordBytes;
      try {
        const record = { id: UUID_PLACEHOLDER, requestKey: UUID_PLACEHOLDER,
          input: canvasImageSlotFrozenInput({ ...snapshot, count: 1 }) };
        recordBytes = utf8.encode(JSON.stringify(record)).byteLength;
      } catch {
        return false;
      }
      // Each accepted record has one comma except the first record of the
      // previously empty array. BigInt keeps astronomical counts precise.
      const additional = BigInt(recordBytes + 1) * BigInt(count) - (slots ? 0n : 1n);
      const next = BigInt(bytes) + additional;
      if (next > BigInt(CANVAS_BATCH_DOCUMENT_BYTE_LIMIT)) return false;
      bytes = Number(next);
      slots += count;
      return true;
    },
  };
}
