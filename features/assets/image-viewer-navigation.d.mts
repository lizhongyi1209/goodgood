export function adjacentViewerIndex(index: number, count: number, direction: number): number;
export function createViewerWheelStep(): (event: Pick<WheelEvent, "ctrlKey" | "metaKey" | "deltaX" | "deltaY" | "deltaMode" | "timeStamp">, height: number) => number | null;
