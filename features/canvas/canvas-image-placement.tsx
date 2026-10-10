"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { ArrowDown, ArrowUp, Hand, Images, Minus, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { canvasCropImageForNode, type CanvasCropCommit, type CanvasCropImage, type CanvasCropRequest } from "./canvas-image-crop-image";
import { CanvasImagePlacementContext, type ImagePlacementMode } from "./canvas-image-placement-context";
import { exportStickerComposition, loadPlacementImage, type PlacementImage } from "./canvas-image-placement-image";
import { PlacementAssetPicker } from "./canvas-image-placement-picker";
import { CanvasImageRegionEditor } from "./canvas-image-region";
import { MAX_STICKER_LAYERS, PLACEMENT_CORNERS, defaultPlacement, fitImageView, imagePoint, movePlacement, normalizeRotation, placementCorner, reorderPlacementLayers, resizePlacement, rotatePlacement, scalePlacement, zoomImageView, type ImagePlacementView, type PlacementCorner, type PlacementPoint, type StickerPlacement } from "./canvas-image-placement-model.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-image-placement.module.css";

type PlacementRequest = CanvasCropRequest & Readonly<{ mode: ImagePlacementMode; ownerKey: string; trigger: HTMLButtonElement }>;
type Sticker = Readonly<{ id: string; name: string; resource: PlacementImage; placement: StickerPlacement }>;
type Drag = Readonly<{
  pointerId: number; kind: "pan" | "layer-move" | "layer-resize" | "rotate";
  start: PlacementPoint; view: ImagePlacementView; layer: Sticker | null; corner?: PlacementCorner;
}>;
const CORNER_NAMES = { nw: "左上", ne: "右上", se: "右下", sw: "左下" };

export function CanvasImagePlacementProvider({ children, enabled, libraryEnabled, ownerKey, pageKey, onCommit }: Readonly<{
  children: ReactNode; enabled: boolean; libraryEnabled: boolean; ownerKey: string; pageKey: string; onCommit: (commit: CanvasCropCommit) => boolean;
}>) {
  const [request, setRequest] = useState<PlacementRequest | null>(null);
  const visible = enabled && request?.ownerKey === ownerKey && request.pageId === pageKey ? request : null;
  useEffect(() => { Promise.resolve().then(() => setRequest(null)); }, [enabled, ownerKey, pageKey]);
  return <CanvasImagePlacementContext.Provider value={{ enabled, regionKey: visible?.mode === "region" ? visible.key : null, openPlacement: (image, mode, trigger) => {
    if (enabled) setRequest({ ...image, mode, trigger, ownerKey, pageId: pageKey, sessionId: crypto.randomUUID() });
  } }}>
    {children}
    {visible?.mode === "region" && <CanvasImageRegionEditor key={visible.sessionId} request={visible} onCommit={onCommit} onClose={() => setRequest(null)} />}
    {visible?.mode === "sticker" && <PlacementDialog key={visible.sessionId} request={visible} libraryEnabled={libraryEnabled} onCommit={onCommit} onClose={() => setRequest(null)} />}
  </CanvasImagePlacementContext.Provider>;
}

function PlacementDialog({ request, libraryEnabled, onCommit, onClose }: Readonly<{
  request: PlacementRequest; libraryEnabled: boolean; onCommit: (commit: CanvasCropCommit) => boolean; onClose: () => void;
}>) {
  const flow = useReactFlow<CanvasNode>();
  const liveNode = useStore((state) => state.nodeLookup.get(request.nodeId));
  const [base, setBase] = useState<PlacementImage | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [layers, setLayers] = useState<readonly Sticker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ImagePlacementView>({ x: 0, y: 0, scale: 1 });
  const [panMode, setPanMode] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const resources = useRef(new Set<PlacementImage>());
  const layersRef = useRef(layers);
  const dragRef = useRef<Drag | null>(null);
  const busyRef = useRef(false);
  const spaceRef = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const title = "贴图";
  const size = base ? { width: base.image.naturalWidth, height: base.image.naturalHeight } : null;
  const selected = layers.find((layer) => layer.id === selectedId) ?? null;
  const disabled = !base || saving || adding;
  const clipId = `placement-${request.sessionId}`;

  const updateLayers = (update: (current: readonly Sticker[]) => readonly Sticker[]) => {
    const next = update(layersRef.current);
    layersRef.current = next; setLayers(next);
  };
  const changeLayer = (id: string, placement: StickerPlacement) => updateLayers((current) => current.map((layer) => layer.id === id ? { ...layer, placement } : layer));

  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    const ownedResources = resources.current;
    return () => { controller.abort(); dragRef.current = null; for (const resource of ownedResources) resource.dispose(); ownedResources.clear(); };
  }, []);
  useEffect(() => {
    const current = canvasCropImageForNode(flow.getNode(request.nodeId), request.imageId);
    if (!liveNode?.selected || !current || current.key !== request.key || current.imageId !== request.imageId) closeRef.current();
  }, [flow, liveNode, request]);
  useEffect(() => {
    const controller = new AbortController(); let resource: PlacementImage | null = null;
    Promise.resolve().then(() => { if (!controller.signal.aborted) { setBase(null); setSourceError(null); setError(null); } });
    void loadPlacementImage(request, controller.signal).then((loaded) => {
      resource = loaded;
      if (controller.signal.aborted) { loaded.dispose(); return; }
      setBase(loaded);
    }).catch((cause) => { if (!controller.signal.aborted) setSourceError(cause instanceof Error ? cause.message : "原图读取失败，请重试。"); });
    return () => { controller.abort(); resource?.dispose(); };
  }, [request, attempt]);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !base) return;
    const fit = () => {
      dragRef.current = null;
      setView(fitImageView({ width: base.image.naturalWidth, height: base.image.naturalHeight }, { width: viewport.clientWidth, height: viewport.clientHeight }));
    };
    fit(); const observer = new ResizeObserver(fit); observer.observe(viewport);
    return () => observer.disconnect();
  }, [base]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); event.stopPropagation();
      if (disabled || dragRef.current) return;
      const bounds = viewport.getBoundingClientRect();
      const factor = Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.005);
      setView((current) => zoomImageView(current, current.scale * factor, { x: event.clientX - bounds.left, y: event.clientY - bounds.top }));
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  }, [disabled]);

  const fit = () => {
    const viewport = viewportRef.current;
    if (viewport && size) { dragRef.current = null; setView(fitImageView(size, { width: viewport.clientWidth, height: viewport.clientHeight })); }
  };
  const zoom = (factor: number, anchor?: PlacementPoint) => {
    const viewport = viewportRef.current;
    if (!viewport || disabled || dragRef.current) return;
    setView((current) => zoomImageView(current, current.scale * factor, anchor ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }));
  };
  const screenPoint = (event: Readonly<{ clientX: number; clientY: number }>) => {
    const bounds = viewportRef.current!.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const startDrag = (event: PointerEvent, kind: Drag["kind"], layer: Sticker | null = null, corner?: PlacementCorner) => {
    if (disabled || dragRef.current || !size || !viewportRef.current || event.button !== 0 && event.button !== 1) return;
    const actualKind = event.button === 1 || panMode || spaceRef.current ? "pan" : kind;
    const point = screenPoint(event);
    event.preventDefault(); event.stopPropagation();
    if (layer) setSelectedId(layer.id);
    setError(null);
    dragRef.current = { pointerId: event.pointerId, kind: actualKind, start: point, view, layer, corner };
    viewportRef.current.setPointerCapture(event.pointerId);
    viewportRef.current.focus({ preventScroll: true });
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId || !size) return;
    event.preventDefault();
    const screen = screenPoint(event);
    if (drag.kind === "pan") { setView({ ...drag.view, x: drag.view.x + screen.x - drag.start.x, y: drag.view.y + screen.y - drag.start.y }); return; }
    const start = imagePoint(drag.start, drag.view), point = imagePoint(screen, drag.view);
    const delta = { x: point.x - start.x, y: point.y - start.y };
    if (drag.layer) {
      const layer = drag.layer.placement;
      const next = drag.kind === "layer-move" ? movePlacement(layer, delta, size)
        : drag.kind === "layer-resize" && drag.corner ? resizePlacement(layer, drag.corner, point)
        : rotatePlacement(layer, start, point, event.shiftKey);
      changeLayer(drag.layer.id, next);
    }
  };
  const finishDrag = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (cancel) {
      setView(drag.view);
      if (drag.layer) changeLayer(drag.layer.id, drag.layer.placement);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyDelta = (event: KeyboardEvent): PlacementPoint | null => {
    const step = event.shiftKey ? 10 : 1;
    const directions: Partial<Record<string, PlacementPoint>> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const direction = directions[event.key];
    if (direction) { event.preventDefault(); event.stopPropagation(); return direction; }
    return null;
  };
  const removeSelected = () => {
    if (!selected || disabled) return;
    selected.resource.dispose(); resources.current.delete(selected.resource);
    updateLayers((current) => current.filter((layer) => layer.id !== selected.id));
    setSelectedId(layersRef.current.at(-1)?.id ?? null);
  };
  const addImages = async (sources: readonly (File | CanvasCropImage)[]) => {
    const signal = lifecycle.current?.signal;
    if (!size || !signal || signal.aborted || busyRef.current || !sources.length) return;
    busyRef.current = true; setAdding(true); setError(null); dragRef.current = null;
    const failures: string[] = [];
    try {
      for (const source of sources) {
        signal.throwIfAborted();
        if (layersRef.current.length >= MAX_STICKER_LAYERS) { failures.push(`最多添加 ${MAX_STICKER_LAYERS} 张贴图。`); break; }
        let resource: PlacementImage | null = null;
        try {
          resource = await loadPlacementImage(source, signal); signal.throwIfAborted();
          const layer: Sticker = { id: crypto.randomUUID(), name: source.name, resource,
            placement: defaultPlacement({ width: resource.image.naturalWidth, height: resource.image.naturalHeight }, size) };
          resources.current.add(resource); resource = null;
          updateLayers((current) => [...current, layer]); setSelectedId(layer.id); setAssetOpen(false);
        } catch (cause) {
          resource?.dispose();
          if (signal.aborted) throw cause;
          failures.push(`${source.name}：${cause instanceof Error ? cause.message : "贴图读取失败，请重试。"}`);
        }
      }
      if (failures.length) setError(failures.join(" "));
    } catch (cause) { if (!signal.aborted) setError(cause instanceof Error ? cause.message : "贴图读取失败，请重试。"); }
    finally { busyRef.current = false; if (!signal.aborted) setAdding(false); }
  };
  const save = async () => {
    const signal = lifecycle.current?.signal;
    if (!base || !size || !layers.length || busyRef.current || !signal || signal.aborted) return;
    busyRef.current = true; setSaving(true); setError(null); dragRef.current = null;
    try {
      const file = await exportStickerComposition(base.image, layersRef.current, request.name, signal);
      signal.throwIfAborted();
      if (!onCommit({ request, file, ...size, createCopy: true })) throw new Error("当前图片或页面已变化，请关闭后重新打开贴图。");
      closeRef.current();
    } catch (cause) { if (!signal.aborted) setError(cause instanceof Error ? cause.message : "贴图保存失败，请重试。"); }
    finally { busyRef.current = false; if (!signal.aborted) setSaving(false); }
  };
  const cancel = () => { lifecycle.current?.abort(); onClose(); };

  return <Dialog open onOpenChange={(open) => { if (!open) cancel(); }}>
    <DialogContent className={`${styles.dialog} nodrag nopan nowheel nokey`} overlayClassName={styles.overlay} showCloseButton={false}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (request.trigger.isConnected) request.trigger.focus({ preventScroll: true }); }}>
      <header className={styles.header}><DialogTitle className={styles.title}>{title}</DialogTitle>
        <DialogDescription className="sr-only">添加上层图片，调整位置、大小和旋转，保存新的图片。</DialogDescription>
        <Button variant="ghost" size="icon" aria-label={`关闭${title}`} onClick={cancel}><X size={18} strokeWidth={1.7} /></Button>
      </header>
      <div className={styles.body}>
        <section className={styles.preview} aria-label={`${title}预览`}>
          <div ref={viewportRef} className={styles.viewport} data-mode="sticker" data-pan={panMode} tabIndex={0} aria-label="图片编辑视图，滚轮缩放，空格或平移按钮拖动画面"
            aria-busy={adding || saving || !base && !sourceError}
            onPointerDown={(event) => {
              if (disabled) return;
              if (panMode || spaceRef.current || event.button === 1) startDrag(event, "pan");
              else setSelectedId(null);
            }} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
            onBlur={() => { spaceRef.current = false; }} onKeyUp={(event) => { if (event.key === " ") spaceRef.current = false; }}
            onKeyDown={(event) => {
              if (disabled || !size) return;
              if (event.key === " ") { event.preventDefault(); spaceRef.current = true; return; }
              if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.2); return; }
              if (event.key === "-") { event.preventDefault(); zoom(1 / 1.2); return; }
              if (event.key === "0") { event.preventDefault(); fit(); return; }
              if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); removeSelected(); return; }
              const delta = keyDelta(event);
              if (delta && selected) changeLayer(selected.id, movePlacement(selected.placement, delta, size));
            }}>
            {base && size && <svg className={styles.imagePlane} width={size.width * view.scale} height={size.height * view.scale} viewBox={`0 0 ${size.width} ${size.height}`} style={{ left: view.x, top: view.y }} aria-label="编辑图片">
              <defs><clipPath id={clipId}><rect width={size.width} height={size.height} /></clipPath></defs>
              <g clipPath={`url(#${clipId})`}>
                <image href={base.objectUrl} width={size.width} height={size.height} />
                {layers.map((layer) => <g key={layer.id} transform={`translate(${layer.placement.cx} ${layer.placement.cy}) rotate(${layer.placement.rotation})`} onPointerDown={(event) => startDrag(event, "layer-move", layer)} className={styles.move}>
                  <image href={layer.resource.objectUrl} x={-layer.placement.width / 2} y={-layer.placement.height / 2} width={layer.placement.width} height={layer.placement.height} preserveAspectRatio="none" />
                </g>)}
              </g>
              {selected && <g transform={`translate(${selected.placement.cx} ${selected.placement.cy}) rotate(${selected.placement.rotation})`}>
                <rect x={-selected.placement.width / 2} y={-selected.placement.height / 2} width={selected.placement.width} height={selected.placement.height} fill="none" stroke="#fff" strokeWidth={3 / view.scale} pointerEvents="none" />
                <rect x={-selected.placement.width / 2} y={-selected.placement.height / 2} width={selected.placement.width} height={selected.placement.height} fill="transparent" stroke="#242424" strokeWidth={1 / view.scale} className={styles.move} onPointerDown={(event) => startDrag(event, "layer-move", selected)} />
                <line x1={0} y1={-selected.placement.height / 2} x2={0} y2={-selected.placement.height / 2 - 26 / view.scale} stroke="#fff" strokeWidth={3 / view.scale} pointerEvents="none" />
                <line x1={0} y1={-selected.placement.height / 2} x2={0} y2={-selected.placement.height / 2 - 26 / view.scale} stroke="#242424" strokeWidth={1 / view.scale} pointerEvents="none" />
                {PLACEMENT_CORNERS.map((corner) => <circle key={corner} cx={selected.placement.width / 2 * (corner.includes("w") ? -1 : 1)} cy={selected.placement.height / 2 * (corner.includes("n") ? -1 : 1)} r={6 / view.scale} strokeWidth={1 / view.scale} className={styles.corner} data-corner={corner}
                  role="button" tabIndex={disabled ? -1 : 0} aria-label={`缩放贴图${CORNER_NAMES[corner]}角`} onPointerDown={(event) => startDrag(event, "layer-resize", selected, corner)} onKeyDown={(event) => {
                    if (disabled) return; const delta = keyDelta(event), point = placementCorner(selected.placement, corner);
                    if (delta) changeLayer(selected.id, resizePlacement(selected.placement, corner, { x: point.x + delta.x, y: point.y + delta.y }));
                  }} />)}
                <circle cx={0} cy={-selected.placement.height / 2 - 26 / view.scale} r={6 / view.scale} strokeWidth={1 / view.scale} className={`${styles.corner} ${styles.rotation}`} role="button" tabIndex={disabled ? -1 : 0} aria-label="旋转贴图，左右方向键调整，Shift为15度" onPointerDown={(event) => startDrag(event, "rotate", selected)} onKeyDown={(event) => {
                  if (disabled || event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault(); event.stopPropagation();
                  changeLayer(selected.id, { ...selected.placement, rotation: normalizeRotation(selected.placement.rotation + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 15 : 1)) });
                }} />
              </g>}
            </svg>}
            {!base && <div className={styles.status} role="status">{sourceError ?? "正在读取原图…"}{sourceError && <Button variant="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>重新读取</Button>}</div>}
          </div>
          <div className={styles.viewTools}>
            <Button variant="ghost" size="sm" disabled={disabled} aria-pressed={panMode} title="拖动画面，也可按住空格" onClick={() => setPanMode((value) => !value)}><Hand size={14} />平移</Button>
            <Button variant="ghost" size="sm" disabled={disabled} aria-label="缩小画面" onClick={() => zoom(1 / 1.2)}><Minus size={14} /></Button>
            <span>{Math.round(view.scale * 100)}%</span>
            <Button variant="ghost" size="sm" disabled={disabled} aria-label="放大画面" onClick={() => zoom(1.2)}><Plus size={14} /></Button>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={fit}>适应画面</Button>
          </div>
        </section>
        <aside className={styles.panel} aria-label={`${title}设置`}>
          <p className={styles.dimensions}>{size ? `原图 · ${size.width} × ${size.height}` : "原图尚未就绪"}</p>
            <div className={styles.actions}>
              <Button variant="secondary" size="sm" disabled={disabled || layers.length >= MAX_STICKER_LAYERS} onClick={() => fileRef.current?.click()}><Upload size={14} />上传贴图</Button>
              <Button variant="ghost" size="sm" disabled={disabled || layers.length >= MAX_STICKER_LAYERS} aria-expanded={assetOpen} onClick={() => setAssetOpen((value) => !value)}><Images size={14} />从资产选择</Button>
            </div>
            <input type="file" ref={fileRef} hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addImages(files); }} />
            {assetOpen && <PlacementAssetPicker enabled={libraryEnabled} disabled={disabled || layers.length >= MAX_STICKER_LAYERS} onAdd={(image) => void addImages([image])} />}
            <p className={styles.hint}>{adding ? "正在添加贴图…" : layers.length ? "拖动移动，四角缩放，上方圆点旋转。" : "上传或选择一张图片，放置到原图上层。"}</p>
            <div className={styles.layers} aria-label="贴图图层，上方为前层">
              {[...layers].reverse().map((layer) => <button type="button" key={layer.id} className={styles.layer} disabled={disabled} aria-pressed={selectedId === layer.id} onClick={() => setSelectedId(layer.id)}>
                <img src={layer.resource.objectUrl} alt="" /><span title={layer.name}>{layer.name}</span>
              </button>)}
            </div>
            {selected && <>
              <h3>位置与大小</h3>
              <div className={styles.fields}>
                {(["cx", "cy", "width", "rotation"] as const).map((key) => <label key={key}><span>{{ cx: "中心 X（px）", cy: "中心 Y（px）", width: "宽度（px）", rotation: "旋转（°）" }[key]}</span><Input type="number" step={key === "rotation" ? 1 : 0.1} disabled={disabled} value={Math.round(selected.placement[key] * 10) / 10} onChange={(event) => {
                  const value = Number(event.target.value); if (!Number.isFinite(value)) return;
                  const current = selected.placement;
                  if (key === "width") changeLayer(selected.id, scalePlacement(current, value / current.width));
                  else if (key === "rotation") changeLayer(selected.id, { ...current, rotation: normalizeRotation(value) });
                  else if (Math.abs(value) <= 65536) changeLayer(selected.id, { ...current, [key]: value });
                }} /></label>)}
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" size="sm" disabled={disabled} aria-label="缩小贴图" onClick={() => changeLayer(selected.id, scalePlacement(selected.placement, 0.9))}><Minus size={14} /></Button>
                <Button variant="ghost" size="sm" disabled={disabled} aria-label="放大贴图" onClick={() => changeLayer(selected.id, scalePlacement(selected.placement, 1.1))}><Plus size={14} /></Button>
                <Button variant="ghost" size="sm" disabled={disabled || layers.at(-1)?.id === selected.id} onClick={() => updateLayers((current) => reorderPlacementLayers(current, selected.id, 1))}><ArrowUp size={14} />前移</Button>
                <Button variant="ghost" size="sm" disabled={disabled || layers[0]?.id === selected.id} onClick={() => updateLayers((current) => reorderPlacementLayers(current, selected.id, -1))}><ArrowDown size={14} />后移</Button>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={removeSelected}><Trash2 size={14} />删除</Button>
              </div>
            </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </aside>
      </div>
      <footer className={styles.footer}>
        <Button size="sm" disabled={!layers.length || disabled} onClick={() => void save()}>{saving ? "正在保存…" : "确认贴图"}</Button>
      </footer>
    </DialogContent>
  </Dialog>;
}
