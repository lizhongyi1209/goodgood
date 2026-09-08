"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDownLeft,
  Check,
  Copy,
  Crop,
  Eye,
  ImagePlus,
  LoaderCircle,
  Minus,
  MousePointer2,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  ScanLine,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import {
  REFERENCE_EDITOR_CROP_PRESETS,
  commitReferenceEditorDocument,
  commitReferenceEditorGesture,
  createReferenceEditorBbox,
  createReferenceEditorDocument,
  createReferenceEditorHistory,
  createReferenceEditorSticker,
  cropRectForPreset,
  formatReferenceEditorBboxPrompt,
  hasReferenceEditorPixelEdits,
  moveCropRect,
  moveReferenceEditorSticker,
  pointInReferenceEditorSticker,
  rectFromPoints,
  redoReferenceEditorHistory,
  resizeCropRect,
  rotateReferenceEditorSticker,
  scaleReferenceEditorSticker,
  undoReferenceEditorHistory,
  type ReferenceEditorCropHandle,
  type ReferenceEditorDocument,
  type ReferenceEditorHistory,
  type ReferenceEditorPoint,
  type ReferenceEditorRect,
  type ReferenceEditorSticker,
  type ReferenceEditorTool,
} from "@/features/references/reference-editor-model";
import type { GenerationReference } from "@/shared/contracts/generation";

const MAX_EDITED_REFERENCE_BYTES = 20 * 1024 * 1024;
const EDITOR_COLORS = ["#b52b30", "#292933", "#ffffff"] as const;

type NaturalSize = Readonly<{ height: number; width: number }>;
type Viewport = Readonly<{
  height: number;
  left: number;
  scale: number;
  source: ReferenceEditorRect;
  top: number;
  width: number;
}>;

type Gesture =
  | Readonly<{
      handle?: ReferenceEditorCropHandle;
      kind: "crop";
      last: ReferenceEditorPoint;
      pointerId: number;
    }>
  | Readonly<{
      id: string;
      kind: "brush" | "arrow" | "sticker";
      last: ReferenceEditorPoint;
      pointerId: number;
    }>
  | Readonly<{
      kind: "bbox";
      pointerId: number;
      start: ReferenceEditorPoint;
    }>;

type EditorToolDefinition = Readonly<{
  icon: typeof Eye;
  label: string;
  tool: ReferenceEditorTool;
}>;

const EDITOR_TOOLS: readonly EditorToolDefinition[] = [
  { icon: Eye, label: "查看", tool: "view" },
  { icon: Crop, label: "裁剪", tool: "crop" },
  { icon: Paintbrush, label: "画笔", tool: "brush" },
  { icon: ImagePlus, label: "贴图", tool: "sticker" },
  { icon: ArrowDownLeft, label: "箭头", tool: "arrow" },
  { icon: ScanLine, label: "框选", tool: "bbox" },
] as const;

async function loadCanvasImage(src: string) {
  let objectUrl: string | null = null;
  try {
    const response = await fetch(src, { credentials: "same-origin", mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.blob();
    if (bytes.size === 0) throw new Error("empty image");
    objectUrl = URL.createObjectURL(bytes);
    return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode failed"));
      image.src = objectUrl as string;
    });
  } catch {
    throw new Error("图片读取失败，请关闭后重试。" );
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function viewportForCanvas(
  canvas: HTMLCanvasElement,
  natural: NaturalSize,
  source: ReferenceEditorRect,
): Viewport {
  const padding = 20;
  const availableWidth = Math.max(1, canvas.clientWidth - padding * 2);
  const availableHeight = Math.max(1, canvas.clientHeight - padding * 2);
  const sourceWidth = natural.width * source.width;
  const sourceHeight = natural.height * source.height;
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    height,
    left: (canvas.clientWidth - width) / 2,
    scale,
    source,
    top: (canvas.clientHeight - height) / 2,
    width,
  };
}

function sourceToCanvas(
  point: ReferenceEditorPoint,
  viewport: Viewport,
  natural: NaturalSize,
) {
  return {
    x: viewport.left + (point.x - viewport.source.x) * natural.width * viewport.scale,
    y: viewport.top + (point.y - viewport.source.y) * natural.height * viewport.scale,
  };
}

function canvasToSource(
  event: ReactPointerEvent<HTMLCanvasElement>,
  viewport: Viewport,
  natural: NaturalSize,
) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: viewport.source.x +
      (event.clientX - bounds.left - viewport.left) / (natural.width * viewport.scale),
    y: viewport.source.y +
      (event.clientY - bounds.top - viewport.top) / (natural.height * viewport.scale),
  };
}

function pointWithinRect(point: ReferenceEditorPoint, rect: ReferenceEditorRect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height;
}

function cropHandleAtPoint(
  point: ReferenceEditorPoint,
  crop: ReferenceEditorRect,
  viewport: Viewport,
  natural: NaturalSize,
) {
  const cursor = sourceToCanvas(point, viewport, natural);
  const handles: readonly [ReferenceEditorCropHandle, ReferenceEditorPoint][] = [
    ["nw", { x: crop.x, y: crop.y }],
    ["ne", { x: crop.x + crop.width, y: crop.y }],
    ["se", { x: crop.x + crop.width, y: crop.y + crop.height }],
    ["sw", { x: crop.x, y: crop.y + crop.height }],
  ];
  return handles.find(([, handlePoint]) => {
    const handle = sourceToCanvas(handlePoint, viewport, natural);
    return Math.hypot(handle.x - cursor.x, handle.y - cursor.y) <= 14;
  })?.[0];
}

function drawArrow(
  context: CanvasRenderingContext2D,
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  color: string,
  width: number,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(width * 4.2, 11);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - head * Math.cos(angle - Math.PI / 6),
    end.y - head * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    end.x - head * Math.cos(angle + Math.PI / 6),
    end.y - head * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawEditorDocument(
  context: CanvasRenderingContext2D,
  document: ReferenceEditorDocument,
  natural: NaturalSize,
  viewport: Viewport,
  stickerImages: ReadonlyMap<string, HTMLImageElement>,
  selectedStickerId: string | null,
) {
  const toCanvas = (point: ReferenceEditorPoint) =>
    sourceToCanvas(point, viewport, natural);
  context.save();
  context.beginPath();
  context.rect(viewport.left, viewport.top, viewport.width, viewport.height);
  context.clip();

  for (const stroke of document.strokes) {
    if (stroke.points.length === 0) continue;
    context.save();
    context.strokeStyle = stroke.color;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(
      1,
      stroke.width * Math.min(natural.width, natural.height) * viewport.scale,
    );
    context.beginPath();
    const first = toCanvas(stroke.points[0]);
    context.moveTo(first.x, first.y);
    for (const point of stroke.points.slice(1)) {
      const current = toCanvas(point);
      context.lineTo(current.x, current.y);
    }
    if (stroke.points.length === 1) context.lineTo(first.x + 0.01, first.y + 0.01);
    context.stroke();
    context.restore();
  }

  for (const arrow of document.arrows) {
    drawArrow(
      context,
      toCanvas(arrow.start),
      toCanvas(arrow.end),
      arrow.color,
      Math.max(1, arrow.width * Math.min(natural.width, natural.height) * viewport.scale),
    );
  }

  for (const sticker of document.stickers) {
    const image = stickerImages.get(sticker.id);
    if (!image) continue;
    const center = toCanvas(sticker.center);
    const width = sticker.width * natural.width * viewport.scale * sticker.scale;
    const height = sticker.height * natural.height * viewport.scale * sticker.scale;
    context.save();
    context.translate(center.x, center.y);
    context.rotate((sticker.rotation * Math.PI) / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    if (selectedStickerId === sticker.id) {
      context.strokeStyle = "#b52b30";
      context.lineWidth = 1.5;
      context.setLineDash([5, 4]);
      context.strokeRect(-width / 2, -height / 2, width, height);
    }
    context.restore();
  }
  context.restore();
}

function roundedTimestamp() {
  const now = new Date();
  const piece = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${piece(now.getMonth() + 1)}${piece(now.getDate())}_${piece(now.getHours())}${piece(now.getMinutes())}${piece(now.getSeconds())}`;
}

function editedFilename(name: string, extension: "png" | "webp") {
  const base = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_").trim() || "GoodGood素材";
  return `${base}_编辑_${roundedTimestamp()}.${extension}`;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/webp",
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("图片导出失败，请重试。")),
        type,
        quality,
      );
    } catch {
      reject(new Error("图片无法安全导出，请关闭后重新打开素材再试。"));
    }
  });
}

async function exportEditedReference(
  name: string,
  sourceImage: HTMLImageElement,
  document: ReferenceEditorDocument,
  stickerImages: ReadonlyMap<string, HTMLImageElement>,
) {
  const output = document.crop;
  const width = Math.max(1, Math.round(sourceImage.naturalWidth * output.width));
  const height = Math.max(1, Math.round(sourceImage.naturalHeight * output.height));
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法创建图片画布。" );

  context.drawImage(
    sourceImage,
    output.x * sourceImage.naturalWidth,
    output.y * sourceImage.naturalHeight,
    output.width * sourceImage.naturalWidth,
    output.height * sourceImage.naturalHeight,
    0,
    0,
    width,
    height,
  );
  const exportViewport: Viewport = {
    height,
    left: 0,
    scale: 1,
    source: output,
    top: 0,
    width,
  };
  drawEditorDocument(
    context,
    document,
    { height: sourceImage.naturalHeight, width: sourceImage.naturalWidth },
    exportViewport,
    stickerImages,
    null,
  );

  let blob = await canvasBlob(canvas, "image/png");
  let extension: "png" | "webp" = "png";
  if (blob.size > MAX_EDITED_REFERENCE_BYTES) {
    blob = await canvasBlob(canvas, "image/webp", 0.95);
    extension = "webp";
  }
  if (blob.size > MAX_EDITED_REFERENCE_BYTES) {
    throw new Error("编辑后的图片超过 20MB，请缩小裁剪范围后重试。" );
  }
  return new File([blob], editedFilename(name, extension), { type: blob.type });
}

export type ReferenceQuickEditorProps = Readonly<{
  materials?: readonly ReferenceMaterial[];
  onClose: () => void;
  onInsertPrompt: (text: string) => void;
  onSave: (source: GenerationReference, file: File) => Promise<void>;
  ordinal: number;
  reference: GenerationReference;
}>;

export function ReferenceQuickEditor({
  materials = [],
  onClose,
  onInsertPrompt,
  onSave,
  ordinal,
  reference,
}: ReferenceQuickEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localStickerInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const stickerImagesRef = useRef(new Map<string, HTMLImageElement>());
  const localStickerUrlsRef = useRef(new Set<string>());
  const [history, setHistory] = useState<ReferenceEditorHistory>(() =>
    createReferenceEditorHistory()
  );
  const historyRef = useRef<ReferenceEditorHistory>(history);
  const gestureRef = useRef<Gesture | null>(null);
  const gestureStartRef = useRef<ReferenceEditorDocument | null>(null);
  const [tool, setTool] = useState<ReferenceEditorTool>("view");
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderRevision, setRenderRevision] = useState(0);
  const [brushColor, setBrushColor] = useState<string>(EDITOR_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState(0.02);
  const [arrowWidth, setArrowWidth] = useState(0.008);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [bboxSelection, setBboxSelection] = useState<ReferenceEditorRect | null>(null);
  const [copied, setCopied] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setHistoryState = useCallback((
    updater: (current: ReferenceEditorHistory) => ReferenceEditorHistory,
  ) => {
    setHistory((current) => {
      const next = updater(current);
      historyRef.current = next;
      return next;
    });
  }, []);

  const updatePresent = useCallback((
    updater: (current: ReferenceEditorDocument) => ReferenceEditorDocument,
  ) => {
    setHistoryState((current) => ({ ...current, present: updater(current.present) }));
  }, [setHistoryState]);

  const commitDocument = useCallback((next: ReferenceEditorDocument) => {
    setHistoryState((current) => commitReferenceEditorDocument(current, next));
    setBboxSelection(null);
    setSaveError(null);
  }, [setHistoryState]);

  useEffect(() => {
    let active = true;
    const localStickerUrls = localStickerUrlsRef.current;
    loadCanvasImage(
      `/api/references/${encodeURIComponent(reference.id)}/content`,
    ).then((image) => {
      if (!active) return;
      sourceImageRef.current = image;
      setNatural({ height: image.naturalHeight, width: image.naturalWidth });
    }).catch((error) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : "图片读取失败，请重试。" );
    });
    return () => {
      active = false;
      sourceImageRef.current = null;
      for (const url of localStickerUrls) URL.revokeObjectURL(url);
      localStickerUrls.clear();
    };
  }, [reference.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setRenderRevision((value) => value + 1));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const ensureStickerImage = useCallback((sticker: ReferenceEditorSticker) => {
    if (stickerImagesRef.current.has(sticker.id)) return;
    void loadCanvasImage(sticker.src).then((image) => {
      stickerImagesRef.current.set(sticker.id, image);
      setRenderRevision((value) => value + 1);
    }).catch(() => {
      setSaveError(`贴图“${sticker.name}”读取失败，请删除后重试。`);
    });
  }, []);

  useEffect(() => {
    for (const sticker of history.present.stickers) ensureStickerImage(sticker);
  }, [ensureStickerImage, history.present.stickers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = sourceImageRef.current;
    if (!canvas || !image || !natural) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const source = tool === "crop"
      ? { height: 1, width: 1, x: 0, y: 0 }
      : history.present.crop;
    const viewport = viewportForCanvas(canvas, natural, source);
    context.fillStyle = "#e7e7ea";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.drawImage(
      image,
      source.x * natural.width,
      source.y * natural.height,
      source.width * natural.width,
      source.height * natural.height,
      viewport.left,
      viewport.top,
      viewport.width,
      viewport.height,
    );
    drawEditorDocument(
      context,
      history.present,
      natural,
      viewport,
      stickerImagesRef.current,
      tool === "sticker" ? selectedStickerId : null,
    );

    if (tool === "crop") {
      const topLeft = sourceToCanvas(
        { x: history.present.crop.x, y: history.present.crop.y },
        viewport,
        natural,
      );
      const bottomRight = sourceToCanvas(
        {
          x: history.present.crop.x + history.present.crop.width,
          y: history.present.crop.y + history.present.crop.height,
        },
        viewport,
        natural,
      );
      context.save();
      context.fillStyle = "rgba(23,23,29,.54)";
      context.beginPath();
      context.rect(viewport.left, viewport.top, viewport.width, viewport.height);
      context.rect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y,
      );
      context.fill("evenodd");
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5;
      context.strokeRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y,
      );
      for (const point of [
        topLeft,
        { x: bottomRight.x, y: topLeft.y },
        bottomRight,
        { x: topLeft.x, y: bottomRight.y },
      ]) {
        context.fillStyle = "#ffffff";
        context.strokeStyle = "#b52b30";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(point.x, point.y, 5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
      context.restore();
    }

    if (tool === "bbox" && bboxSelection) {
      const start = sourceToCanvas(
        { x: bboxSelection.x, y: bboxSelection.y },
        viewport,
        natural,
      );
      const end = sourceToCanvas(
        {
          x: bboxSelection.x + bboxSelection.width,
          y: bboxSelection.y + bboxSelection.height,
        },
        viewport,
        natural,
      );
      context.save();
      context.fillStyle = "rgba(181,43,48,.09)";
      context.strokeStyle = "#b52b30";
      context.lineWidth = 1.5;
      context.setLineDash([7, 5]);
      context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      context.restore();
    }
  }, [bboxSelection, history.present, natural, renderRevision, selectedStickerId, tool]);

  const bbox = useMemo(() => {
    if (!bboxSelection || !natural) return null;
    return createReferenceEditorBbox(
      bboxSelection,
      history.present.crop,
      natural.width,
      natural.height,
    );
  }, [bboxSelection, history.present.crop, natural]);

  const beginPixelGesture = useCallback((gesture: Gesture) => {
    gestureStartRef.current = historyRef.current.present;
    gestureRef.current = gesture;
  }, []);

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!natural || saving) return;
    const source = tool === "crop"
      ? { height: 1, width: 1, x: 0, y: 0 }
      : historyRef.current.present.crop;
    const viewport = viewportForCanvas(event.currentTarget, natural, source);
    const point = canvasToSource(event, viewport, natural);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "crop") {
      const handle = cropHandleAtPoint(point, historyRef.current.present.crop, viewport, natural);
      if (!handle && !pointWithinRect(point, historyRef.current.present.crop)) return;
      beginPixelGesture({ handle, kind: "crop", last: point, pointerId: event.pointerId });
      return;
    }
    if (!pointWithinRect(point, historyRef.current.present.crop)) return;
    if (tool === "brush") {
      const id = globalThis.crypto.randomUUID();
      beginPixelGesture({ id, kind: "brush", last: point, pointerId: event.pointerId });
      updatePresent((document) => ({
        ...document,
        strokes: [...document.strokes, { color: brushColor, id, points: [point], width: brushWidth }],
      }));
      return;
    }
    if (tool === "arrow") {
      const id = globalThis.crypto.randomUUID();
      beginPixelGesture({ id, kind: "arrow", last: point, pointerId: event.pointerId });
      updatePresent((document) => ({
        ...document,
        arrows: [...document.arrows, { color: brushColor, end: point, id, start: point, width: arrowWidth }],
      }));
      return;
    }
    if (tool === "bbox") {
      gestureRef.current = { kind: "bbox", pointerId: event.pointerId, start: point };
      setBboxSelection(rectFromPoints(point, point, historyRef.current.present.crop));
      setCopied(false);
      return;
    }
    if (tool === "sticker") {
      const sticker = [...historyRef.current.present.stickers].reverse().find((item) =>
        pointInReferenceEditorSticker(point, item, natural.width, natural.height)
      );
      setSelectedStickerId(sticker?.id ?? null);
      if (sticker) beginPixelGesture({ id: sticker.id, kind: "sticker", last: point, pointerId: event.pointerId });
    }
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !natural) return;
    const source = tool === "crop"
      ? { height: 1, width: 1, x: 0, y: 0 }
      : historyRef.current.present.crop;
    const viewport = viewportForCanvas(event.currentTarget, natural, source);
    const point = canvasToSource(event, viewport, natural);
    if (gesture.kind === "bbox") {
      setBboxSelection(rectFromPoints(gesture.start, point, historyRef.current.present.crop));
      return;
    }
    if (gesture.kind === "crop") {
      updatePresent((document) => ({
        ...document,
        crop: gesture.handle
          ? resizeCropRect(
              document.crop,
              gesture.handle,
              point,
              document.cropPreset,
              natural.width,
              natural.height,
            )
          : moveCropRect(document.crop, {
              x: point.x - gesture.last.x,
              y: point.y - gesture.last.y,
            }),
        cropPreset: gesture.handle && document.cropPreset === "original"
          ? "free"
          : document.cropPreset,
      }));
      gestureRef.current = { ...gesture, last: point };
      return;
    }
    if (gesture.kind === "brush") {
      updatePresent((document) => ({
        ...document,
        strokes: document.strokes.map((stroke) =>
          stroke.id === gesture.id
            ? { ...stroke, points: [...stroke.points, point] }
            : stroke
        ),
      }));
      gestureRef.current = { ...gesture, last: point };
      return;
    }
    if (gesture.kind === "arrow") {
      updatePresent((document) => ({
        ...document,
        arrows: document.arrows.map((arrow) =>
          arrow.id === gesture.id ? { ...arrow, end: point } : arrow
        ),
      }));
      gestureRef.current = { ...gesture, last: point };
      return;
    }
    updatePresent((document) => ({
      ...document,
      stickers: document.stickers.map((sticker) =>
        sticker.id === gesture.id
          ? moveReferenceEditorSticker(
              sticker,
              { x: point.x - gesture.last.x, y: point.y - gesture.last.y },
              document.crop,
            )
          : sticker
      ),
    }));
    gestureRef.current = { ...gesture, last: point };
  };

  const finishCanvasGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gestureRef.current = null;
    if (gesture.kind !== "bbox" && gestureStartRef.current) {
      const start = gestureStartRef.current;
      setHistoryState((current) => commitReferenceEditorGesture(current, start));
      setBboxSelection(null);
      setSaveError(null);
    }
    gestureStartRef.current = null;
  };

  const addSticker = useCallback(async (input: Readonly<{
    height: number;
    name: string;
    src: string;
    width: number;
  }>) => {
    if (!natural) return;
    setSaveError(null);
    try {
      const id = globalThis.crypto.randomUUID();
      const image = await loadCanvasImage(input.src);
      stickerImagesRef.current.set(id, image);
      const sticker = createReferenceEditorSticker({
        crop: historyRef.current.present.crop,
        id,
        imageHeight: natural.height,
        imageWidth: natural.width,
        name: input.name,
        sourceHeight: input.height || image.naturalHeight,
        sourceWidth: input.width || image.naturalWidth,
        src: input.src,
      });
      commitDocument({
        ...historyRef.current.present,
        stickers: [...historyRef.current.present.stickers, sticker],
      });
      setSelectedStickerId(id);
      setTool("sticker");
    } catch {
      setSaveError("贴图读取失败，请换一张图片重试。" );
    }
  }, [commitDocument, natural]);

  const handleLocalSticker = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const src = URL.createObjectURL(file);
    localStickerUrlsRef.current.add(src);
    void addSticker({ height: 0, name: file.name, src, width: 0 });
  };

  const transformSelectedSticker = (
    updater: (sticker: ReferenceEditorSticker) => ReferenceEditorSticker,
  ) => {
    if (!selectedStickerId) return;
    const next = {
      ...historyRef.current.present,
      stickers: historyRef.current.present.stickers.map((sticker) =>
        sticker.id === selectedStickerId ? updater(sticker) : sticker
      ),
    };
    commitDocument(next);
  };

  const requestClose = () => {
    if (saving) return;
    if (hasReferenceEditorPixelEdits(historyRef.current.present)) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    const sourceImage = sourceImageRef.current;
    if (!sourceImage || !hasReferenceEditorPixelEdits(historyRef.current.present)) return;
    setSaving(true);
    setSaveError(null);
    try {
      await Promise.all(historyRef.current.present.stickers.map(async (sticker) => {
        if (stickerImagesRef.current.has(sticker.id)) return;
        stickerImagesRef.current.set(sticker.id, await loadCanvasImage(sticker.src));
      }));
      const file = await exportEditedReference(
        reference.name,
        sourceImage,
        historyRef.current.present,
        stickerImagesRef.current,
      );
      await onSave(reference, file);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "编辑后的素材保存失败，请重试。" );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (saving || (!event.ctrlKey && !event.metaKey)) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          setHistoryState(redoReferenceEditorHistory);
        } else {
          setHistoryState(undoReferenceEditorHistory);
        }
        setBboxSelection(null);
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        setHistoryState(redoReferenceEditorHistory);
        setBboxSelection(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, setHistoryState]);

  const selectedSticker = history.present.stickers.find(
    (sticker) => sticker.id === selectedStickerId,
  );
  const canSave = Boolean(natural) && hasReferenceEditorPixelEdits(history.present) && !saving;

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
        <DialogPortal>
          <DialogOverlay className="reference-preview-overlay" />
          <DialogPrimitive.Content
            className="reference-preview-dialog reference-editor-dialog"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              requestClose();
            }}
          >
            <header className="reference-preview-dialog-header">
              <div>
                <span>图 {ordinal}</span>
                <DialogTitle title={reference.name}>{reference.name}</DialogTitle>
                <DialogDescription>查看细节或快速标注；完成后保存为新素材</DialogDescription>
              </div>
              <button
                className="reference-preview-close"
                aria-label="关闭参考图编辑器"
                disabled={saving}
                onClick={requestClose}
              >
                <X size={17} />
              </button>
            </header>

            <div className="reference-editor-body">
              <nav className="reference-editor-tools" aria-label="参考图编辑工具">
                {EDITOR_TOOLS.map(({ icon: Icon, label, tool: itemTool }) => (
                  <button
                    key={itemTool}
                    className={tool === itemTool ? "active" : ""}
                    aria-label={label}
                    aria-pressed={tool === itemTool}
                    title={label}
                    disabled={saving || !natural}
                    onClick={() => {
                      setTool(itemTool);
                      if (itemTool !== "sticker") setSelectedStickerId(null);
                    }}
                  >
                    <Icon size={18} />
                    <small>{label}</small>
                  </button>
                ))}
              </nav>

              <div className="reference-editor-workspace">
                <div className="reference-editor-options">
                  {tool === "view" && (
                    <span className="reference-editor-hint"><MousePointer2 size={14} />选择左侧工具开始编辑</span>
                  )}
                  {tool === "crop" && natural && (
                    <div className="reference-editor-choice-row" aria-label="裁剪比例">
                      {REFERENCE_EDITOR_CROP_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          className={history.present.cropPreset === preset.value ? "active" : ""}
                          onClick={() => commitDocument({
                            ...historyRef.current.present,
                            crop: cropRectForPreset(preset.value, natural.width, natural.height),
                            cropPreset: preset.value,
                          })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {(tool === "brush" || tool === "arrow") && (
                    <>
                      <div className="reference-editor-colors" aria-label="标注颜色">
                        {EDITOR_COLORS.map((color, index) => (
                          <button
                            key={color}
                            className={brushColor === color ? "active" : ""}
                            aria-label={["宫墙红", "深灰", "白色"][index]}
                            style={{ backgroundColor: color }}
                            onClick={() => setBrushColor(color)}
                          />
                        ))}
                      </div>
                      <div className="reference-editor-choice-row" aria-label="标注粗细">
                        {(tool === "brush"
                          ? [[0.008, "细"], [0.02, "中"], [0.055, "粗"]]
                          : [[0.004, "细"], [0.008, "中"], [0.014, "粗"]]
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            className={(tool === "brush" ? brushWidth : arrowWidth) === value ? "active" : ""}
                            onClick={() => tool === "brush"
                              ? setBrushWidth(value as number)
                              : setArrowWidth(value as number)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {tool === "sticker" && (
                    <div className="reference-editor-sticker-options">
                      <input
                        ref={localStickerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={handleLocalSticker}
                      />
                      <button className="reference-editor-local-sticker" onClick={() => localStickerInputRef.current?.click()}>
                        <ImagePlus size={14} />本地贴图
                      </button>
                      <div className="reference-editor-material-strip" aria-label="从资产库添加贴图">
                        {materials.slice(0, 24).map((material) => (
                          <button
                            key={material.id}
                            title={material.name}
                            aria-label={`添加贴图 ${material.name}`}
                            onClick={() => void addSticker({
                              height: material.height,
                              name: material.name,
                              src: `/api/references/${encodeURIComponent(material.id)}/content`,
                              width: material.width,
                            })}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt="" src={material.url} />
                          </button>
                        ))}
                        {materials.length === 0 && <small>资产库暂无可用素材</small>}
                      </div>
                      {selectedSticker && (
                        <div className="reference-editor-sticker-transform" aria-label="贴图变换">
                          <button aria-label="缩小贴图" title="缩小" onClick={() => transformSelectedSticker((item) => scaleReferenceEditorSticker(item, 0.84))}><Minus size={14} /></button>
                          <button aria-label="放大贴图" title="放大" onClick={() => transformSelectedSticker((item) => scaleReferenceEditorSticker(item, 1.19))}><Plus size={14} /></button>
                          <button aria-label="逆时针旋转贴图" title="逆时针旋转 15°" onClick={() => transformSelectedSticker((item) => rotateReferenceEditorSticker(item, -15))}><RotateCcw size={14} /></button>
                          <button aria-label="顺时针旋转贴图" title="顺时针旋转 15°" onClick={() => transformSelectedSticker((item) => rotateReferenceEditorSticker(item, 15))}><RotateCw size={14} /></button>
                          <button aria-label="删除贴图" title="删除贴图" onClick={() => {
                            commitDocument({
                              ...historyRef.current.present,
                              stickers: historyRef.current.present.stickers.filter((item) => item.id !== selectedStickerId),
                            });
                            setSelectedStickerId(null);
                          }}><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {tool === "bbox" && (
                    <span className="reference-editor-hint"><ScanLine size={14} />拖拽框选目标；坐标不会写入图片</span>
                  )}
                </div>

                <div className={`reference-editor-stage tool-${tool}`}>
                  {!natural && !loadError && (
                    <div className="reference-editor-state" role="status"><LoaderCircle size={20} />正在读取原图</div>
                  )}
                  {loadError && (
                    <div className="reference-editor-state error" role="alert">{loadError}</div>
                  )}
                  <canvas
                    ref={canvasRef}
                    aria-label={`图 ${ordinal} 编辑画布`}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={finishCanvasGesture}
                    onPointerCancel={finishCanvasGesture}
                  />
                </div>
              </div>
            </div>

            <footer className="reference-editor-footer">
              <div className="reference-editor-history">
                <button aria-label="撤销" title="撤销 Ctrl+Z" disabled={!history.past.length || saving} onClick={() => {
                  setHistoryState(undoReferenceEditorHistory);
                  setBboxSelection(null);
                }}><Undo2 size={16} /></button>
                <button aria-label="重做" title="重做 Ctrl+Y" disabled={!history.future.length || saving} onClick={() => {
                  setHistoryState(redoReferenceEditorHistory);
                  setBboxSelection(null);
                }}><Redo2 size={16} /></button>
                <button aria-label="重置全部编辑" title="重置全部编辑" disabled={!hasReferenceEditorPixelEdits(history.present) || saving} onClick={() => {
                  commitDocument(createReferenceEditorDocument());
                  setSelectedStickerId(null);
                }}><RotateCcw size={16} /></button>
              </div>

              <div className="reference-editor-bbox-output" aria-live="polite">
                {bbox ? (
                  <>
                    <span>
                      <strong>BBox</strong> [{bbox.normalized.join(", ")}] · {bbox.canvas.width}×{bbox.canvas.height}px
                    </span>
                    <button onClick={async () => {
                      await navigator.clipboard.writeText(formatReferenceEditorBboxPrompt(ordinal, bbox));
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制"}</button>
                    <button onClick={() => onInsertPrompt(formatReferenceEditorBboxPrompt(ordinal, bbox))}>加入提示词</button>
                  </>
                ) : saveError ? (
                  <span className="reference-editor-save-error" role="alert">{saveError}</span>
                ) : (
                  <span className="reference-editor-dimensions">
                    {natural ? `${Math.round(natural.width * history.present.crop.width)} × ${Math.round(natural.height * history.present.crop.height)} px` : ""}
                  </span>
                )}
              </div>

              <div className="reference-editor-actions">
                <button className="secondary" disabled={saving} onClick={requestClose}>取消</button>
                <button className="primary" disabled={!canSave} onClick={() => void handleSave()}>
                  {saving ? <><LoaderCircle size={15} />正在保存</> : "完成编辑"}
                </button>
              </div>
            </footer>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent
          size="sm"
          className="reference-editor-discard-dialog"
          overlayClassName="reference-editor-discard-overlay"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>放弃本次编辑？</AlertDialogTitle>
            <AlertDialogDescription>裁剪和标注尚未保存，关闭后将无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>放弃编辑</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
