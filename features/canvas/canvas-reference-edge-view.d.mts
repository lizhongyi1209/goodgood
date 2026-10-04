import type { Edge } from "@xyflow/react";

export function createCanvasReferenceEdgeView(): <E extends Edge>(edges: E[], counts: ReadonlyMap<string, number>) => E[];
