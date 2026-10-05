import type { GenerationInputSnapshot } from "@/shared/contracts/generation";
export const CANVAS_BATCH_DOCUMENT_BYTE_LIMIT: number;
export type CanvasBatchDocumentBudget = {
  readonly bytes: number;
  append(snapshot: GenerationInputSnapshot, count: number): boolean;
};
/** baseBytes includes an empty imageSlots array. count adds one-output frozen cloud slot records. */
export function createCanvasBatchDocumentBudget(baseBytes: number): CanvasBatchDocumentBudget;
