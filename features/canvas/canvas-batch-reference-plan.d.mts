export const CANVAS_BATCH_MAX_GROUPS: 5;
export const CANVAS_BATCH_REFERENCE_LIMIT: 10;
export const CANVAS_BATCH_PREVIEW_LIMIT: 6;
export type CanvasBatchReferenceMode = "all" | "paired";
export type CanvasBatchReferenceItem = { reference: { id: string; status: "uploading" | "ready" | "failed"; name: string } };
export type CanvasBatchReferenceGroup<T extends CanvasBatchReferenceItem> = Readonly<{ id: string; name: string; items: readonly T[] }>;
export type CanvasBatchReferenceCombination<T extends CanvasBatchReferenceItem> = { key: string; index: number; items: T[] };
export type CanvasBatchReferencePlan<T extends CanvasBatchReferenceItem> = {
  valid: boolean;
  error: string | null;
  ready: boolean;
  total: number;
  referenceCounts: Map<number, number>;
  preview: CanvasBatchReferenceCombination<T>[];
  combinations(): IterableIterator<CanvasBatchReferenceCombination<T>>;
};
export function validateCanvasBatchReferenceCapacity<T extends CanvasBatchReferenceItem>(common: readonly T[],
  groups: readonly CanvasBatchReferenceGroup<T>[], mode?: CanvasBatchReferenceMode): { valid: boolean; error: string | null; maxReferences: number };
export function planCanvasBatchReferences<T extends CanvasBatchReferenceItem>(common: readonly T[],
  groups: readonly CanvasBatchReferenceGroup<T>[], mode: CanvasBatchReferenceMode): CanvasBatchReferencePlan<T>;
