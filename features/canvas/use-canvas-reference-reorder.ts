"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { canvasReferenceDragLayout, type ReferenceDragLayout, type ReferenceDragSlot } from "./canvas-reference-drag-layout.mjs";

type Gesture = {
  key: string; scope: string; pointerId: number; startX: number; startY: number;
  x: number; y: number; active: boolean; slots: ReferenceDragSlot[];
  scale: number; startScroll: number; lastScroll: number; trayWidth: number;
  rowTop: number; rowHeight: number;
  element: HTMLElement; tray: HTMLElement; snap: string; frame: number | null;
};
type Preview = ReferenceDragLayout & { key: string; keys: string[] };

export function useCanvasReferenceReorder(options: {
  scope: string; keys: readonly string[]; disabled: boolean;
  onMove: (source: string, target: string) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const stop = useCallback((update = true) => {
    const current = gesture.current;
    gesture.current = null;
    if (current) {
      if (current.frame !== null) cancelAnimationFrame(current.frame);
      current.tray.style.scrollSnapType = current.snap;
      if (current.element.hasPointerCapture(current.pointerId)) current.element.releasePointerCapture(current.pointerId);
    }
    if (update) setPreview(null);
  }, []);

  const valid = useCallback((current: Gesture) => !latest.current.disabled && current.scope === latest.current.scope &&
    current.element.isConnected && current.slots.length === latest.current.keys.length &&
    current.slots.every((slot, index) => slot.key === latest.current.keys[index]) &&
    current.tray.offsetWidth === current.trayWidth &&
    Math.abs(current.tray.getBoundingClientRect().width / current.trayWidth - current.scale) < 0.001, []);

  const layout = (current: Gesture) => canvasReferenceDragLayout(current.slots, current.key,
    (current.x - current.startX) / current.scale + current.tray.scrollLeft - current.startScroll);

  const insideRow = (current: Gesture) => {
    const bounds = current.tray.getBoundingClientRect();
    const contentX = (current.x - bounds.left) / current.scale + current.tray.scrollLeft;
    const first = current.slots[0];
    const last = current.slots[current.slots.length - 1];
    return current.x >= bounds.left && current.x <= bounds.right &&
      current.y >= bounds.top + current.rowTop * current.scale &&
      current.y <= bounds.top + (current.rowTop + current.rowHeight) * current.scale &&
      contentX >= first.left && contentX <= last.left + last.width;
  };

  const showLayout = (current: Gesture) => {
    const next = layout(current);
    current.lastScroll = current.tray.scrollLeft;
    if (!next) { stop(); return; }
    setPreview((previous) => previous?.key === current.key && previous.target === next.target &&
      previous.offsets.every((offset, index) => offset === next.offsets[index])
      ? previous : { key: current.key, keys: current.slots.map((slot) => slot.key), ...next });
  };

  const scroll = (current: Gesture): void => {
    if (gesture.current !== current || !valid(current)) { stop(); return; }
    const bounds = current.tray.getBoundingClientRect();
    if (current.y >= bounds.top && current.y <= bounds.bottom) {
      const delta = current.x < bounds.left + 22 && current.x >= bounds.left ? -5
        : current.x > bounds.right - 22 && current.x <= bounds.right ? 5 : 0;
      if (delta) current.tray.scrollLeft += delta;
    }
    if (current.lastScroll !== current.tray.scrollLeft) showLayout(current);
    current.frame = requestAnimationFrame(() => scroll(current));
  };

  useEffect(() => {
    const current = gesture.current;
    if (current && !valid(current)) stop();
  }, [options.scope, options.disabled, options.keys, stop, valid]);

  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !gesture.current) return;
      event.preventDefault(); event.stopPropagation(); stop();
    };
    const cancel = () => stop();
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    return () => {
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      stop(false);
    };
  }, [stop]);

  return {
    draggingKey: preview?.key ?? null,
    style: (key: string): CSSProperties | undefined => {
      const index = preview?.keys.indexOf(key) ?? -1;
      return preview && index >= 0 ? { transform: `translateX(${preview.offsets[index]}px)` } : undefined;
    },
    bind: (key: string) => ({
      onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!event.isPrimary || event.button !== 0 || latest.current.disabled || latest.current.keys.length < 2) return;
        const tray = event.currentTarget.closest<HTMLElement>('[data-slot="attachment-group"]');
        if (!tray || !tray.offsetWidth) return;
        event.preventDefault(); event.stopPropagation(); stop();
        event.currentTarget.focus({ preventScroll: true });
        const elements = Array.from(tray.querySelectorAll<HTMLElement>("[data-reference-order-key]"));
        const slots = elements.map((element) => ({ key: element.dataset.referenceOrderKey!, left: element.offsetLeft, width: element.offsetWidth }));
        if (slots.length !== latest.current.keys.length || slots.some((slot, index) => slot.key !== latest.current.keys[index])) return;
        const scale = tray.getBoundingClientRect().width / tray.offsetWidth;
        if (!Number.isFinite(scale) || scale <= 0) return;
        gesture.current = { key, scope: latest.current.scope, pointerId: event.pointerId,
          startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
          active: false, slots, scale, startScroll: tray.scrollLeft, lastScroll: tray.scrollLeft, trayWidth: tray.offsetWidth,
          rowTop: elements[0].offsetTop, rowHeight: elements[0].offsetHeight,
          element: event.currentTarget, tray, snap: tray.style.scrollSnapType, frame: null };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (!valid(current)) { stop(); return; }
        event.stopPropagation(); current.x = event.clientX; current.y = event.clientY;
        if (!current.active && Math.hypot(current.x - current.startX, current.y - current.startY) < 4) return;
        if (!current.active) {
          current.active = true; current.tray.style.scrollSnapType = "none";
          current.frame = requestAnimationFrame(() => scroll(current));
        }
        showLayout(current);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.stopPropagation(); current.x = event.clientX; current.y = event.clientY;
        const target = current.active && valid(current) && insideRow(current) ? layout(current)?.target : null;
        stop();
        if (target && target !== current.key) latest.current.onMove(current.key, target);
      },
      onPointerCancel: () => stop(),
      onLostPointerCapture: () => { if (gesture.current) stop(); },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key) || latest.current.disabled) return;
        const index = latest.current.keys.indexOf(key);
        const target = latest.current.keys[index + (event.key === "ArrowLeft" ? -1 : 1)];
        if (index < 0 || !target) return;
        event.preventDefault(); event.stopPropagation(); stop(); latest.current.onMove(key, target);
      },
    }),
  };
}
