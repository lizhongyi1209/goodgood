"use client";

import { useEffect, useRef } from "react";
import { Group } from "lucide-react";
import { useReactFlow, useStoreApi } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { CanvasArrangementIcon } from "./canvas-arrangement-icon";
import { arrangeCanvasSelection, generatorStackInsets, unionCanvasBounds } from "./canvas-selection-layout.mjs";
import { canGroupCanvasSelection, createCanvasGroup } from "./canvas-groups.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

type Arrangement = Parameters<typeof arrangeCanvasSelection>[1];
type SelectionItem = Parameters<typeof arrangeCanvasSelection>[0][number];
type Insets = { left: number; top: number; right: number; bottom: number };
type CachedBounds = Insets & {
  width: number; height: number; data: CanvasNode["data"]; stack: string;
  previous: Insets | null; holdUntil: number;
};

const actions = [
  { action: "tidy", label: "自动整理" },
  { action: "left", label: "左对齐" },
  { action: "center-x", label: "水平居中" },
  { action: "right", label: "右对齐" },
  { action: "top", label: "顶部对齐" },
  { action: "center-y", label: "垂直居中" },
  { action: "bottom", label: "底部对齐" },
] as const;

export function CanvasSelectionControls({ onBeforeGraphEdit, onProjectGraphChange }: Readonly<{
  onBeforeGraphEdit: () => void;
  onProjectGraphChange: (settled?: boolean) => void;
}>) {
  const store = useStoreApi<CanvasNode>();
  const flow = useReactFlow<CanvasNode>();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<SelectionItem[]>([]);
  const refreshRef = useRef<() => void>(() => {});
  const disabledRef = useRef(true);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const surface = toolbarRef.current?.closest<HTMLElement>(".react-flow");
    if (!surface) return;
    const cache = new Map<string, CachedBounds>();
    const dirty = new Set<string>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let frame: number | null = null;
    let selectedKey = "";
    let elements = new Map<string, HTMLElement>();

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(refresh);
    };
    // Observe selected content only; neither the native rectangle nor our own
    // style writes are observed. Pan/drag frames reuse cached local footprints.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target instanceof Element ? record.target.closest<HTMLElement>(".react-flow__node") : null;
        if (node?.dataset.id) dirty.add(node.dataset.id);
      }
      schedule();
    });

    const refresh = () => {
      frame = null;
      const state = store.getState();
      const selectedIds = new Set(state.nodes.filter((node) => node.selected && !node.hidden).map((node) => node.id));
      const selected = state.nodes.filter((node) => selectedIds.has(node.id) && !selectedIds.has(node.parentId ?? ""));
      const key = JSON.stringify(selected.map((node) => node.id));
      if (key !== selectedKey) {
        selectedKey = key;
        observer.disconnect();
        const ids = new Set(selected.map((node) => node.id));
        elements = new Map(Array.from(surface.querySelectorAll<HTMLElement>(".react-flow__node"))
          .filter((element) => ids.has(element.dataset.id ?? ""))
          .map((element) => [element.dataset.id!, element]));
        for (const [id, element] of elements) {
          dirty.add(id);
          observer.observe(element, { subtree: true, childList: true, attributes: true,
            attributeFilter: ["class", "data-canvas-stack-count", "data-canvas-stack-expanded"] });
        }
        for (const id of cache.keys()) if (!ids.has(id)) cache.delete(id);
      }
      const [panX, panY, zoom] = state.transform;
      const bodies: SelectionItem["bounds"][] = [];
      const items: SelectionItem[] = [];
      for (const node of selected) {
        const internal = state.nodeLookup.get(node.id);
        const width = internal?.measured.width;
        const height = internal?.measured.height;
        const element = elements.get(node.id);
        if (!internal || !element || typeof width !== "number" || typeof height !== "number" ||
            !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 ||
            !Number.isFinite(internal.internals.positionAbsolute.x) || !Number.isFinite(internal.internals.positionAbsolute.y) ||
            !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) || !Number.isFinite(zoom) || zoom <= 0) continue;
        const body = { ...internal.internals.positionAbsolute, width, height };
        bodies.push(body);
        let bounds = cache.get(node.id);
        if (!bounds || dirty.has(node.id) || bounds.width !== width || bounds.height !== height || bounds.data !== node.data) {
          const metadata = element.querySelector<HTMLElement>(`.${styles.imageMetadata}`);
          const stack = element.querySelector<HTMLElement>("[data-canvas-stack-count]");
          const stackKey = `${stack?.dataset.canvasStackCount ?? 0}:${stack?.dataset.canvasStackExpanded ?? false}`;
          const insets: Insets = { left: 0, top: 0, right: 0, bottom: 0 };
          if (metadata) {
            const bodyRect = element.getBoundingClientRect();
            const metadataParts = [metadata, ...metadata.querySelectorAll<SVGElement>(`.${styles.generatorMetadataSparkle}`)];
            for (const part of metadataParts) {
              const rect = part.getBoundingClientRect();
              insets.left = Math.max(insets.left, (bodyRect.left - rect.left) / zoom);
              insets.top = Math.max(insets.top, (bodyRect.top - rect.top) / zoom);
              insets.right = Math.max(insets.right, (rect.right - bodyRect.right) / zoom);
            }
          }
          if (stack) {
            const offsets = generatorStackInsets(width, Number(stack.dataset.canvasStackCount ?? 0), stack.dataset.canvasStackExpanded === "true");
            insets.right = Math.max(insets.right, offsets.right);
            insets.bottom = offsets.bottom;
          }
          const priorBounds = bounds;
          const changedStack = priorBounds ? priorBounds.stack !== stackKey : false;
          const heldPrevious = priorBounds && priorBounds.holdUntil > Date.now() ? priorBounds.previous : null;
          const previous = changedStack && priorBounds ? {
            left: Math.max(priorBounds.left, heldPrevious?.left ?? 0), top: Math.max(priorBounds.top, heldPrevious?.top ?? 0),
            right: Math.max(priorBounds.right, heldPrevious?.right ?? 0), bottom: Math.max(priorBounds.bottom, heldPrevious?.bottom ?? 0),
          } : heldPrevious;
          bounds = { ...insets, width, height, data: node.data, stack: stackKey, previous,
            holdUntil: changedStack ? Date.now() + 240 : priorBounds?.holdUntil ?? 0 };
          cache.set(node.id, bounds);
          if (changedStack) {
            const timer = setTimeout(() => { timers.delete(timer); schedule(); }, 240);
            timers.add(timer);
          }
          dirty.delete(node.id);
        }
        const held = bounds.holdUntil > Date.now() ? bounds.previous : null;
        const left = Math.max(bounds.left, held?.left ?? 0);
        const top = Math.max(bounds.top, held?.top ?? 0);
        const right = Math.max(bounds.right, held?.right ?? 0);
        const bottom = Math.max(bounds.bottom, held?.bottom ?? 0);
        items.push({ id: node.id, position: node.position,
          bounds: { x: body.x - left, y: body.y - top, width: width + left + right, height: height + top + bottom } });
      }
      itemsRef.current = items;
      const visible = unionCanvasBounds(items.map((item) => item.bounds));
      const body = unionCanvasBounds(bodies);
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const show = selected.length > 1 && items.length === selected.length && visible && body && !state.userSelectionActive;
      toolbar.hidden = !show;
      if (show) surface.setAttribute("data-canvas-selection-visible", "true");
      else surface.removeAttribute("data-canvas-selection-visible");
      disabledRef.current = !show || selected.some((node) => node.dragging || node.resizing);
      for (const button of toolbar.querySelectorAll<HTMLButtonElement>("button")) button.disabled = disabledRef.current;
      if (groupButtonRef.current) groupButtonRef.current.disabled = disabledRef.current || !canGroupCanvasSelection(state.nodes);
      if (!show || !visible || !body) {
        surface.style.removeProperty("--canvas-selection-left");
        surface.style.removeProperty("--canvas-selection-top");
        surface.style.removeProperty("--canvas-selection-width");
        surface.style.removeProperty("--canvas-selection-height");
        return;
      }
      surface.style.setProperty("--canvas-selection-left", `${visible.x - body.x}px`);
      surface.style.setProperty("--canvas-selection-top", `${visible.y - body.y}px`);
      surface.style.setProperty("--canvas-selection-width", `${visible.width}px`);
      surface.style.setProperty("--canvas-selection-height", `${visible.height}px`);
      const halfToolbar = toolbar.offsetWidth / 2;
      const center = panX + (visible.x + visible.width / 2) * zoom;
      toolbar.style.left = `${Math.max(halfToolbar + 8, Math.min(surface.clientWidth - halfToolbar - 8, center))}px`;
      toolbar.style.top = `${Math.max(toolbar.offsetHeight + 8, Math.min(surface.clientHeight - 8, panY + visible.y * zoom - 8))}px`;
    };
    const invalidate = (event: Event) => {
      const node = event.target instanceof Element ? event.target.closest<HTMLElement>(".react-flow__node") : null;
      if (node?.dataset.id) dirty.add(node.dataset.id);
      schedule();
    };
    refreshRef.current = refresh;
    // Internal measurement updates can mutate nodeLookup in place, so schedule
    // from every store notification and let the selected cache avoid DOM reads.
    const unsubscribe = store.subscribe(schedule);
    surface.addEventListener("canvas-visible-bounds-change", invalidate);
    surface.addEventListener("load", invalidate, true);
    schedule();
    return () => {
      unsubscribe();
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
      surface.removeEventListener("canvas-visible-bounds-change", invalidate);
      surface.removeEventListener("load", invalidate, true);
      surface.removeAttribute("data-canvas-selection-visible");
      for (const property of ["left", "top", "width", "height"]) surface.style.removeProperty(`--canvas-selection-${property}`);
      refreshRef.current = () => {};
    };
  }, [store]);

  const arrange = (action: Arrangement) => {
    refreshRef.current();
    if (disabledRef.current) return;
    const positions = arrangeCanvasSelection(itemsRef.current, action);
    if (!positions.size) return;
    onBeforeGraphEdit();
    flow.setNodes((nodes) => nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, position } : node;
    }));
    onProjectGraphChange(true);
  };

  return (
    <div ref={toolbarRef} hidden className={`${styles.selectionToolbar} nodrag nopan nowheel nokey`}
      role="toolbar" aria-label="选中节点操作"
      onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
      <Button ref={groupButtonRef} type="button" variant="ghost" size="sm" data-canvas-group-action="true" aria-label="将选中节点建组" title="建组（Ctrl / ⌘ G）"
        onClick={(event) => {
          event.stopPropagation(); refreshRef.current();
          if (disabledRef.current || !canGroupCanvasSelection(flow.getNodes())) return;
          onBeforeGraphEdit();
          flow.setNodes((nodes) => createCanvasGroup(nodes, `group-${crypto.randomUUID()}`, itemsRef.current));
          onProjectGraphChange(true);
        }}><Group size={15} aria-hidden="true" />建组</Button>
      {actions.map(({ action, label }) => <Button key={action} type="button" variant="ghost" size="icon-sm"
        data-group-start={action === "top" || action === "tidy" || undefined}
        aria-label={label} title={label} onClick={(event) => { event.stopPropagation(); arrange(action); }}>
        <CanvasArrangementIcon action={action} />
      </Button>)}
    </div>
  );
}
