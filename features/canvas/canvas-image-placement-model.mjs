const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const valid = (value) => Number.isFinite(value);
export const MAX_STICKER_LAYERS = 10;
export const PLACEMENT_CORNERS = Object.freeze(["nw", "ne", "se", "sw"]);

export function imagePoint(point, view) {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

export function fitImageView(size, viewport) {
  const scale = Math.min(1, Math.max(1, viewport.width - 40) / size.width, Math.max(1, viewport.height - 40) / size.height);
  return { scale, x: (viewport.width - size.width * scale) / 2, y: (viewport.height - size.height * scale) / 2 };
}

export function zoomImageView(view, scale, anchor) {
  const next = clamp(scale, 0.001, 8);
  const point = imagePoint(anchor, view);
  return { scale: next, x: anchor.x - point.x * next, y: anchor.y - point.y * next };
}

export function regionFromPoints(start, end, size) {
  const x1 = clamp(Math.floor(Math.min(start.x, end.x)), 0, size.width);
  const y1 = clamp(Math.floor(Math.min(start.y, end.y)), 0, size.height);
  const x2 = clamp(Math.ceil(Math.max(start.x, end.x)), 0, size.width);
  const y2 = clamp(Math.ceil(Math.max(start.y, end.y)), 0, size.height);
  return x2 > x1 && y2 > y1 ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : null;
}

export function moveRegion(region, delta, size) {
  return { ...region, x: clamp(Math.round(region.x + delta.x), 0, size.width - region.width), y: clamp(Math.round(region.y + delta.y), 0, size.height - region.height) };
}

export function resizeRegion(region, corner, point, size) {
  const west = corner.includes("w"), north = corner.includes("n");
  const anchor = { x: region.x + (west ? region.width : 0), y: region.y + (north ? region.height : 0) };
  const next = {
    x: clamp(Math.round(point.x), west ? 0 : anchor.x + 1, west ? anchor.x - 1 : size.width),
    y: clamp(Math.round(point.y), north ? 0 : anchor.y + 1, north ? anchor.y - 1 : size.height),
  };
  return regionFromPoints(anchor, next, size) ?? region;
}

export function regionCoordinates(region, size, normalized = false) {
  const coordinates = [region.x, region.y, region.x + region.width, region.y + region.height];
  return normalized ? coordinates.map((value, index) => (index < 2 ? Math.floor : Math.ceil)(value / (index % 2 ? size.height : size.width) * 1000)) : coordinates;
}

export function regionPrompt(region, size, normalized = false) {
  const coordinates = regionCoordinates(region, size, normalized).join(", ");
  const units = normalized ? "坐标按宽高分别归一化到0–1000" : "坐标单位为原图像素";
  return `仅编辑图片中的指定区域：原图尺寸 ${size.width} × ${size.height}，bbox=[${coordinates}]（左上角x1、y1，右下角x2、y2；左上角为原点，x向右、y向下；${units}）。其余区域保持不变。`;
}

export function defaultPlacement(sticker, size) {
  const factor = Math.min(size.width * 0.4 / sticker.width, size.height * 0.4 / sticker.height);
  return { cx: size.width / 2, cy: size.height / 2, width: sticker.width * factor, height: sticker.height * factor, rotation: 0 };
}

export function normalizeRotation(value) {
  return valid(value) ? ((value + 180) % 360 + 360) % 360 - 180 : 0;
}

function rotated(point, degrees) {
  const angle = degrees * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine };
}

export function placementCorner(layer, corner) {
  const point = rotated({ x: layer.width / 2 * (corner.includes("w") ? -1 : 1), y: layer.height / 2 * (corner.includes("n") ? -1 : 1) }, layer.rotation);
  return { x: layer.cx + point.x, y: layer.cy + point.y };
}

export function scalePlacement(layer, factor) {
  if (!valid(factor) || factor <= 0) return layer;
  const edge = Math.max(layer.width, layer.height);
  const bounded = clamp(factor, 4 / edge, 32768 / edge);
  return { ...layer, width: layer.width * bounded, height: layer.height * bounded };
}

export function resizePlacement(layer, corner, point) {
  const opposite = { nw: "se", ne: "sw", se: "nw", sw: "ne" }[corner];
  const anchor = placementCorner(layer, opposite);
  const local = rotated({ x: point.x - anchor.x, y: point.y - anchor.y }, -layer.rotation);
  const diagonal = { x: layer.width * (corner.includes("w") ? -1 : 1), y: layer.height * (corner.includes("n") ? -1 : 1) };
  const factor = Math.max(0.0001, (local.x * diagonal.x + local.y * diagonal.y) / (layer.width ** 2 + layer.height ** 2));
  const next = scalePlacement(layer, factor);
  const center = rotated({ x: next.width / 2 * Math.sign(diagonal.x), y: next.height / 2 * Math.sign(diagonal.y) }, layer.rotation);
  return { ...next, cx: anchor.x + center.x, cy: anchor.y + center.y };
}

export function movePlacement(layer, delta, size) {
  return { ...layer, cx: clamp(layer.cx + delta.x, -layer.width, size.width + layer.width), cy: clamp(layer.cy + delta.y, -layer.height, size.height + layer.height) };
}

export function rotatePlacement(layer, start, point, snap = false) {
  const angle = (value) => Math.atan2(value.y - layer.cy, value.x - layer.cx) * 180 / Math.PI;
  const rotation = normalizeRotation(layer.rotation + angle(point) - angle(start));
  return { ...layer, rotation: snap ? normalizeRotation(Math.round(rotation / 15) * 15) : rotation };
}

export function reorderPlacementLayers(layers, id, delta) {
  const index = layers.findIndex((layer) => layer.id === id);
  const nextIndex = clamp(index + delta, 0, layers.length - 1);
  if (index < 0 || index === nextIndex) return layers;
  const next = [...layers];
  const [layer] = next.splice(index, 1);
  next.splice(nextIndex, 0, layer);
  return next;
}

// Both SVG preview and export use the same pixel centers, dimensions and rotation.
export function paintStickerComposition(context, base, layers) {
  context.drawImage(base, 0, 0);
  for (const layer of layers) {
    const { cx, cy, width, height, rotation } = layer.placement;
    context.save();
    try {
      context.translate(cx, cy); context.rotate(rotation * Math.PI / 180);
      context.drawImage(layer.resource.image, -width / 2, -height / 2, width, height);
    } finally { context.restore(); }
  }
}
