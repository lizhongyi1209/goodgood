export type ReferenceDragSlot = { key: string; left: number; width: number };
export type ReferenceDragLayout = { target: string; offsets: number[] };
export function canvasReferenceDragLayout(slots: readonly ReferenceDragSlot[], source: string, delta: number): ReferenceDragLayout | null;
