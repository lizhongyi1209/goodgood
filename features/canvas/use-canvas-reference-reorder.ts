"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";

type Gesture = {
  key: string; scope: string; pointerId: number; startX: number; startY: number;
  x: number; y: number; active: boolean; target: string | null;
  element: HTMLElement; tray: HTMLElement; snap: string; frame: number | null;
};

export function useCanvasReferenceReorder(options: {
  scope: string; keys: readonly string[]; disabled: boolean;
  onMove: (source: string, target: string) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<{ key: string; target: string | null } | null>(null);

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

  const valid = (current: Gesture) => !latest.current.disabled && current.scope === latest.current.scope &&
    latest.current.keys.includes(current.key) && latest.current.keys.length > 1;

  const findTarget = (current: Gesture) => {
    const hit = current.element.ownerDocument.elementFromPoint(current.x, current.y)
      ?.closest<HTMLElement>("[data-reference-order-key]");
    const key = hit && current.tray.contains(hit) ? hit.dataset.referenceOrderKey : undefined;
    return key && latest.current.keys.includes(key) ? key : null;
  };

  const showTarget = (current: Gesture) => {
    current.target = findTarget(current);
    setPreview((previous) => previous?.key === current.key && previous.target === current.target
      ? previous : { key: current.key, target: current.target });
  };

  const scroll = (current: Gesture): void => {
    if (gesture.current !== current || !valid(current)) { stop(); return; }
    const bounds = current.tray.getBoundingClientRect();
    if (current.y >= bounds.top && current.y <= bounds.bottom) {
      const delta = current.x < bounds.left + 22 && current.x >= bounds.left ? -5
        : current.x > bounds.right - 22 && current.x <= bounds.right ? 5 : 0;
      if (delta) { current.tray.scrollLeft += delta; showTarget(current); }
    }
    current.frame = requestAnimationFrame(() => scroll(current));
  };

  useEffect(() => {
    const current = gesture.current;
    if (current && (options.disabled || current.scope !== options.scope || !options.keys.includes(current.key))) stop();
  }, [options.scope, options.disabled, options.keys, stop]);

  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !gesture.current) return;
      event.preventDefault(); event.stopPropagation(); stop();
    };
    const blur = () => stop();
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", escape, true); window.removeEventListener("blur", blur); stop(false); };
  }, [stop]);

  return {
    draggingKey: preview?.key ?? null,
    targetKey: preview?.target ?? null,
    bind: (key: string) => ({
      onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!event.isPrimary || event.button !== 0 || latest.current.disabled || latest.current.keys.length < 2) return;
        const tray = event.currentTarget.closest<HTMLElement>('[data-slot="attachment-group"]');
        if (!tray) return;
        event.preventDefault(); event.stopPropagation(); stop();
        event.currentTarget.focus({ preventScroll: true });
        gesture.current = { key, scope: latest.current.scope, pointerId: event.pointerId,
          startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
          active: false, target: null, element: event.currentTarget, tray, snap: tray.style.scrollSnapType, frame: null };
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
        showTarget(current);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.stopPropagation(); current.x = event.clientX; current.y = event.clientY;
        const target = current.active && valid(current) ? findTarget(current) : null;
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
