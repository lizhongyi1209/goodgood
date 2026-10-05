import type { Edge } from "@xyflow/react";
import type { CanvasNode } from "./canvas-workspace";
import type { CanvasBatchReferenceMode } from "./canvas-batch-reference-model.mjs";

export function canvasBatchEdgesWithConfiguration<E extends Edge>(edges: readonly E[], targetId: string,
  mode: CanvasBatchReferenceMode, removedIndices?: readonly number[]): E[];
export function compactCanvasBatchGroupsAfterRemoval<E extends Edge>(nodes: readonly CanvasNode[],
  beforeEdges: readonly E[], afterEdges: readonly E[]): {
    edges: E[];
    configurations: { id: string; mode: CanvasBatchReferenceMode; groupCount: number }[];
  };
