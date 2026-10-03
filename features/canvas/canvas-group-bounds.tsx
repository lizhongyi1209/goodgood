"use client";

import { useEffect } from "react";
import { useReactFlow, useStoreApi } from "@xyflow/react";
import { canvasNodeAbsolutePosition, fitCanvasGroups } from "./canvas-groups.mjs";
import { generatorStackInsets } from "./canvas-selection-layout.mjs";
import type { CanvasNode } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export function CanvasGroupBounds() {
  const flow = useReactFlow<CanvasNode>();
  const store = useStoreApi<CanvasNode>();
  useEffect(() => {
    let frame: number | null = null;
    let commitFrame: number | null = null;
    let lastNodes: CanvasNode[] | null = null;
    let dirty = true;
    let memberKey = "";
    const observer = new MutationObserver(() => { dirty = true; schedule(); });
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(refresh); };
    const refresh = () => {
      frame = null;
      const state = store.getState();
      if (state.nodes.some((node) => node.dragging || node.resizing)) return;
      if (!dirty && lastNodes === state.nodes) return;
      dirty = false; lastNodes = state.nodes;
      const members = state.nodes.filter((node) => node.parentId);
      const key = members.map((node) => `${node.id}:${node.parentId}`).join("|");
      if (key !== memberKey) {
        memberKey = key; observer.disconnect();
        for (const member of members) {
          const element = state.domNode?.querySelector<HTMLElement>(`[data-id="${CSS.escape(member.id)}"]`);
          if (element) observer.observe(element, { childList: true, subtree: true, attributes: true,
            attributeFilter: ["class", "data-canvas-stack-count", "data-canvas-stack-expanded"] });
        }
      }
      if (!members.length) return;
      // Reparenting initially leaves native measurements in flight. Never fit
      // from guessed dimensions while ResizeObserver initializes the group.
      const measuredIds = new Set([...members.map((node) => node.id), ...members.map((node) => node.parentId!)]);
      if ([...measuredIds].some((id) => {
        const node = state.nodeLookup.get(id);
        return !node?.measured.width || !node.measured.height || !node.internals.handleBounds;
      })) { dirty = true; return; }
      const zoom = state.transform[2];
      const footprints = members.flatMap((node) => {
        const internal = state.nodeLookup.get(node.id);
        if (!internal?.measured.width || !internal.measured.height) return [];
        const position = canvasNodeAbsolutePosition(node, state.nodes);
        const width = internal.measured.width; const height = internal.measured.height;
        const element = state.domNode?.querySelector<HTMLElement>(`[data-id="${CSS.escape(node.id)}"]`);
        const metadata = element?.querySelector<HTMLElement>(`.${styles.imageMetadata}`);
        const top = metadata ? metadata.offsetHeight + 6 : 0;
        let left = 0; let right = 0;
        if (metadata && element && zoom > 0) {
          const body = element.getBoundingClientRect();
          for (const part of [metadata, ...metadata.querySelectorAll<SVGElement>(`.${styles.generatorMetadataSparkle}`)]) {
            const rect = part.getBoundingClientRect();
            left = Math.max(left, (body.left - rect.left) / zoom);
            right = Math.max(right, (rect.right - body.right) / zoom);
          }
        }
        const stack = element?.querySelector<HTMLElement>("[data-canvas-stack-count]");
        const insets = generatorStackInsets(width, Number(stack?.dataset.canvasStackCount ?? 0), stack?.dataset.canvasStackExpanded === "true");
        return [{ id: node.id, bounds: { x: position.x - left, y: position.y - top,
          width: width + left + Math.max(right, insets.right), height: height + top + insets.bottom } }];
      });
      const next = fitCanvasGroups(state.nodes, footprints);
      if (commitFrame !== null) cancelAnimationFrame(commitFrame);
      commitFrame = null;
      if (next !== state.nodes) {
        // Read layout in this frame; commit in the following frame. A native
        // measurement/drag/undo arriving between them invalidates this plan.
        const plannedNodes = state.nodes;
        commitFrame = requestAnimationFrame(() => {
          commitFrame = null;
          if (store.getState().nodes !== plannedNodes) { dirty = true; schedule(); return; }
          flow.setNodes(next);
        });
      }
    };
    const unsubscribe = store.subscribe(schedule);
    const surface = store.getState().domNode;
    const invalidate = () => { dirty = true; schedule(); };
    surface?.addEventListener("canvas-visible-bounds-change", invalidate);
    surface?.addEventListener("load", invalidate, true);
    schedule();
    return () => { unsubscribe(); observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame);
      if (commitFrame !== null) cancelAnimationFrame(commitFrame);
      surface?.removeEventListener("canvas-visible-bounds-change", invalidate); surface?.removeEventListener("load", invalidate, true); };
  }, [flow, store]);
  return null;
}
