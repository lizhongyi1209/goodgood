import { canvasBatchGroupCountFromEdges, canvasBatchModeFromEdges, canvasBatchReferenceHandle,
  isCanvasBatchGeneratorId, parseCanvasBatchReferenceHandle } from "./canvas-batch-reference-model.mjs";
import { canvasReferenceInputs } from "./canvas-reference-sources.mjs";

/** Keep edge IDs and conversion keys stable while later ports move forward. */
export function canvasBatchEdgesWithConfiguration(edges, targetId, mode, removedIndices = []) {
  const removed = new Set(removedIndices);
  return edges.flatMap((edge) => {
    if (edge.target !== targetId || edge.sourceHandle !== "reference") return [edge];
    const port = parseCanvasBatchReferenceHandle(edge.targetHandle);
    if (!port) return [edge];
    if (removed.has(port.index)) return [];
    const index = port.index - [...removed].filter((value) => value < port.index).length;
    const targetHandle = canvasBatchReferenceHandle(index, mode);
    return [targetHandle === edge.targetHandle ? edge : { ...edge, targetHandle }];
  });
}

function occupiedGroups(nodes, edges) {
  const byId = new Map(edges.map((edge) => [edge.id, edge]));
  const occupied = new Map();
  // Failed and loading inputs still occupy a group; readiness does not remove it.
  for (const input of canvasReferenceInputs(nodes, edges)) {
    const edge = byId.get(input.edgeId);
    const port = parseCanvasBatchReferenceHandle(edge?.targetHandle);
    if (!port || !isCanvasBatchGeneratorId(edge?.target)) continue;
    if (!occupied.has(edge.target)) occupied.set(edge.target, new Set());
    occupied.get(edge.target).add(port.index);
  }
  return occupied;
}

/** Call only for explicit reference removal, never from a render/restore effect. */
export function compactCanvasBatchGroupsAfterRemoval(nodes, beforeEdges, afterEdges) {
  const before = occupiedGroups(nodes, beforeEdges);
  const after = occupiedGroups(nodes, afterEdges);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const configurations = [];
  let edges = [...afterEdges];
  for (const [id, occupied] of before) {
    const node = byId.get(id);
    if (node?.type !== "imageGenerator") continue;
    const removedIndices = [...occupied].filter((index) => !after.get(id)?.has(index)).sort((a, b) => a - b);
    if (!removedIndices.length) continue;
    const count = canvasBatchGroupCountFromEdges(beforeEdges, id, node.data?.batchGroupCount);
    const mode = canvasBatchModeFromEdges(beforeEdges, id, node.data?.batchMode);
    const groupCount = Math.max(1, count - removedIndices.length);
    configurations.push({ id, mode, groupCount });
    edges = canvasBatchEdgesWithConfiguration(edges, id, mode, removedIndices);
  }
  return { edges, configurations };
}
