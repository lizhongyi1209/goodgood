export function adjacentViewerIndex(index, count, direction) {
  return count > 0 ? Math.max(0, Math.min(index + direction, count - 1)) : -1;
}

/** End spacers make every selection centerable, including a one-item rail. */
export function attachCenteredViewerRail(rail, thumbnails, selected) {
  if (!rail || !selected || !thumbnails.includes(selected)) return () => {};
  const center = () => {
    const height = rail.clientHeight;
    if (!height) return;
    const first = thumbnails[0].getBoundingClientRect();
    const last = thumbnails.at(-1).getBoundingClientRect();
    rail.style.paddingTop = `${Math.max(0, (height - first.height) / 2)}px`;
    rail.style.paddingBottom = `${Math.max(0, (height - last.height) / 2)}px`;
    const railBox = rail.getBoundingClientRect();
    const box = selected.getBoundingClientRect();
    const top = rail.scrollTop + box.top - railBox.top - (height - box.height) / 2;
    rail.scrollTo({ top: Math.max(0, Math.min(top, rail.scrollHeight - height)),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  center();
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", center);
    return () => window.removeEventListener("resize", center);
  }
  const observer = new ResizeObserver(center);
  observer.observe(rail);
  for (const thumbnail of thumbnails) observer.observe(thumbnail);
  return () => observer.disconnect();
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
