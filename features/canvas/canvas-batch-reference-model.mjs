export const CANVAS_BATCH_REFERENCE_GROUP_LIMIT = 5;

const BATCH_GENERATOR_PREFIX = "batch-generator-";
const BATCH_HANDLE = /^batch-(all|paired)-([1-5])$/;

/** Batch nodes use the existing authorized imageGenerator wire type. */
export function isCanvasBatchGeneratorId(id) {
  return typeof id === "string" && id.startsWith(BATCH_GENERATOR_PREFIX) && id.length > BATCH_GENERATOR_PREFIX.length;
}

export function canvasBatchReferenceHandle(index, mode = "all") {
  if (!Number.isInteger(index) || index < 1 || index > CANVAS_BATCH_REFERENCE_GROUP_LIMIT || !["all", "paired"].includes(mode)) {
    throw new RangeError("Invalid batch reference group or mode.");
  }
  return "batch-" + mode + "-" + index;
}

export function parseCanvasBatchReferenceHandle(handle) {
  const match = typeof handle === "string" ? BATCH_HANDLE.exec(handle) : null;
  return match ? { index: Number(match[2]), mode: match[1] } : null;
}

export function canvasBatchModeFromEdges(edges, targetId, fallback = "all") {
  for (const edge of edges) {
    if (edge.target !== targetId || edge.sourceHandle !== "reference") continue;
    const group = parseCanvasBatchReferenceHandle(edge.targetHandle);
    if (group) return group.mode;
  }
  return fallback === "paired" ? "paired" : "all";
}

export function canvasBatchGroupCountFromEdges(edges, targetId, min = 1) {
  let count = Number.isInteger(min) ? Math.max(1, Math.min(CANVAS_BATCH_REFERENCE_GROUP_LIMIT, min)) : 1;
  for (const edge of edges) {
    if (edge.target !== targetId || edge.sourceHandle !== "reference") continue;
    const group = parseCanvasBatchReferenceHandle(edge.targetHandle);
    if (group) count = Math.max(count, group.index);
  }
  return count;
}

/** Keep ordinary/public IDs unchanged; separate repeated sources by batch port. */
export function canvasReferenceGroupEdgeId(groupId, targetId, targetHandle = "reference") {
  const base = "reference-" + groupId + "-" + targetId;
  return parseCanvasBatchReferenceHandle(targetHandle) ? base + "-" + targetHandle : base;
}
