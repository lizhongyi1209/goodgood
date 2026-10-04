import { canvasNodeAbsolutePosition } from "./canvas-groups.mjs";
import { canvasConnectionCreatesCycle } from "./canvas-text-input.mjs";

export const CANVAS_BATCH_REFERENCE_HANDLE = "selection-reference";

export function imageSourceAsset(node) {
  if (node?.type === "sourceImage") return {
    assetId: node.data.assetId, generated: node.data.assetKind === "generated",
    name: node.data.name, previewUrl: node.data.previewUrl,
  };
  if (node?.type === "imageResult") {
    if (node.data.job.state !== "succeeded") return null;
    const output = node.data.job.outputs[node.data.index];
    if (output?.id) return { assetId: output.id, generated: true,
      name: `生成图片 ${node.data.index + 1}`, previewUrl: output.previewUrl };
  }
  return null;
}

export function canConnectCanvasImage(node) {
  const asset = imageSourceAsset(node);
  return Boolean(asset && (asset.assetId || node?.type === "sourceImage" && node.data.uploadState));
}

export function canvasReferenceGroupMembers(group, nodes) {
  const members = nodes.filter((node) => node.parentId === group.id);
  const savedOrder = group.data?.referenceOrder ?? group.referenceOrder;
  if (!savedOrder) return members.sort((a, b) => {
    const ap = canvasNodeAbsolutePosition(a, nodes), bp = canvasNodeAbsolutePosition(b, nodes);
    return ap.y - bp.y || ap.x - bp.x || a.id.localeCompare(b.id);
  });
  const order = new Map(savedOrder.map((id, i) => [id, i]));
  return members.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
}

export function canvasReferenceSelection(nodes) {
  const selected = nodes.filter((node) => node.selected && !node.hidden);
  if (selected.length < 2 || selected.some((node) => !canConnectCanvasImage(node) || node.dragging || node.resizing)) return [];
  return selected.sort((a, b) => {
    const ap = canvasNodeAbsolutePosition(a, nodes), bp = canvasNodeAbsolutePosition(b, nodes);
    return ap.y - bp.y || ap.x - bp.x || a.id.localeCompare(b.id);
  });
}

export function canvasReferenceInputKey(edge, sourceId, grouped = false) {
  return grouped ? `${edge.id}:${sourceId}` : edge.id;
}

export function canvasReferenceInputKeys(nodes, edges) {
  return new Set([...edges.map((edge) => edge.id), ...canvasReferenceInputs(nodes, edges).map((input) => input.key)]);
}

/** A group edge is a collection of independent image inputs, never a collage. */
export function canvasReferenceInputs(nodes, edges, targetId) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge) => {
    if (edge.sourceHandle !== "reference" || targetId && edge.target !== targetId ||
        byId.get(edge.target)?.type !== "imageGenerator") return [];
    const source = byId.get(edge.source);
    const grouped = source?.type === "group";
    const excluded = new Set(edge.data?.excludedSourceIds ?? edge.excludedSourceIds ?? []);
    const members = grouped ? canvasReferenceGroupMembers(source, nodes) : source ? [source] : [];
    return members.filter((node) => !excluded.has(node.id)).map((node) => ({
      edgeId: edge.id, key: canvasReferenceInputKey(edge, node.id, grouped), sourceId: node.id,
      grouped, node, asset: imageSourceAsset(node),
    }));
  });
}

function identities(input, converted) {
  const asset = input.asset;
  const reference = converted[input.key];
  return [asset?.assetId ? `${asset.generated ? "generated" : "reference"}:${asset.assetId}` : `node:${input.sourceId}`,
    ...(reference?.status === "ready" ? [`reference:${reference.id}`] : [])];
}

export function uniqueCanvasReferenceInputs(inputs, direct = [], converted = {}) {
  const seen = new Set(direct.map((reference) => `reference:${reference.id}`));
  return inputs.filter((input) => {
    const keys = identities(input, converted);
    const duplicate = keys.some((key) => seen.has(key));
    keys.forEach((key) => seen.add(key));
    return !duplicate;
  });
}

/** Preflight the entire batch before grouping or changing any existing references. */
export function planCanvasReferenceConnection(nodes, edges, connection, members, direct = [], converted = {}, limit = 10) {
  const target = nodes.find((node) => node.id === connection.target);
  const source = nodes.find((node) => node.id === connection.source);
  if (target?.type !== "imageGenerator" || connection.targetHandle !== "reference" ||
      !["reference", CANVAS_BATCH_REFERENCE_HANDLE].includes(connection.sourceHandle) || !members.length ||
      members.some((node) => !canConnectCanvasImage(node))) return { valid: false, message: "请选择可用的图片，连接到图片生成器。" };
  if (connection.sourceHandle !== CANVAS_BATCH_REFERENCE_HANDLE &&
      edges.some((edge) => edge.source === source?.id && edge.target === target.id && edge.sourceHandle === "reference")) {
    return { valid: false, message: "已连接到该生成器，无需重复连接。" };
  }
  const expanded = edges.flatMap((edge) => nodes.find((node) => node.id === edge.source)?.type === "group"
    ? canvasReferenceInputs(nodes, [edge]).map((input) => ({ ...edge, source: input.sourceId })) : [edge]);
  if (members.some((node) => canvasConnectionCreatesCycle({ ...connection, source: node.id }, expanded))) {
    return { valid: false, message: "这些图片不能连接到该生成器，请选择其他图片。" };
  }
  const existing = canvasReferenceInputs(nodes, edges, target.id);
  const candidates = members.map((node) => ({ key: `candidate:${node.id}`, sourceId: node.id, node, asset: imageSourceAsset(node) }));
  // Resolve candidates using conversions already available for the same image.
  const candidateConversions = { ...converted };
  for (const candidate of candidates) {
    const match = canvasReferenceInputs(nodes, edges).find((input) => identities(input, converted).some((key) => identities(candidate, {}).includes(key)));
    if (match && converted[match.key]) candidateConversions[candidate.key] = converted[match.key];
  }
  const unique = uniqueCanvasReferenceInputs([...existing, ...candidates], direct, candidateConversions);
  const additions = unique.filter((input) => input.key.startsWith("candidate:"));
  const count = direct.length + unique.length;
  if (count > limit) return { valid: false, message: `最多使用${limit}张参考图，请减少${count - limit}张后再连接。` };
  if (!additions.length) return { valid: false, message: "这些图片已在参考图中，无需重复连接。" };
  const included = new Set(additions.map((input) => input.sourceId));
  return { valid: true, excludedSourceIds: members.filter((node) => !included.has(node.id)).map((node) => node.id) };
}

export function expandCanvasGroupReferences(nodes, edges, groupIds, converted = {}) {
  const removed = new Set(groupIds), nextConverted = { ...converted };
  const nextEdges = edges.flatMap((edge) => {
    if (!removed.has(edge.source)) return [edge];
    const inputs = canvasReferenceInputs(nodes, [edge]);
    for (const key of Object.keys(nextConverted)) if (key === edge.id || key.startsWith(`${edge.id}:`)) delete nextConverted[key];
    return inputs.map((input) => {
      const id = `reference-${input.sourceId}-${edge.target}`;
      if (converted[input.key]?.status === "ready") nextConverted[id] = converted[input.key];
      return { ...edge, id, source: input.sourceId, data: undefined, label: undefined };
    });
  });
  // Regroup/ungroup must not create duplicate ordinary edges.
  const seen = new Set();
  return { edges: nextEdges.filter((edge) => { if (seen.has(edge.id)) return false; seen.add(edge.id); return true; }), converted: nextConverted };
}
