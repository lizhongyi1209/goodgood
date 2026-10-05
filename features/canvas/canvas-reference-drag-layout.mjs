/** Slot positions are measured before dragging, in the tray's unscaled content coordinates. */
export function canvasReferenceDragLayout(slots, source, delta) {
  const from = slots.findIndex((slot) => slot.key === source);
  if (from < 0 || slots.length < 2 || !Number.isFinite(delta)) return null;
  const centers = slots.map((slot) => slot.left + slot.width / 2);
  const center = Math.max(centers[0], Math.min(centers.at(-1), centers[from] + delta));
  let to = 0;
  while (to < slots.length - 1 && center > (centers[to] + centers[to + 1]) / 2) to += 1;

  const offsets = slots.map((slot, index) => {
    if (index === from) return center - centers[from];
    if (from < to && index > from && index <= to) return slots[index - 1].left - slot.left;
    if (from > to && index >= to && index < from) return slots[index + 1].left - slot.left;
    return 0;
  });
  return { target: slots[to].key, offsets };
}
