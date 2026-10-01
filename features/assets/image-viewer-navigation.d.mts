export function adjacentViewerIndex(index: number, count: number, direction: number): number;
export function attachCenteredViewerRail(rail: HTMLElement | null, thumbnails: readonly HTMLElement[], selected: HTMLElement | undefined): () => void;
export function createViewerWheelStep(): (event: Pick<WheelEvent, "ctrlKey" | "metaKey" | "deltaX" | "deltaY" | "deltaMode" | "timeStamp">, height: number) => number | null;
