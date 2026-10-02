"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { NodeToolbar, Position, useReactFlow, useStore } from "@xyflow/react";
import { Check, ChevronDown, ChevronRight, Crop, Link2, LoaderCircle, Unlink2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CanvasNode } from "./canvas-workspace";
import { canvasCropImageForNode, exportCanvasCrop, loadCanvasCropImage, type CanvasCropCommit, type CanvasCropImage, type CanvasCropRequest } from "./canvas-image-crop-image";
import { CANVAS_CROP_PRESET_GROUPS, centeredCanvasCrop, moveCanvasCrop, resizeCanvasCrop, setCanvasCropDimension, type CanvasCropCorner, type CanvasCropPoint, type CanvasCropRect, type CanvasCropSize } from "./canvas-image-crop-model";
import styles from "./canvas-image-crop.module.css";

export const CanvasImageCropContext = createContext<{
  request: CanvasCropRequest | null;
  openCrop: (image: CanvasCropImage) => void;
}>({ request: null, openCrop: () => {} });

export function useCanvasImageCrop() { return useContext(CanvasImageCropContext); }

export function CanvasImageCropToolbar({ image, selected, offsetX = 0 }: Readonly<{ image: CanvasCropImage | null; selected: boolean; offsetX?: number }>) {
  const { request, openCrop } = useCanvasImageCrop();
  const zoom = useStore((state) => state.transform[2]);
  const selectedCount = useStore((state) => [...state.nodeLookup.values()].filter((node) => node.selected).length);
  if (!image || request) return null;
  return <NodeToolbar nodeId={image.nodeId} isVisible={selected && selectedCount === 1} position={Position.Top} offset={12 + 22 * zoom}>
    <div className={`${styles.toolbar} nodrag nopan nowheel nokey`} style={offsetX ? { transform: `translateX(${offsetX * zoom}px)` } : undefined} role="toolbar" aria-label="图片快捷操作" onPointerDown={(event) => event.stopPropagation()}>
      <Button type="button" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); openCrop(image); }} aria-label="裁剪图片" title="裁剪图片">
        <Crop size={15} strokeWidth={1.7} aria-hidden="true" />裁剪
      </Button>
    </div>
  </NodeToolbar>;
}

type ScreenRect = Readonly<{ left: number; top: number; width: number; height: number }>;
type CropDrag = Readonly<{ pointerId: number; start: CanvasCropPoint; crop: CanvasCropRect; corner: CanvasCropCorner | null }>;
const CORNERS: readonly CanvasCropCorner[] = ["nw", "ne", "se", "sw"];
const CORNER_LABELS = { nw: "左上", ne: "右上", se: "右下", sw: "左下" };

function cropCornerPoint(crop: CanvasCropRect, corner: CanvasCropCorner) {
  return { x: crop.x + (corner === "ne" || corner === "se" ? crop.width : 0), y: crop.y + (corner === "sw" || corner === "se" ? crop.height : 0) };
}

export function CanvasImageCropEditor({ request, onClose, onCommit }: Readonly<{
  request: CanvasCropRequest;
  onClose: () => void;
  onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const flow = useReactFlow<CanvasNode>();
  const liveNode = useStore((state) => state.nodeLookup.get(request.nodeId));
  const transform = useStore((state) => state.transform);
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof loadCanvasCropImage>> | null>(null);
  const [natural, setNatural] = useState<CanvasCropSize | null>(null);
  const [crop, setCrop] = useState<CanvasCropRect | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [presetId, setPresetId] = useState("original");
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  const [inputDrafts, setInputDrafts] = useState<Partial<Record<"width" | "height", string>>>({});
  const [loadRevision, setLoadRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<ScreenRect | null>(null);
  const [imageLayer, setImageLayer] = useState<ScreenRect | null>(null);
  const [panelPosition, setPanelPosition] = useState({ left: 12, top: 76, width: 240, maxHeight: 480 });
  const lifecycleRef = useRef<AbortController | null>(null);
  const dragRef = useRef<CropDrag | null>(null);
  const savingRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const controller = new AbortController();
    lifecycleRef.current = controller;
    panelRef.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current();
    };
    document.addEventListener("keydown", escape, true);
    return () => {
      controller.abort();
      dragRef.current = null;
      document.removeEventListener("keydown", escape, true);
    };
  }, []);

  useEffect(() => {
    const current = canvasCropImageForNode(flow.getNode(request.nodeId), request.imageId);
    if (!liveNode?.selected || !current || current.key !== request.key || current.imageId !== request.imageId) closeRef.current();
  }, [flow, liveNode, request]);

  useEffect(() => {
    const controller = new AbortController();
    let resource: Awaited<ReturnType<typeof loadCanvasCropImage>> | null = null;
    setLoading(true);
    setError(null);
    setLoaded(null);
    void loadCanvasCropImage(request.contentUrl, controller.signal).then((result) => {
      resource = result;
      if (controller.signal.aborted) { result.dispose(); return; }
      const size = { width: result.image.naturalWidth, height: result.image.naturalHeight };
      setLoaded(result);
      setNatural(size);
      setCrop((current) => current ?? centeredCanvasCrop(size, null));
      setRatio((current) => current ?? (presetId === "original" ? size.width / size.height : null));
      setLoading(false);
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      setError(cause instanceof Error ? cause.message : "原图读取失败，请重试。");
    });
    return () => { controller.abort(); resource?.dispose(); };
    // Retry retains the existing pixel selection; a new image gets a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.contentUrl, loadRevision]);

  useLayoutEffect(() => {
    const nodeElement = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node")).find((element) => element.dataset.id === request.nodeId);
    const imageElement = Array.from(nodeElement?.querySelectorAll<HTMLElement>("[data-canvas-crop-image]") ?? []).find((element) => element.dataset.canvasCropImage === request.imageId)?.querySelector<HTMLImageElement>("img");
    const surface = document.getElementById("canvas-workspace-surface");
    if (!imageElement || !surface) { closeRef.current(); return; }
    const measure = () => {
      const imageBounds = imageElement.getBoundingClientRect();
      const source = natural ?? { width: imageElement.naturalWidth, height: imageElement.naturalHeight };
      const scale = source.width > 0 && source.height > 0 ? Math.min(imageBounds.width / source.width, imageBounds.height / source.height) : 0;
      const rect = { left: imageBounds.left + (imageBounds.width - source.width * scale) / 2,
        top: imageBounds.top + (imageBounds.height - source.height * scale) / 2, width: source.width * scale, height: source.height * scale };
      if (rect.width > 0 && rect.height > 0) setAnchor(rect);
      const bounds = surface.getBoundingClientRect();
      const sidebarRight = document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().right ?? bounds.left;
      const layerLeft = Math.max(bounds.left, sidebarRight);
      const layerTop = bounds.top + 60;
      setImageLayer({ left: layerLeft, top: layerTop, width: Math.max(0, bounds.right - layerLeft), height: Math.max(0, bounds.bottom - 48 - layerTop) });
      const minLeft = Math.min(bounds.right - 12, Math.max(bounds.left, sidebarRight) + 12);
      const width = Math.max(180, Math.min(240, bounds.right - minLeft - 12));
      const maxLeft = Math.max(bounds.left + 8, bounds.right - width - 12);
      let left = rect.left + rect.width + 12;
      if (left > maxLeft) left = rect.left - width - 12;
      left = Math.max(Math.min(minLeft, maxLeft), Math.min(left, maxLeft));
      const minTop = bounds.top + 70;
      const bottom = Math.min(bounds.bottom - 52, window.innerHeight - 12);
      const top = Math.max(minTop, Math.min(rect.top, bottom - 320));
      setPanelPosition({ left, top, width, maxHeight: Math.max(160, Math.min(540, bottom - top)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(imageElement);
    observer.observe(surface);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [request.nodeId, request.imageId, natural, transform, liveNode]);

  const resetInputDrafts = () => setInputDrafts({});
  const pointForEvent = (event: PointerEvent<HTMLDivElement>): CanvasCropPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * natural!.width, y: (event.clientY - bounds.top) / bounds.height * natural!.height };
  };
  const keyDelta = (event: ReactKeyboardEvent): CanvasCropPoint | null => {
    const amount = event.shiftKey ? 10 : 1;
    const delta = event.key === "ArrowLeft" ? { x: -amount, y: 0 } : event.key === "ArrowRight" ? { x: amount, y: 0 }
      : event.key === "ArrowUp" ? { x: 0, y: -amount } : event.key === "ArrowDown" ? { x: 0, y: amount } : null;
    if (delta) { event.preventDefault(); event.stopPropagation(); resetInputDrafts(); setPresetId(""); }
    return delta;
  };
  const commit = async () => {
    if (!loaded || !natural || !crop || savingRef.current || !lifecycleRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const signal = lifecycleRef.current.signal;
    try {
      const file = await exportCanvasCrop(loaded.image, crop, request.name, signal);
      signal.throwIfAborted();
      if (onCommit({ request, file, width: crop.width, height: crop.height })) closeRef.current();
      else throw new Error("这张图片或当前页面已变化，请取消后重新裁剪。");
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "图片导出失败，请重试。");
    } finally {
      savingRef.current = false;
      if (!signal.aborted) setSaving(false);
    }
  };

  const percent = (value: number, dimension: "width" | "height") => `${value / natural![dimension] * 100}%`;
  return createPortal(<>
    {anchor && imageLayer && loaded && natural && crop && <div className={styles.imageLayer} style={imageLayer}><div className={`${styles.surface} nodrag nopan nowheel nokey`}
      style={{ ...anchor, left: anchor.left - imageLayer.left, top: anchor.top - imageLayer.top }} aria-label={`裁剪 ${request.name}`}
      onPointerDown={(event) => {
        if (saving || event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        const target = event.target instanceof Element ? event.target : null;
        const corner = target?.closest<HTMLElement>("[data-crop-corner]")?.dataset.cropCorner as CanvasCropCorner | undefined;
        if (!corner && !target?.closest("[data-crop-selection]")) return;
        dragRef.current = { pointerId: event.pointerId, start: pointForEvent(event), crop, corner: corner ?? null };
        resetInputDrafts();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag?.pointerId !== event.pointerId || saving) return;
        event.stopPropagation();
        const point = pointForEvent(event);
        setCrop(drag.corner ? resizeCanvasCrop(drag.crop, drag.corner, point, ratio, natural)
          : moveCanvasCrop(drag.crop, { x: point.x - drag.start.x, y: point.y - drag.start.y }, natural));
        if (drag.corner) setPresetId("");
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        event.stopPropagation();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { if (dragRef.current) setCrop(dragRef.current.crop); dragRef.current = null; }}
      onLostPointerCapture={() => { dragRef.current = null; }}>
      <PrivateObjectImage src={loaded.objectUrl} alt="" className={styles.original} loading="eager" />
      <div className={styles.mask} style={{ left: 0, top: 0, width: "100%", height: percent(crop.y, "height") }} />
      <div className={styles.mask} style={{ left: 0, top: percent(crop.y + crop.height, "height"), width: "100%", bottom: 0 }} />
      <div className={styles.mask} style={{ left: 0, top: percent(crop.y, "height"), width: percent(crop.x, "width"), height: percent(crop.height, "height") }} />
      <div className={styles.mask} style={{ left: percent(crop.x + crop.width, "width"), top: percent(crop.y, "height"), right: 0, height: percent(crop.height, "height") }} />
      <div className={styles.selection} data-crop-selection role="group" aria-label="裁剪选区，方向键移动，Shift 加速" tabIndex={saving ? -1 : 0}
        style={{ left: percent(crop.x, "width"), top: percent(crop.y, "height"), width: percent(crop.width, "width"), height: percent(crop.height, "height") }}
        onKeyDown={(event) => { if (saving) return; const delta = keyDelta(event); if (delta) setCrop(moveCanvasCrop(crop, delta, natural)); }}>
        {[1, 2].map((part) => <span key={`v-${part}`} className={styles.gridVertical} style={{ left: `${part / 3 * 100}%` }} />)}
        {[1, 2].map((part) => <span key={`h-${part}`} className={styles.gridHorizontal} style={{ top: `${part / 3 * 100}%` }} />)}
        {CORNERS.map((corner) => <button key={corner} type="button" className={styles.corner} data-crop-corner={corner}
          style={{ left: corner === "nw" || corner === "sw" ? 0 : "100%", top: corner === "nw" || corner === "ne" ? 0 : "100%" }}
          disabled={saving} aria-label={`调整${CORNER_LABELS[corner]}裁剪角，方向键调整`}
          onKeyDown={(event) => { const delta = keyDelta(event); if (!delta) return; const point = cropCornerPoint(crop, corner); setCrop(resizeCanvasCrop(crop, corner, { x: point.x + delta.x, y: point.y + delta.y }, ratio, natural)); }} />)}
      </div>
    </div></div>}
    <section ref={panelRef} className={`${styles.panel} nodrag nopan nowheel nokey`} style={panelPosition} aria-label="裁剪图片" tabIndex={-1}
      onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <header className={styles.panelHeader}><strong>裁剪</strong>
        <div className={styles.dimensions}>
          {(["width", "height"] as const).map((dimension, index) => <label key={dimension} className={styles.dimension} style={{ gridColumn: index === 0 ? 1 : 3 }}>
            <span aria-hidden="true">{index === 0 ? "W" : "H"}</span>
            <Input type="number" inputMode="numeric" min={1} max={natural?.[dimension]} step={1} value={inputDrafts[dimension] ?? crop?.[dimension] ?? ""}
              disabled={!loaded || saving} aria-label={`裁剪${index === 0 ? "宽度" : "高度"}，像素`}
              onChange={(event) => {
                const value = event.target.value;
                setInputDrafts((current) => ({ ...current, [dimension]: value }));
                if (crop && natural && Number(value) > 0) { setCrop(setCanvasCropDimension(crop, dimension, Number(value), ratio, natural)); setPresetId(""); }
              }}
              onBlur={() => setInputDrafts((current) => ({ ...current, [dimension]: undefined }))}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
          </label>)}
          <Button type="button" variant="ghost" size="icon-sm" className={styles.ratioLock} aria-label={ratio ? "解锁裁剪比例" : "锁定裁剪比例"} title={ratio ? "解锁比例" : "锁定比例"} aria-pressed={Boolean(ratio)} disabled={!crop || !loaded || saving}
            onClick={() => { setRatio(ratio ? null : crop!.width / crop!.height); setPresetId(""); }}>
            {ratio ? <Link2 size={13} aria-hidden="true" /> : <Unlink2 size={13} aria-hidden="true" />}
          </Button>
        </div>
      </header>
      {loading ? <div className={styles.status} role="status"><LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />正在读取原图…</div>
        : !loaded ? <div className={styles.loadFailure} role="alert"><p>{error ?? "原图读取失败。"}</p><Button type="button" size="sm" variant="outline" onClick={() => setLoadRevision((value) => value + 1)}>重试读取</Button></div>
        : <div className={styles.presets}>
          <span className={styles.presetsLabel}>预设</span>
          {CANVAS_CROP_PRESET_GROUPS.map((group) => <div key={group.id} className={styles.presetGroup}>
            <button type="button" className={styles.groupToggle} aria-expanded={openGroups.has(group.id)} aria-controls={`crop-${request.sessionId}-${group.id}`} disabled={saving}
              onClick={() => setOpenGroups((current) => { const next = new Set(current); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}>
              {openGroups.has(group.id) ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}{group.label}
            </button>
            {openGroups.has(group.id) && <div id={`crop-${request.sessionId}-${group.id}`} className={styles.presetItems}>
              {group.presets.map((preset) => {
                const aspect = preset.original ? natural!.width / natural!.height : preset.width && preset.height ? preset.width / preset.height : 1;
                return <button type="button" key={preset.id} className={styles.preset} aria-pressed={presetId === preset.id} disabled={saving}
                  title={preset.dimensions ? `${preset.label}，参考尺寸 ${preset.width} × ${preset.height}，按比例裁剪原图` : preset.label}
                  onClick={() => { const nextRatio = preset.free ? null : aspect; setRatio(nextRatio); setCrop(centeredCanvasCrop(natural!, nextRatio)); setPresetId(preset.id); resetInputDrafts(); }}>
                  <span className={styles.check}>{presetId === preset.id && <Check size={12} aria-hidden="true" />}</span>
                  <span className={styles.ratioIcon} aria-hidden="true"><span style={{ width: Math.min(14, 14 * aspect), height: Math.min(14, 14 / aspect) }} /></span>
                  <span>{preset.label}</span>{preset.dimensions && <span className={styles.presetDimensions}>{preset.width}×{preset.height}</span>}
                </button>;
              })}
            </div>}
          </div>)}
        </div>}
      {loaded && error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.actions}>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>取消</Button>
        <Button type="button" size="sm" disabled={!loaded || !crop || loading || saving} onClick={() => void commit()}>{saving ? <><LoaderCircle size={13} className={styles.spinner} aria-hidden="true" />正在处理</> : "完成"}</Button>
      </footer>
    </section>
  </>, document.body);
}
