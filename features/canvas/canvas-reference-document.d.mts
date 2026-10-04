import type { CanvasPageDocument, CanvasProjectDocument } from "@/shared/contracts/canvas-project";
export function encodeCanvasReferencePage<T extends CanvasPageDocument>(page: T, pageIndex?: number): T;
export function decodeCanvasReferencePage<T extends CanvasPageDocument>(page: T): T;
export function decodeCanvasReferenceDocument<T extends CanvasProjectDocument>(document: T): T;
