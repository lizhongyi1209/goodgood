export function adjacentViewerIndex(index, count, direction) {
  return count > 0 ? Math.max(0, Math.min(index + direction, count - 1)) : -1;
}

/** Space actual media heights, including the selected scale, with a clear gap. */
export function viewerThumbnailLayout(items, selectedIndex, compact = false) {
  const width = compact ? 50 : 64;
  const gap = compact ? 8 : 10;
  const layout = items.map((item) => {
    const ratio = Number.isFinite(item.width) && item.width > 0 && Number.isFinite(item.height) && item.height > 0
      ? item.width / item.height : 1;
    return { height: Math.max(compact ? 28 : 32, Math.min(width / ratio, compact ? 64 : 76)), offset: 0 };
  });
  if (!layout.length) return layout;
  const selected = Math.max(0, Math.min(selectedIndex, layout.length - 1));
  const displayedHeight = (index) => layout[index].height * (index === selected ? 1.12 : 1);
  for (let index = selected + 1; index < layout.length; index += 1) {
    layout[index].offset = layout[index - 1].offset + (displayedHeight(index - 1) + displayedHeight(index)) / 2 + gap;
  }
  for (let index = selected - 1; index >= 0; index -= 1) {
    layout[index].offset = layout[index + 1].offset - (displayedHeight(index + 1) + displayedHeight(index)) / 2 - gap;
  }
  return layout;
}

/** Returns null for gestures owned by the browser, 0 while accumulating/cooling. */
export function createViewerWheelStep() {
  let total = 0;
  let lastTime = -Infinity;
  let lockedUntil = -Infinity;
  let direction = 0;
  return (event, height) => {
    if (event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return null;
    if (event.timeStamp < lockedUntil) return 0;
    const nextDirection = Math.sign(event.deltaY);
    if (direction !== nextDirection || event.timeStamp - lastTime > 180) total = 0;
    direction = nextDirection;
    lastTime = event.timeStamp;
    total += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if (Math.abs(total) < 18) return 0;
    total = 0;
    lockedUntil = event.timeStamp + 280;
    return direction;
  };
}
