"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useReactFlow, useStore } from "@xyflow/react";
import { LoaderCircle, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canvasCropImageForNode, type CanvasCropCommit, type CanvasCropRequest } from "./canvas-image-crop-image";
import { exportRegionAnnotation, loadPlacementImage, type PlacementImage } from "./canvas-image-placement-image";
import { PLACEMENT_CORNERS, moveRegion, regionFromPoints, resizeRegion, type PlacementCorner, type PlacementPoint, type PlacementRegion, type PlacementSize } from "./canvas-image-placement-model.mjs";
import { defaultRegion, REGION_MARK_COLOR, regionMarkRects, regionImageFrame, regionPanelPosition, regionPointFromClient, type RegionScreenRect } from "./canvas-image-region-model.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-image-region.module.css";

type RegionRequest = CanvasCropRequest & Readonly<{ trigger: HTMLButtonElement }>;
type RegionDrag = Readonly<{ pointerId: number; start: PlacementPoint; region: PlacementRegion | null; kind: "draw" | "move" | PlacementCorner }>;
type RegionLayout = Readonly<{ image: RegionScreenRect | null; layer: RegionScreenRect; panel: ReturnType<typeof regionPanelPosition> }>;
const CORNER_NAMES = { nw: "左上", ne: "右上", se: "右下", sw: "左下" };

export function CanvasImageRegionEditor({ request, onCommit, onClose }: Readonly<{ request: RegionRequest; onCommit: (commit: CanvasCropCommit) => boolean; onClose: () => void }>) {
  const flow = useReactFlow<CanvasNode>();
  const liveNode = useStore((state) => state.nodeLookup.get(request.nodeId));
  const transform = useStore((state) => state.transform);
  const [natural, setNatural] = useState<PlacementSize | null>(null);
  const [region, setRegion] = useState<PlacementRegion | null>(null);
  const [layout, setLayout] = useState<RegionLayout | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<RegionDrag | null>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const baseRef = useRef<PlacementImage | null>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const surfaceReady = Boolean(natural && layout?.image);
  const marks = natural ? regionMarkRects(region, natural) : [];

  const cancel = () => {
    lifecycle.current?.abort();
    closeRef.current();
    const node = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node")).find((element) => element.dataset.id === request.nodeId);
    (request.trigger.isConnected ? request.trigger : node)?.focus({ preventScroll: true });
  };
  const cancelRef = useRef(cancel); cancelRef.current = cancel;

  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    panelRef.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); event.stopPropagation(); cancelRef.current();
    };
    document.addEventListener("keydown", escape, true);
    return () => { controller.abort(); dragRef.current = null; document.removeEventListener("keydown", escape, true); };
  }, []);
  useEffect(() => {
    const current = canvasCropImageForNode(flow.getNode(request.nodeId), request.imageId);
    if (!liveNode?.selected || !current || current.key !== request.key || current.imageId !== request.imageId) closeRef.current();
  }, [flow, liveNode, request]);
  useEffect(() => {
    const controller = new AbortController(); let resource: PlacementImage | null = null;
    setNatural(null); setRegion(null); setSourceError(null); setSaveError(null);
    void loadPlacementImage(request, controller.signal).then((loaded) => {
      resource = loaded;
      if (controller.signal.aborted) { loaded.dispose(); return; }
      baseRef.current = loaded;
      const size = { width: loaded.image.naturalWidth, height: loaded.image.naturalHeight };
      setNatural(size); setRegion(defaultRegion(size));
    }).catch((cause) => { if (!controller.signal.aborted) setSourceError(cause instanceof Error ? cause.message : "原图读取失败，请重试。"); });
    return () => { controller.abort(); if (baseRef.current === resource) baseRef.current = null; resource?.dispose(); };
  }, [request, attempt]);
  useLayoutEffect(() => {
    const node = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node")).find((element) => element.dataset.id === request.nodeId);
    const image = Array.from(node?.querySelectorAll<HTMLElement>("[data-canvas-crop-image]") ?? []).find((element) => element.dataset.canvasCropImage === request.imageId)?.querySelector<HTMLImageElement>("img");
    const workspace = document.getElementById("canvas-workspace-surface");
    if (!image || !workspace) { closeRef.current(); return; }
    const sidebar = document.getElementById("canvas-asset-sidebar");
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      const left = Math.max(bounds.left, sidebar?.getBoundingClientRect().right ?? bounds.left, 0);
      const top = Math.max(bounds.top + 60, 0);
      const layer = { left, top, width: Math.max(0, Math.min(bounds.right, window.innerWidth) - left), height: Math.max(0, Math.min(bounds.bottom - 48, window.innerHeight) - top) };
      const frame = regionImageFrame(image.getBoundingClientRect(), natural ?? { width: image.naturalWidth, height: image.naturalHeight });
      setLayout({ image: frame, layer, panel: regionPanelPosition(frame ?? layer, layer, panelRef.current?.offsetHeight) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(image); observer.observe(workspace);
    if (sidebar) observer.observe(sidebar);
    if (panelRef.current) observer.observe(panelRef.current);
    image.addEventListener("load", measure);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); image.removeEventListener("load", measure); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [request.nodeId, request.imageId, natural, transform, liveNode]);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    // Preserve the canvas's normal wheel/pinch behavior beneath the selection overlay.
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); event.stopPropagation();
      if (dragRef.current) return;
      document.querySelector("#canvas-workspace-surface .react-flow__pane")?.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true, cancelable: true, clientX: event.clientX, clientY: event.clientY,
        deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ, deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey,
      }));
    };
    surface.addEventListener("wheel", wheel, { passive: false });
    return () => surface.removeEventListener("wheel", wheel);
  }, [surfaceReady]);

  const pointForEvent = (event: PointerEvent<HTMLDivElement>) => regionPointFromClient({ x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect(), natural!);
  const changed = () => setSaveError(null);
  const keyDelta = (event: ReactKeyboardEvent): PlacementPoint | null => {
    const step = event.shiftKey ? 10 : 1;
    const directions: Partial<Record<string, PlacementPoint>> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const delta = directions[event.key];
    if (delta) { event.preventDefault(); event.stopPropagation(); changed(); }
    return delta ?? null;
  };
  const finishDrag = (event: PointerEvent<HTMLDivElement>, revert = false) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (revert) setRegion(drag.region);
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const confirm = async () => {
    const signal = lifecycle.current?.signal;
    const base = baseRef.current;
    if (!region || !natural || !base || busyRef.current || dragRef.current || !signal || signal.aborted) return;
    busyRef.current = true; setSaving(true); setSaveError(null);
    try {
      const file = await exportRegionAnnotation(base.image, region, request.name, signal);
      signal.throwIfAborted();
      const node = flow.getNode(request.nodeId);
      const current = canvasCropImageForNode(node, request.imageId);
      if (!node?.selected || !current || current.key !== request.key || current.imageId !== request.imageId ||
        !onCommit({ request, file, ...natural, createCopy: true })) throw new Error("当前图片或页面已变化，请关闭后重新打开框选。");
      cancelRef.current();
    } catch (cause) { if (!signal.aborted) setSaveError(cause instanceof Error ? cause.message : "框选图片保存失败，请重试。"); }
    finally { busyRef.current = false; if (!signal.aborted) setSaving(false); }
  };
  const percent = (value: number, dimension: "width" | "height") => `${value / natural![dimension] * 100}%`;

  return createPortal(<>
    {layout?.image && natural && <div className={styles.imageLayer} style={layout.layer}>
      <div ref={surfaceRef} className={`${styles.surface} nodrag nopan nowheel nokey`} tabIndex={0} aria-label={`正在框选 ${request.name}，拖动绘制红框，方向键移动，Shift加速`} aria-busy={saving}
        style={{ ...layout.image, left: layout.image.left - layout.layer.left, top: layout.image.top - layout.layer.top }}
        onPointerDown={(event) => {
          if (event.button !== 0 || dragRef.current || busyRef.current) return;
          event.preventDefault(); event.stopPropagation(); changed();
          const target = event.target instanceof Element ? event.target : null;
          const corner = target?.closest<HTMLElement>("[data-region-corner]")?.dataset.regionCorner as PlacementCorner | undefined;
          const kind = corner ?? (target?.closest("[data-region-selection]") ? "move" : "draw");
          dragRef.current = { pointerId: event.pointerId, start: pointForEvent(event), region, kind };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus({ preventScroll: true });
          if (kind === "draw") setRegion(null);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag?.pointerId !== event.pointerId || busyRef.current) return;
          event.preventDefault(); event.stopPropagation();
          const point = pointForEvent(event);
          if (drag.kind === "draw") setRegion(regionFromPoints(drag.start, point, natural));
          else if (drag.region) setRegion(drag.kind === "move" ? moveRegion(drag.region, { x: point.x - drag.start.x, y: point.y - drag.start.y }, natural) : resizeRegion(drag.region, drag.kind, point, natural));
        }}
        onPointerUp={(event) => finishDrag(event)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
        onKeyDown={(event) => {
          if (busyRef.current) return;
          if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); event.stopPropagation(); setRegion(null); changed(); return; }
          const delta = keyDelta(event); if (delta && region) setRegion(moveRegion(region, delta, natural));
        }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
        <svg className={styles.annotation} viewBox={`0 0 ${natural.width} ${natural.height}`} preserveAspectRatio="none" aria-hidden="true">
          {region && <path className={styles.shade} fillRule="evenodd" d={`M0 0H${natural.width}V${natural.height}H0Z M${region.x} ${region.y}H${region.x + region.width}V${region.y + region.height}H${region.x}Z`} />}
          {marks.map((mark, index) => <rect key={index} {...mark} fill={REGION_MARK_COLOR} />)}
        </svg>
        <div className={styles.editHint} aria-hidden="true"><Scan size={13} />框选中 · 拖动画框</div>
        {region && <div className={styles.selection} data-region-selection role="group" tabIndex={0} aria-label="红色选框，拖动或方向键移动"
          style={{ left: percent(region.x, "width"), top: percent(region.y, "height"), width: percent(region.width, "width"), height: percent(region.height, "height") }}>
          {PLACEMENT_CORNERS.map((corner) => <button key={corner} type="button" className={styles.corner} data-region-corner={corner}
            style={{ left: corner.includes("w") ? 0 : "100%", top: corner.includes("n") ? 0 : "100%" }}
            aria-label={`调整选框${CORNER_NAMES[corner]}角，方向键调整`} onKeyDown={(event) => {
              if (busyRef.current) return;
              const delta = keyDelta(event); if (!delta) return;
              setRegion(resizeRegion(region, corner, { x: region.x + (corner.includes("w") ? 0 : region.width) + delta.x, y: region.y + (corner.includes("n") ? 0 : region.height) + delta.y }, natural));
            }} />)}
        </div>}
      </div>
    </div>}
    <section ref={panelRef} className={`${styles.panel} nodrag nopan nowheel nokey`} style={layout?.panel ?? { left: 12, top: 76, width: 156 }} tabIndex={-1} aria-label="框选操作" aria-busy={saving}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} onContextMenu={(event) => event.stopPropagation()}>
      {!natural && !sourceError && <p className={styles.status} role="status"><LoaderCircle size={13} className={styles.spinner} aria-hidden="true" />正在读取原图…</p>}
      {sourceError && <div role="alert"><p className={styles.error}>{sourceError}</p><Button variant="ghost" size="sm" className={styles.retry} onClick={() => setAttempt((value) => value + 1)}>重试读取</Button></div>}
      {saveError && <p className={styles.error} role="alert">{saveError}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>取消</Button>
        <Button type="button" size="sm" disabled={!marks.length || !surfaceReady || saving} onClick={() => void confirm()}>
          {saving && <LoaderCircle size={13} className={styles.spinner} aria-hidden="true" />}{saving ? "处理中" : "确认"}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{saving ? "正在创建框选副本" : natural ? "红框已显示，可拖动移动，四角调整，或在框外拖动重新画框" : ""}</span>
    </section>
  </>, document.body);
}
