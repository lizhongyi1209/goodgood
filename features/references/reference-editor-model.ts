export type ReferenceEditorTool =
  | "view"
  | "crop"
  | "brush"
  | "sticker"
  | "arrow"
  | "bbox";

export type ReferenceEditorCropPreset =
  | "free"
  | "original"
  | "1:1"
  | "4:3"
  | "3:4"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3";

export const REFERENCE_EDITOR_CROP_PRESETS: readonly Readonly<{
  label: string;
  value: ReferenceEditorCropPreset;
}>[] = [
  { label: "自由", value: "free" },
  { label: "原图", value: "original" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "3:2", value: "3:2" },
  { label: "2:3", value: "2:3" },
] as const;

export type ReferenceEditorPoint = Readonly<{
  x: number;
  y: number;
}>;

export type ReferenceEditorRect = Readonly<{
  height: number;
  width: number;
  x: number;
  y: number;
}>;

export type ReferenceEditorBrushStroke = Readonly<{
  color: string;
  id: string;
  points: readonly ReferenceEditorPoint[];
  width: number;
}>;

export type ReferenceEditorArrow = Readonly<{
  color: string;
  end: ReferenceEditorPoint;
  id: string;
  start: ReferenceEditorPoint;
  width: number;
}>;

export type ReferenceEditorSticker = Readonly<{
  center: ReferenceEditorPoint;
  height: number;
  id: string;
  name: string;
  rotation: number;
  scale: number;
  src: string;
  width: number;
}>;

export type ReferenceEditorDocument = Readonly<{
  arrows: readonly ReferenceEditorArrow[];
  crop: ReferenceEditorRect;
  cropPreset: ReferenceEditorCropPreset;
  stickers: readonly ReferenceEditorSticker[];
  strokes: readonly ReferenceEditorBrushStroke[];
}>;

export type ReferenceEditorHistory = Readonly<{
  future: readonly ReferenceEditorDocument[];
  past: readonly ReferenceEditorDocument[];
  present: ReferenceEditorDocument;
}>;

export type ReferenceEditorCropHandle = "nw" | "ne" | "se" | "sw";

export type ReferenceEditorBbox = Readonly<{
  canvas: Readonly<{ height: number; width: number }>;
  normalized: readonly [number, number, number, number];
  pixel: readonly [number, number, number, number];
}>;

const FULL_RECT: ReferenceEditorRect = Object.freeze({
  height: 1,
  width: 1,
  x: 0,
  y: 0,
});

const EPSILON = 0.000_001;
const HISTORY_LIMIT = 50;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cropRatio(
  preset: ReferenceEditorCropPreset,
  imageWidth: number,
  imageHeight: number,
) {
  if (preset === "free") return null;
  if (preset === "original") return imageWidth / imageHeight;
  const [width, height] = preset.split(":").map(Number);
  return width / height;
}

export function createReferenceEditorDocument(): ReferenceEditorDocument {
  return {
    arrows: [],
    crop: FULL_RECT,
    cropPreset: "original",
    stickers: [],
    strokes: [],
  };
}

export function createReferenceEditorHistory(
  document = createReferenceEditorDocument(),
): ReferenceEditorHistory {
  return { future: [], past: [], present: document };
}

export function commitReferenceEditorDocument(
  history: ReferenceEditorHistory,
  next: ReferenceEditorDocument,
): ReferenceEditorHistory {
  if (next === history.present) return history;
  return {
    future: [],
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
  };
}

export function commitReferenceEditorGesture(
  history: ReferenceEditorHistory,
  gestureStart: ReferenceEditorDocument,
): ReferenceEditorHistory {
  if (gestureStart === history.present) return history;
  return {
    future: [],
    past: [...history.past, gestureStart].slice(-HISTORY_LIMIT),
    present: history.present,
  };
}

export function undoReferenceEditorHistory(
  history: ReferenceEditorHistory,
): ReferenceEditorHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
    past: history.past.slice(0, -1),
    present: previous,
  };
}

export function redoReferenceEditorHistory(
  history: ReferenceEditorHistory,
): ReferenceEditorHistory {
  const [next, ...future] = history.future;
  if (!next) return history;
  return {
    future,
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
  };
}

export function cropRectForPreset(
  preset: ReferenceEditorCropPreset,
  imageWidth: number,
  imageHeight: number,
): ReferenceEditorRect {
  if (preset === "free" || preset === "original") return FULL_RECT;
  const targetRatio = cropRatio(preset, imageWidth, imageHeight) ?? 1;
  const imageRatio = imageWidth / imageHeight;
  if (targetRatio >= imageRatio) {
    const height = imageRatio / targetRatio;
    return { height, width: 1, x: 0, y: (1 - height) / 2 };
  }
  const width = targetRatio / imageRatio;
  return { height: 1, width, x: (1 - width) / 2, y: 0 };
}

export function moveCropRect(
  crop: ReferenceEditorRect,
  delta: ReferenceEditorPoint,
): ReferenceEditorRect {
  return {
    ...crop,
    x: clamp(crop.x + delta.x, 0, 1 - crop.width),
    y: clamp(crop.y + delta.y, 0, 1 - crop.height),
  };
}

export function resizeCropRect(
  crop: ReferenceEditorRect,
  handle: ReferenceEditorCropHandle,
  point: ReferenceEditorPoint,
  preset: ReferenceEditorCropPreset,
  imageWidth: number,
  imageHeight: number,
): ReferenceEditorRect {
  const east = handle === "ne" || handle === "se";
  const south = handle === "se" || handle === "sw";
  const anchor = {
    x: east ? crop.x : crop.x + crop.width,
    y: south ? crop.y : crop.y + crop.height,
  };
  const directionX = east ? 1 : -1;
  const directionY = south ? 1 : -1;
  const maxWidth = (directionX > 0 ? 1 - anchor.x : anchor.x) * imageWidth;
  const maxHeight = (directionY > 0 ? 1 - anchor.y : anchor.y) * imageHeight;
  const minimumWidth = Math.min(64, imageWidth);
  const minimumHeight = Math.min(64, imageHeight);
  const boundedPoint = {
    x: clamp(point.x, 0, 1),
    y: clamp(point.y, 0, 1),
  };
  const ratio = cropRatio(preset, imageWidth, imageHeight);
  let widthPixels: number;
  let heightPixels: number;

  if (ratio === null) {
    widthPixels = clamp(
      Math.abs(boundedPoint.x - anchor.x) * imageWidth,
      minimumWidth,
      maxWidth,
    );
    heightPixels = clamp(
      Math.abs(boundedPoint.y - anchor.y) * imageHeight,
      minimumHeight,
      maxHeight,
    );
  } else {
    const wantedWidth = Math.max(
      Math.abs(boundedPoint.x - anchor.x) * imageWidth,
      Math.abs(boundedPoint.y - anchor.y) * imageHeight * ratio,
      minimumWidth,
      minimumHeight * ratio,
    );
    const availableWidth = Math.min(maxWidth, maxHeight * ratio);
    widthPixels = Math.min(wantedWidth, availableWidth);
    heightPixels = widthPixels / ratio;
  }

  const width = widthPixels / imageWidth;
  const height = heightPixels / imageHeight;
  return {
    height,
    width,
    x: directionX > 0 ? anchor.x : anchor.x - width,
    y: directionY > 0 ? anchor.y : anchor.y - height,
  };
}

export function rectFromPoints(
  start: ReferenceEditorPoint,
  end: ReferenceEditorPoint,
  bounds: ReferenceEditorRect = FULL_RECT,
): ReferenceEditorRect {
  const startX = clamp(start.x, bounds.x, bounds.x + bounds.width);
  const startY = clamp(start.y, bounds.y, bounds.y + bounds.height);
  const endX = clamp(end.x, bounds.x, bounds.x + bounds.width);
  const endY = clamp(end.y, bounds.y, bounds.y + bounds.height);
  return {
    height: Math.abs(endY - startY),
    width: Math.abs(endX - startX),
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
  };
}

export function createReferenceEditorBbox(
  selection: ReferenceEditorRect,
  crop: ReferenceEditorRect,
  imageWidth: number,
  imageHeight: number,
): ReferenceEditorBbox | null {
  if (selection.width < EPSILON || selection.height < EPSILON) return null;
  const canvasWidth = Math.max(1, Math.round(imageWidth * crop.width));
  const canvasHeight = Math.max(1, Math.round(imageHeight * crop.height));
  const relativeX1 = clamp((selection.x - crop.x) / crop.width, 0, 1);
  const relativeY1 = clamp((selection.y - crop.y) / crop.height, 0, 1);
  const relativeX2 = clamp(
    (selection.x + selection.width - crop.x) / crop.width,
    0,
    1,
  );
  const relativeY2 = clamp(
    (selection.y + selection.height - crop.y) / crop.height,
    0,
    1,
  );
  return {
    canvas: { height: canvasHeight, width: canvasWidth },
    normalized: [
      Math.round(relativeX1 * 1000),
      Math.round(relativeY1 * 1000),
      Math.round(relativeX2 * 1000),
      Math.round(relativeY2 * 1000),
    ],
    pixel: [
      Math.round(relativeX1 * canvasWidth),
      Math.round(relativeY1 * canvasHeight),
      Math.round(relativeX2 * canvasWidth),
      Math.round(relativeY2 * canvasHeight),
    ],
  };
}

export function formatReferenceEditorBboxPrompt(
  ordinal: number,
  bbox: ReferenceEditorBbox,
) {
  return `图 ${ordinal} 的目标区域 bbox [${bbox.normalized.join(", ")}]（当前画布 ${bbox.canvas.width}×${bbox.canvas.height}px；像素 [${bbox.pixel.join(", ")}]）`;
}

export function hasReferenceEditorPixelEdits(
  document: ReferenceEditorDocument,
) {
  const cropChanged =
    Math.abs(document.crop.x) > EPSILON ||
    Math.abs(document.crop.y) > EPSILON ||
    Math.abs(document.crop.width - 1) > EPSILON ||
    Math.abs(document.crop.height - 1) > EPSILON;
  return cropChanged ||
    document.strokes.length > 0 ||
    document.arrows.length > 0 ||
    document.stickers.length > 0;
}

export function createReferenceEditorSticker(
  input: Readonly<{
    crop: ReferenceEditorRect;
    id: string;
    imageHeight: number;
    imageWidth: number;
    name: string;
    sourceHeight: number;
    sourceWidth: number;
    src: string;
  }>,
): ReferenceEditorSticker {
  const stickerRatio = input.sourceWidth / input.sourceHeight;
  const cropPixelWidth = input.crop.width * input.imageWidth;
  const cropPixelHeight = input.crop.height * input.imageHeight;
  let stickerPixelWidth = cropPixelWidth * 0.32;
  let stickerPixelHeight = stickerPixelWidth / stickerRatio;
  if (stickerPixelHeight > cropPixelHeight * 0.32) {
    stickerPixelHeight = cropPixelHeight * 0.32;
    stickerPixelWidth = stickerPixelHeight * stickerRatio;
  }
  return {
    center: {
      x: input.crop.x + input.crop.width / 2,
      y: input.crop.y + input.crop.height / 2,
    },
    height: stickerPixelHeight / input.imageHeight,
    id: input.id,
    name: input.name,
    rotation: 0,
    scale: 1,
    src: input.src,
    width: stickerPixelWidth / input.imageWidth,
  };
}

export function pointInReferenceEditorSticker(
  point: ReferenceEditorPoint,
  sticker: ReferenceEditorSticker,
  imageWidth: number,
  imageHeight: number,
) {
  const radians = (-sticker.rotation * Math.PI) / 180;
  const deltaX = (point.x - sticker.center.x) * imageWidth;
  const deltaY = (point.y - sticker.center.y) * imageHeight;
  const localX = deltaX * Math.cos(radians) - deltaY * Math.sin(radians);
  const localY = deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
  return Math.abs(localX) <= (sticker.width * imageWidth * sticker.scale) / 2 &&
    Math.abs(localY) <= (sticker.height * imageHeight * sticker.scale) / 2;
}

export function moveReferenceEditorSticker(
  sticker: ReferenceEditorSticker,
  delta: ReferenceEditorPoint,
  crop: ReferenceEditorRect,
): ReferenceEditorSticker {
  return {
    ...sticker,
    center: {
      x: clamp(sticker.center.x + delta.x, crop.x, crop.x + crop.width),
      y: clamp(sticker.center.y + delta.y, crop.y, crop.y + crop.height),
    },
  };
}

export function scaleReferenceEditorSticker(
  sticker: ReferenceEditorSticker,
  factor: number,
): ReferenceEditorSticker {
  return { ...sticker, scale: clamp(sticker.scale * factor, 0.2, 3) };
}

export function rotateReferenceEditorSticker(
  sticker: ReferenceEditorSticker,
  delta: number,
): ReferenceEditorSticker {
  let rotation = (sticker.rotation + delta) % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation <= -180) rotation += 360;
  return { ...sticker, rotation };
}
