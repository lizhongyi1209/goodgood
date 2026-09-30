"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type RefObject } from "react";

import { PopoverContent } from "@/components/ui/popover";

type SettingsLayout = { width: number; columns: number; compact: boolean; cardHeight: number; narrow: boolean };
type SettingsContentProps = Omit<ComponentProps<typeof PopoverContent>, "ref"> & {
  open: boolean;
  ratioCount: number;
  qualityCount?: number;
  resolutionCount?: number;
  showCount?: boolean;
  assetsOpen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onFitViewport: (offset: { x: number; y: number }) => Promise<unknown>;
};

/** Keep settings below the composer; make room without clipping or scrolling the options. */
export function CanvasGeneratorSettingsContent({ open, ratioCount, qualityCount = 0, resolutionCount = 3, showCount = true, assetsOpen, triggerRef, onFitViewport, style, ...props }: SettingsContentProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<SettingsLayout>({ width: 324, columns: 4, compact: false, cardHeight: 76, narrow: false });

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    let fitFrame = 0;
    let fitting = false;
    let fitAttempts = 0;
    let disposed = false;
    const surface = document.getElementById("canvas-workspace-surface");
    const sidebar = document.getElementById("canvas-asset-sidebar");
    const toolbar = triggerRef.current?.closest<HTMLElement>(".react-flow__node-toolbar");
    const bounds = () => {
      const viewport = window.visualViewport;
      const surfaceRect = surface?.getBoundingClientRect();
      const sidebarRight = document.getElementById("canvas-asset-sidebar")?.getBoundingClientRect().right ?? 0;
      const left = Math.max(surfaceRect?.left ?? 0, viewport?.offsetLeft ?? 0, sidebarRight) + 12;
      const top = Math.max(surfaceRect?.top ?? 0, viewport?.offsetTop ?? 0) + 12;
      const right = Math.min(surfaceRect?.right ?? window.innerWidth, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth)) - 12;
      const bottom = Math.min(surfaceRect?.bottom ?? window.innerHeight, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)) - 12;
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const fit = () => {
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      if (disposed || fitting || fitAttempts >= 4 || !panel || !trigger) return;
      const view = bounds();
      const anchor = trigger.getBoundingClientRect();
      // offset sizes ignore Radix's opening scale animation.
      const targetLeft = Math.max(view.left, Math.min(anchor.left, view.right - panel.offsetWidth));
      const targetTop = Math.max(view.top, Math.min(anchor.bottom + 12, view.bottom - panel.offsetHeight));
      const x = targetLeft - anchor.left;
      const y = targetTop - (anchor.bottom + 12);
      if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
      fitting = true;
      fitAttempts++;
      void onFitViewport({ x, y }).finally(() => {
        fitting = false;
        // NodeToolbar may switch its alignment while panning, so settle the new anchor too.
        if (!disposed) schedule();
      });
    };
    const measure = () => {
      const panel = panelRef.current;
      if (disposed || !panel) return;
      const view = bounds();
      const preferredHeight = view.height - (toolbar?.offsetHeight ?? 0) - 24;
      const candidates: (SettingsLayout & { height: number })[] = [];
      for (const compact of [false, true]) {
        const padding = compact ? 26 : 36;
        const gap = compact ? 6 : 7;
        const cellWidth = compact ? 52 : 66.75;
        const narrow = compact && view.width < 274;
        const minWidth = compact ? narrow ? 0 : 288 : 324;
        const maxColumns = Math.max(1, Math.min(ratioCount, Math.floor((view.width - padding + gap) / ((compact ? 44 : cellWidth) + gap))));
        const minColumns = compact ? Math.min(4, maxColumns) : 4;
        for (const cardHeight of compact ? [64, 58] : [76]) {
          for (let columns = minColumns; columns <= Math.max(minColumns, maxColumns); columns++) {
            const width = Math.min(view.width, Math.max(minWidth, columns * cellWidth + (columns - 1) * gap + padding));
            const actualCellWidth = (width - padding - (columns - 1) * gap) / columns;
            if (actualCellWidth < 44 || actualCellWidth >= cardHeight || (!compact && width < minWidth)) continue;
            const rows = Math.ceil(ratioCount / columns);
            const controlsPerRow = Math.max(1, Math.floor((width - padding + 6) / 50));
            const resolutionRows = Math.max(1, Math.ceil(resolutionCount / controlsPerRow));
            const countRows = showCount ? 1 : 0;
            const countSectionHeight = narrow ? 60 : compact ? 42 : 76;
            const baseHeight = (narrow ? 148 + (resolutionRows + 1) * 32 + (resolutionRows - 1) * 6 : compact ? 164 : 252)
              - (countRows ? 0 : countSectionHeight);
            const optionWidth = compact && !narrow ? width - padding - 54 : width - padding;
            const qualityColumns = narrow ? Math.min(3, Math.max(1, Math.floor((optionWidth + 7) / 83))) : 3;
            const qualityRows = qualityCount ? Math.ceil(qualityCount / qualityColumns) : 0;
            // Quality includes auto; transparency is one 32px label/switch row.
            const extraHeight = qualityRows ? qualityRows * 32 + (qualityRows - 1) * 7 + (compact && !narrow ? 52 : compact ? 76 : 93) : 0;
            const height = baseHeight + rows * cardHeight + (rows - 1) * gap + extraHeight;
            candidates.push({ width, columns, compact, cardHeight, narrow, height });
          }
        }
      }
      const next = candidates.find((item) => item.height <= preferredHeight)
        ?? candidates.find((item) => item.height <= view.height)
        ?? candidates.reduce((smallest, item) => item.height < smallest.height ? item : smallest, candidates[0])
        ?? { width: Math.max(0, view.width), columns: 1, compact: true, cardHeight: 58, narrow: true };
      setLayout((current) => current.width === next.width && current.columns === next.columns &&
        current.compact === next.compact && current.cardHeight === next.cardHeight && current.narrow === next.narrow ? current : next);
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fit);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const reschedule = () => { fitAttempts = 0; schedule(); };
    const observer = new ResizeObserver(() => { if (!fitting) fitAttempts = 0; schedule(); });
    for (const element of [surface, sidebar, toolbar]) if (element) observer.observe(element);
    // The portal mounts after the initial layout pass.
    frame = requestAnimationFrame(() => {
      if (panelRef.current) observer.observe(panelRef.current);
      schedule();
    });
    window.addEventListener("resize", reschedule);
    window.visualViewport?.addEventListener("resize", reschedule);
    window.visualViewport?.addEventListener("scroll", reschedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(fitFrame);
      observer.disconnect();
      window.removeEventListener("resize", reschedule);
      window.visualViewport?.removeEventListener("resize", reschedule);
      window.visualViewport?.removeEventListener("scroll", reschedule);
    };
  }, [open, ratioCount, qualityCount, resolutionCount, showCount, assetsOpen, triggerRef, onFitViewport]);

  return <PopoverContent {...props} ref={panelRef} side="bottom" align="start" sideOffset={12} avoidCollisions={false}
    data-compact={layout.compact || undefined}
    data-narrow={layout.narrow || undefined}
    style={{ ...style, "--canvas-settings-width": `${layout.width}px`, "--canvas-settings-columns": layout.columns,
      "--canvas-settings-card-height": `${layout.cardHeight}px` } as CSSProperties} />;
}
