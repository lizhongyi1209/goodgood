export const INITIAL_IMAGE_VIEW = Object.freeze({ scale: 1, x: 0, y: 0 });

/** Keep the full source in the movable plane; clip only at the viewport. */
export function fitImageFrame(viewport, source) {
  if (![viewport.width, viewport.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  if (![source.width, source.height].every((value) => Number.isFinite(value) && value > 0)) {
    return { x: 0, y: 0, width: viewport.width, height: viewport.height };
  }
  const scale = Math.min(viewport.width / source.width, viewport.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: (viewport.width - width) / 2, y: (viewport.height - height) / 2, width, height };
}

export function zoomImageView(view, anchor, factor) {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return view;
  const scale = Math.max(.25, Math.min(16, view.scale * factor));
  const ratio = scale / view.scale;
  return { scale, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio };
}

/** Own only a preview transform; never mutate asset or project coordinates. */
export function attachImagePreviewNavigation(surface, { onViewChange, onDraggingChange = () => {} }) {
  let view = INITIAL_IMAGE_VIEW;
  let drag = null;
  let disposed = false;
  const change = (next) => { if (!disposed) { view = next; onViewChange(view); } };
  const center = () => { const box = surface.getBoundingClientRect(); return { x: box.width / 2, y: box.height / 2 }; };
  const zoomBy = (factor) => change(zoomImageView(view, center(), factor));
  const endDrag = () => {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (surface.hasPointerCapture?.(id)) surface.releasePointerCapture(id);
    if (!disposed) onDraggingChange(false);
  };
  const fit = () => { endDrag(); change(INITIAL_IMAGE_VIEW); };
  const wheel = (event) => {
    if (event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    event.stopPropagation();
    const box = surface.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1);
    change(zoomImageView(view, { x: event.clientX - box.left, y: event.clientY - box.top },
      Math.exp(-Math.max(-300, Math.min(300, delta)) * .0018)));
  };
  const pointerDown = (event) => {
    if (event.button !== 0 || event.isPrimary === false || drag || event.target?.closest?.("button, a, input, textarea, select")) return;
    event.preventDefault();
    surface.focus({ preventScroll: true });
    surface.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    onDraggingChange(true);
  };
  const pointerMove = (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    change({ ...view, x: view.x + event.clientX - drag.x, y: view.y + event.clientY - drag.y });
    drag = { ...drag, x: event.clientX, y: event.clientY };
  };
  const pointerEnd = (event) => { if (drag?.id === event.pointerId) endDrag(); };
  const keyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (["+", "="].includes(event.key)) zoomBy(1.25);
    else if (["-", "_"].includes(event.key)) zoomBy(.8);
    else if (["0", "Home"].includes(event.key)) fit();
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      change({ ...view, x: view.x + (event.key === "ArrowLeft" ? -40 : event.key === "ArrowRight" ? 40 : 0),
        y: view.y + (event.key === "ArrowUp" ? -40 : event.key === "ArrowDown" ? 40 : 0) });
    } else return;
    event.preventDefault();
    event.stopPropagation();
  };
  const listeners = { wheel, pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerEnd,
    pointercancel: pointerEnd, lostpointercapture: pointerEnd, keydown: keyDown };
  for (const [name, handler] of Object.entries(listeners)) surface.addEventListener(name, handler, name === "wheel" ? { passive: false } : undefined);
  return { zoomBy, fit, dispose() {
    disposed = true;
    for (const [name, handler] of Object.entries(listeners)) surface.removeEventListener(name, handler);
    endDrag();
  } };
}
