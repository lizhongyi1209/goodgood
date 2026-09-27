/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */
/** @typedef {{ x: number, y1: number, y2: number }} VerticalGuide */
/** @typedef {{ y: number, x1: number, x2: number }} HorizontalGuide */

const anchors = (start, length) => [start, start + length / 2, start + length];
const gap = (a1, a2, b1, b2) => Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));
const validRect = (rect) => rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
  && rect.width > 0 && rect.height > 0;

/**
 * Find the nearest guide and the exact offset needed to align each axis.
 * Screen-pixel thresholds are divided by zoom so the feedback is steady while panning/zooming.
 * @param {Rect} moving
 * @param {Rect[]} candidates
 * @param {number} zoom
 * @returns {{ vertical: VerticalGuide | null, horizontal: HorizontalGuide | null, offset: { x: number, y: number } } | null}
 */
export function canvasAlignmentGuides(moving, candidates, zoom = 1) {
  if (!validRect(moving) || !candidates?.length) return null;
  const scale = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const tolerance = 10 / scale;
  const padding = 12 / scale;
  const movingX = anchors(moving.x, moving.width);
  const movingY = anchors(moving.y, moving.height);
  /** @type {{ distance: number, gap: number, offset: number, line: VerticalGuide } | null} */
  let vertical = null;
  /** @type {{ distance: number, gap: number, offset: number, line: HorizontalGuide } | null} */
  let horizontal = null;

  for (const target of candidates) {
    if (!validRect(target)) continue;
    const verticalGap = gap(moving.y, moving.y + moving.height, target.y, target.y + target.height);
    for (const x of anchors(target.x, target.width)) {
      for (const movingAnchor of movingX) {
        const distance = Math.abs(movingAnchor - x);
        const lessRelevant = vertical && (distance > vertical.distance ||
          (distance === vertical.distance && verticalGap >= vertical.gap));
        if (distance > tolerance || lessRelevant) continue;
        vertical = {
          distance,
          gap: verticalGap,
          offset: x - movingAnchor,
          line: {
            x,
            y1: Math.min(moving.y, target.y) - padding,
            y2: Math.max(moving.y + moving.height, target.y + target.height) + padding,
          },
        };
      }
    }

    const horizontalGap = gap(moving.x, moving.x + moving.width, target.x, target.x + target.width);
    for (const y of anchors(target.y, target.height)) {
      for (const movingAnchor of movingY) {
        const distance = Math.abs(movingAnchor - y);
        const lessRelevant = horizontal && (distance > horizontal.distance ||
          (distance === horizontal.distance && horizontalGap >= horizontal.gap));
        if (distance > tolerance || lessRelevant) continue;
        horizontal = {
          distance,
          gap: horizontalGap,
          offset: y - movingAnchor,
          line: {
            y,
            x1: Math.min(moving.x, target.x) - padding,
            x2: Math.max(moving.x + moving.width, target.x + target.width) + padding,
          },
        };
      }
    }
  }

  return vertical || horizontal
    ? {
        vertical: vertical?.line ?? null,
        horizontal: horizontal?.line ?? null,
        offset: { x: vertical?.offset ?? 0, y: horizontal?.offset ?? 0 },
      }
    : null;
}

/**
 * Move selected nodes together after a drag, preserving their relative spacing.
 * @template {{ id: string, position: { x: number, y: number } }} T
 * @param {T[]} nodes
 * @param {Set<string>} draggedIds
 * @param {{ x: number, y: number }} offset
 * @returns {T[]}
 */
export function snapCanvasNodes(nodes, draggedIds, offset) {
  if (!draggedIds.size || (!offset.x && !offset.y)) return nodes;
  return nodes.map((node) => draggedIds.has(node.id)
    ? { ...node, position: { x: node.position.x + offset.x, y: node.position.y + offset.y } }
    : node);
}
