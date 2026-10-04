export const directReferenceOrderKey = (id) => `direct:${id}`;
export const linkedReferenceOrderKey = (id) => `linked:${id}`;

/** Unknown/new references append; deleted entries do not leave empty slots. */
export function orderCanvasReferences(items, order = []) {
  const positions = new Map(order.map((key, index) => [key, index]));
  return [...items].sort((a, b) => (positions.get(a.orderKey) ?? Infinity) - (positions.get(b.orderKey) ?? Infinity));
}

export function moveCanvasReference(keys, source, target) {
  const from = keys.indexOf(source), to = keys.indexOf(target);
  if (from < 0 || to < 0 || from === to) return keys;
  const moved = [...keys];
  moved.splice(from, 1);
  moved.splice(to, 0, source);
  return moved;
}

export function remapCanvasReferenceOrder(order, nodeIds) {
  return order?.flatMap((key) => {
    if (!key.startsWith("linked:")) return [key];
    const copied = nodeIds.get(key.slice(7));
    return copied ? [linkedReferenceOrderKey(copied)] : [];
  });
}

const ORDERED_EDGE = /^reforder-([0-9]):(.+)$/;

/** Use only fields understood by the running server: direct-ID order and edge IDs. */
export function encodeCanvasReferenceOrderPage(page, pageIndex = 0) {
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const ranks = new Map();
  const generators = Object.fromEntries(Object.entries(page.generators).map(([id, generator]) => {
    const { referenceOrder, ...draft } = generator.draft;
    if (!referenceOrder) return [id, { ...generator, draft }];
    const items = generator.directReferenceIds.map((referenceId) => ({ orderKey: directReferenceOrderKey(referenceId) }));
    const seen = new Set(generator.directReferenceIds.map((referenceId) => `reference:${referenceId}`));
    for (const edge of page.edges) {
      if (edge.target !== id || edge.sourceHandle !== "reference") continue;
      const source = byId.get(edge.source);
      const referenceId = page.convertedReferences?.[edge.id] ?? (source?.asset?.kind === "reference" ? source.asset.id : undefined);
      const identities = [referenceId ? `reference:${referenceId}` : `node:${edge.source}`,
        ...(source?.asset ? [`${source.asset.kind}:${source.asset.id}`] : [])];
      const duplicate = identities.some((identity) => seen.has(identity));
      identities.forEach((identity) => seen.add(identity));
      if (!duplicate) items.push({ orderKey: linkedReferenceOrderKey(edge.source) });
    }
    const ordered = orderCanvasReferences(items, referenceOrder);
    ranks.set(id, new Map(ordered.map((item, index) => [item.orderKey, index])));
    return [id, { ...generator, draft, directReferenceIds: ordered.flatMap((item) => item.orderKey.startsWith("direct:")
      ? [item.orderKey.slice(7)] : []) }];
  }));
  const occupied = new Set(page.edges.map((edge) => edge.id));
  const convertedReferences = { ...page.convertedReferences };
  const edges = page.edges.map((edge, index) => {
    const rank = edge.sourceHandle === "reference" ? ranks.get(edge.target)?.get(linkedReferenceOrderKey(edge.source)) : undefined;
    if (rank === undefined || rank > 9) return edge;
    const prefix = `reforder-${rank}:`;
    // Very long legacy IDs are normalized once, keeping the graph/import mapping.
    const base = prefix.length + edge.id.length <= 160 ? edge.id : `ordered-${pageIndex}-${index}`;
    let id = prefix + base;
    let suffix = 0;
    while (occupied.has(id)) id = prefix + `ordered-${pageIndex}-${index}-${++suffix}`;
    occupied.add(id);
    if (Object.hasOwn(convertedReferences, edge.id)) {
      convertedReferences[id] = convertedReferences[edge.id];
      delete convertedReferences[edge.id];
    }
    return { ...edge, id };
  });
  return { ...page, generators, edges, convertedReferences };
}

/** Decode ordering before GG-363 collapses cloud child edges back into groups. */
export function decodeCanvasReferenceOrderPage(page) {
  const orders = new Map();
  const convertedReferences = { ...page.convertedReferences };
  const edges = page.edges.map((edge) => {
    const match = ORDERED_EDGE.exec(edge.id);
    if (!match || edge.sourceHandle !== "reference" || !page.generators[edge.target]) return edge;
    const rank = Number(match[1]);
    if (!orders.has(edge.target)) orders.set(edge.target, new Map());
    orders.get(edge.target).set(rank, linkedReferenceOrderKey(edge.source));
    const id = match[2];
    if (Object.hasOwn(convertedReferences, edge.id)) {
      convertedReferences[id] = convertedReferences[edge.id];
      delete convertedReferences[edge.id];
    }
    return { ...edge, id };
  });
  if (!orders.size) return page;
  const generators = Object.fromEntries(Object.entries(page.generators).map(([id, generator]) => {
    const positions = orders.get(id);
    if (!positions) return [id, generator];
    let index = 0;
    for (const referenceId of generator.directReferenceIds) {
      while (positions.has(index)) index += 1;
      positions.set(index++, directReferenceOrderKey(referenceId));
    }
    const referenceOrder = [...positions].sort(([a], [b]) => a - b).map(([, key]) => key);
    return [id, { ...generator, draft: { ...generator.draft, referenceOrder } }];
  }));
  return { ...page, edges, generators, convertedReferences };
}
