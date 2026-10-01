export function adjacentViewerIndex(index, count, direction) {
  return count > 0 ? Math.max(0, Math.min(index + direction, count - 1)) : -1;
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
