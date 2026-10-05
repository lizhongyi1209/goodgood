import type { CanvasBatchReferenceItem, CanvasBatchReferenceGroup, CanvasBatchReferenceMode,
  CanvasBatchReferenceCombination } from "./canvas-batch-reference-plan.mjs";
export const CANVAS_BATCH_COMBINATIONS_PER_PAGE: 12;
export type CanvasBatchReferencePage<T extends CanvasBatchReferenceItem> = {
  total: number;
  page: number;
  pageCount: number;
  pageSize: 12;
  combinations: CanvasBatchReferenceCombination<T>[];
  error: string | null;
};
/** Pages are 1-based; combination indexes remain 0-based. Only up to 12 rows are expanded. */
export function pageCanvasBatchReferences<T extends CanvasBatchReferenceItem>(common: readonly T[],
  groups: readonly CanvasBatchReferenceGroup<T>[], mode: CanvasBatchReferenceMode, page?: number): CanvasBatchReferencePage<T>;
