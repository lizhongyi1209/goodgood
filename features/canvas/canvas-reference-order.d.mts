export function directReferenceOrderKey(id: string): string;
export function linkedReferenceOrderKey(id: string): string;
export function orderCanvasReferences<T extends { orderKey: string }>(items: readonly T[], order?: readonly string[]): T[];
export function moveCanvasReference<T extends string>(keys: readonly T[], source: T, target: T): readonly T[];
export function remapCanvasReferenceOrder(order: readonly string[] | undefined, nodeIds: ReadonlyMap<string, string>): string[] | undefined;
export function encodeCanvasReferenceOrderPage<T extends import("@/shared/contracts/canvas-project").CanvasPageDocument>(page: T, pageIndex?: number): T;
export function decodeCanvasReferenceOrderPage<T extends import("@/shared/contracts/canvas-project").CanvasPageDocument>(page: T): T;
