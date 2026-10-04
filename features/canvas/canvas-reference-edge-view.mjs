const labelStyle = { fill: "#71717a", fontSize: 11 };
const labelBgStyle = { fill: "#fff" };
const labelBgPadding = [5, 3];

// React Flow observes the controlled array by identity. A graph notification
// must not produce another edge update unless a real edge or its count changed.
export function createCanvasReferenceEdgeView() {
  let previous = null;
  let cache = new Map();

  return (edges, counts) => {
    const nextCache = new Map();
    const next = edges.map((edge) => {
      const count = counts.get(edge.id);
      if (count === undefined) return edge;
      const cached = cache.get(edge.id);
      const entry = cached?.edge === edge && cached.count === count ? cached : {
        edge,
        count,
        view: { ...edge, label: count + "张", labelStyle, labelBgStyle,
          labelBgPadding, labelBgBorderRadius: 4, ariaLabel: count + "张参考图，点击查看" },
      };
      nextCache.set(edge.id, entry);
      return entry.view;
    });
    cache = nextCache;
    if (previous?.length === next.length && next.every((edge, index) => edge === previous[index])) return previous;
    previous = next.every((edge, index) => edge === edges[index]) ? edges : next;
    return previous;
  };
}
