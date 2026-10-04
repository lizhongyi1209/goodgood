import { regionFromPoints } from "./canvas-image-placement-model.mjs";

export const REGION_MARK_COLOR = "#ef2b2d";

export function defaultRegion(size) {
  if (!(Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0)) return null;
  return regionFromPoints({ x: size.width * 0.25, y: size.height * 0.25 }, { x: size.width * 0.75, y: size.height * 0.75 }, size);
}

// Keep the visible mark and exported pixels identical, including edges and tiny boxes.
export function regionMarkRects(region, size) {
  if (!region || ![region.x, region.y, region.width, region.height, size.width, size.height].every(Number.isFinite) ||
    size.width <= 0 || size.height <= 0 || region.width <= 0 || region.height <= 0) return [];
  const bounded = regionFromPoints({ x: region.x, y: region.y }, { x: region.x + region.width, y: region.y + region.height }, size);
  if (!bounded) return [];
  const { x, y, width, height } = bounded;
  const stroke = Math.min(width / 2, height / 2, Math.max(2, Math.min(16, Math.round(Math.min(size.width, size.height) * 0.004))));
  return [
    { x, y, width, height: stroke },
    { x, y: y + height - stroke, width, height: stroke },
    { x, y: y + stroke, width: stroke, height: height - stroke * 2 },
    { x: x + width - stroke, y: y + stroke, width: stroke, height: height - stroke * 2 },
  ].filter((rect) => rect.width > 0 && rect.height > 0);
}

export function paintRegionAnnotation(context, base, region, size) {
  const marks = regionMarkRects(region, size);
  if (!marks.length) throw new Error("请先在图片上画框。");
  context.drawImage(base, 0, 0);
  context.save();
  try {
    context.fillStyle = REGION_MARK_COLOR;
    for (const mark of marks) context.fillRect(mark.x, mark.y, mark.width, mark.height);
  } finally { context.restore(); }
}

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

export function regionPanelPosition(frame, available, panelHeight = 48, panelWidth = 116) {
  const width = Math.max(0, Math.min(156, panelWidth, available.width - 24));
  const left = Math.max(available.left + 12, Math.min(frame.left + frame.width + 12, available.left + available.width - width - 12));
  const maxHeight = Math.max(0, available.height - 24);
  const top = Math.max(available.top + 12, Math.min(frame.top, available.top + available.height - Math.min(panelHeight, maxHeight) - 12));
  return { left, top, width, maxHeight };
}

