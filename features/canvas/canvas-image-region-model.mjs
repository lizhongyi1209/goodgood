import { regionCoordinates } from "./canvas-image-placement-model.mjs";

// Use decoded original dimensions even when the canvas displays a smaller preview.
export function regionImageFrame(bounds, size) {
  if (!(bounds.width > 0 && bounds.height > 0 && size.width > 0 && size.height > 0)) return null;
  const scale = Math.min(bounds.width / size.width, bounds.height / size.height);
  return { left: bounds.left + (bounds.width - size.width * scale) / 2,
    top: bounds.top + (bounds.height - size.height * scale) / 2, width: size.width * scale, height: size.height * scale };
}

export function regionPointFromClient(point, frame, size) {
  return { x: (point.x - frame.left) / frame.width * size.width, y: (point.y - frame.top) / frame.height * size.height };
}

export function regionPanelPosition(frame, available, panelHeight = 108) {
  const width = Math.max(0, Math.min(272, available.width - 24));
  const left = Math.max(available.left + 12, Math.min(frame.left + frame.width + 12, available.left + available.width - width - 12));
  const maxHeight = Math.max(0, available.height - 24);
  const top = Math.max(available.top + 12, Math.min(frame.top, available.top + available.height - Math.min(panelHeight, maxHeight) - 12));
  return { left, top, width, maxHeight };
}

export function regionBboxText(region, size) {
  return region && size ? `bbox=[${regionCoordinates(region, size).join(", ")}]` : "bbox=[]";
}
