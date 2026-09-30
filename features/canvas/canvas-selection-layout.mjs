/** @typedef {{ x: number, y: number, width: number, height: number }} CanvasBounds */
/** @typedef {{ id: string, position: { x: number, y: number }, bounds: CanvasBounds }} SelectionItem */
/** @typedef {"tidy" | "left" | "center-x" | "right" | "top" | "center-y" | "bottom"} SelectionArrangement */

/** @param {CanvasBounds[]} bounds @returns {CanvasBounds | null} */
export function unionCanvasBounds(bounds) {
  if (!bounds.length || bounds.some((item) => ![item.x, item.y, item.width, item.height].every(Number.isFinite) || item.width <= 0 || item.height <= 0)) return null;
  const x = Math.min(...bounds.map((item) => item.x));
  const y = Math.min(...bounds.map((item) => item.y));
  return { x, y,
    width: Math.max(...bounds.map((item) => item.x + item.width)) - x,
    height: Math.max(...bounds.map((item) => item.y + item.height)) - y };
}

/**
 * Visible output cards remain one node. These are target offsets, independent of
 * the CSS transition's current frame; hidden collapsed cards occupy no space.
 * @param {number} width @param {number} count @param {boolean} expanded
 */
export function generatorStackInsets(width, count, expanded) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isInteger(count) || count < 0) return { right: 0, bottom: 0 };
  const depth = Math.min(Math.max(0, count - 1), 2);
  return {
    right: expanded ? Math.max(0, count - 1) * (width + 12) : depth * Math.min(10, Math.max(6, width * 0.03)),
    bottom: expanded ? 0 : depth * 4,
  };
}

/**
 * Arrange visible footprints, translating only each node's body position.
 * Stable reading order and per-column/per-row sizes keep mixed media apart.
 * @param {SelectionItem[]} items @param {SelectionArrangement} action
 * @returns {Map<string, { x: number, y: number }>}
 */
export function arrangeCanvasSelection(items, action) {
  /** @type {Map<string, { x: number, y: number }>} */
  const positions = new Map();
  const frame = unionCanvasBounds(items.map((item) => item.bounds));
  if (items.length < 2 || !frame || items.some((item) => !Number.isFinite(item.position.x) || !Number.isFinite(item.position.y))) return positions;
  if (action === "tidy") {
    const ordered = [...items].sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x || a.id.localeCompare(b.id));
    const columns = Math.ceil(Math.sqrt(ordered.length));
    const rows = Math.ceil(ordered.length / columns);
    const widths = Array(columns).fill(0);
    const heights = Array(rows).fill(0);
    ordered.forEach((item, index) => {
      widths[index % columns] = Math.max(widths[index % columns], item.bounds.width);
      heights[Math.floor(index / columns)] = Math.max(heights[Math.floor(index / columns)], item.bounds.height);
    });
    /** @param {number[]} sizes */
    const offsets = (sizes) => sizes.map((_, index) => sizes.slice(0, index).reduce((sum, size) => sum + size + 24, 0));
    const xs = offsets(widths);
    const ys = offsets(heights);
    ordered.forEach((item, index) => positions.set(item.id, {
      x: item.position.x + frame.x + xs[index % columns] - item.bounds.x,
      y: item.position.y + frame.y + ys[Math.floor(index / columns)] - item.bounds.y,
    }));
  } else {
    for (const item of items) {
      let { x, y } = item.position;
      if (action === "left") x += frame.x - item.bounds.x;
      if (action === "center-x") x += frame.x + frame.width / 2 - item.bounds.x - item.bounds.width / 2;
      if (action === "right") x += frame.x + frame.width - item.bounds.x - item.bounds.width;
      if (action === "top") y += frame.y - item.bounds.y;
      if (action === "center-y") y += frame.y + frame.height / 2 - item.bounds.y - item.bounds.height / 2;
      if (action === "bottom") y += frame.y + frame.height - item.bounds.y - item.bounds.height;
      positions.set(item.id, { x, y });
    }
  }
  for (const item of items) {
    const next = positions.get(item.id);
    if (next && Math.abs(next.x - item.position.x) < 0.001 && Math.abs(next.y - item.position.y) < 0.001) positions.delete(item.id);
  }
  return positions;
}
