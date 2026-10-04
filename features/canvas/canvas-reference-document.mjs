const BATCH_EDGE_ID = /^batchref-\d+-\d+-\d+$/;
const groupKey = (groupId, targetId) => `reference-${groupId}-${targetId}`;
const memberKey = (edgeId, memberId) => `${edgeId}:${memberId}`;

function orderedMembers(group, nodes) {
  const order = new Map((group.referenceOrder ?? []).map((id, index) => [id, index]));
  return nodes.filter((node) => node.parentId === group.id)
    .sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
}

/** Keep cloud writes compatible with the already deployed node/edge validator. */
export function encodeCanvasReferencePage(page, pageIndex = 0) {
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const ordered = new Map(page.nodes.filter((node) => node.type === "group")
    .map((group) => [group.id, orderedMembers(group, page.nodes)]));
  const emitted = new Set();
  const nodes = page.nodes.flatMap((node) => {
    if (node.parentId && ordered.has(node.parentId)) {
      if (emitted.has(node.parentId)) return [];
      emitted.add(node.parentId);
      return ordered.get(node.parentId);
    }
    const { referenceOrder: _referenceOrder, ...saved } = node;
    return [saved];
  });
  const convertedReferences = {};
  const occupiedIds = new Set(page.edges.map((edge) => edge.id));
  const edges = page.edges.flatMap((edge, edgeIndex) => {
    const source = byId.get(edge.source);
    const { excludedSourceIds: _excludedSourceIds, ...saved } = edge;
    if (source?.type !== "group") {
      if (page.convertedReferences?.[edge.id]) convertedReferences[edge.id] = page.convertedReferences[edge.id];
      return [saved];
    }
    const excluded = new Set(edge.excludedSourceIds ?? []);
    return (ordered.get(source.id) ?? []).filter((node) => !excluded.has(node.id)).map((node, index) => {
      let suffix = index;
      let id = `batchref-${pageIndex}-${edgeIndex}-${suffix}`;
      while (occupiedIds.has(id)) id = `batchref-${pageIndex}-${edgeIndex}-${++suffix}`;
      occupiedIds.add(id);
      const reference = page.convertedReferences?.[memberKey(edge.id, node.id)];
      if (reference) convertedReferences[id] = reference;
      return { ...saved, id, source: node.id, sourceHandle: "reference" };
    });
  });
  return { ...page, nodes, edges, convertedReferences };
}

/** Infer per-target omissions from encoded child edges; never collapse ordinary connections. */
export function decodeCanvasReferencePage(page) {
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const grouped = new Map();
  for (const edge of page.edges) {
    const source = byId.get(edge.source);
    if (!BATCH_EDGE_ID.test(edge.id) || edge.sourceHandle !== "reference" || edge.targetHandle !== "reference" ||
        !source?.parentId || byId.get(source.parentId)?.type !== "group" || byId.get(edge.target)?.type !== "imageGenerator") continue;
    const key = groupKey(source.parentId, edge.target);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(edge);
  }
  if (!grouped.size) return page;
  const convertedReferences = { ...page.convertedReferences };
  const emitted = new Set();
  const edges = page.edges.flatMap((edge) => {
    const source = byId.get(edge.source);
    const key = source?.parentId ? groupKey(source.parentId, edge.target) : "";
    const batch = grouped.get(key);
    if (!batch?.includes(edge)) return [edge];
    const reference = convertedReferences[edge.id];
    delete convertedReferences[edge.id];
    if (reference) convertedReferences[memberKey(key, edge.source)] = reference;
    if (emitted.has(key)) return [];
    emitted.add(key);
    const group = byId.get(source.parentId);
    const included = new Set(batch.map((item) => item.source));
    const excludedSourceIds = orderedMembers(group, page.nodes).filter((node) => !included.has(node.id)).map((node) => node.id);
    return [{ id: key, source: group.id, target: edge.target, sourceHandle: "reference", targetHandle: "reference",
      ...(excludedSourceIds.length ? { excludedSourceIds } : {}) }];
  });
  const nodes = page.nodes.map((node) => node.type === "group" && !node.referenceOrder
    ? { ...node, referenceOrder: orderedMembers(node, page.nodes).map((member) => member.id) } : node);
  return { ...page, nodes, edges, convertedReferences };
}

export function decodeCanvasReferenceDocument(document) {
  return document.schemaVersion === 2
    ? { ...document, pages: document.pages.map(decodeCanvasReferencePage) }
    : { ...decodeCanvasReferencePage(document), schemaVersion: 1 };
}
