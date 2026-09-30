"use client";

// Adapted from React Flow UI's Zoom Select for GoodGood's canvas.
// https://reactflow.dev/ui/components/zoom-select
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Panel, useReactFlow, useStore, type PanelProps } from "@xyflow/react";
import { Map, Maximize2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const rowClassName = "h-9 w-full justify-between rounded-md px-2.5 text-[13px] font-medium text-[#18181b] hover:bg-[#f4f4f5] hover:text-[#18181b] focus-visible:ring-[#a1a1aa]";

export function ZoomSelect({
  className,
  leadingControl,
  mapTrailingControl,
  miniMapOpen,
  onMiniMapToggle,
  ...props
}: Omit<PanelProps, "children"> & { leadingControl?: ReactNode; mapTrailingControl?: ReactNode; miniMapOpen?: boolean; onMiniMapToggle?: () => void }) {
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);
  const percent = Math.round(zoom * 100);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cancelInputRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(percent));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(percent));
  }, [percent]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const path = event.composedPath();
      if (triggerRef.current && path.includes(triggerRef.current)) return;
      if (contentRef.current && path.includes(contentRef.current)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () => document.removeEventListener("pointerdown", closeOutside, true);
  }, [open]);

  const applyPercent = (value: string) => {
    const parsed = Number(value.replaceAll("%", "").trim());
    const next = value.trim() && Number.isFinite(parsed)
      ? Math.min(Math.max(Math.round(parsed), Math.round(minZoom * 100)), Math.round(maxZoom * 100))
      : percent;
    setDraft(String(next));
    if (next !== percent) void zoomTo(next / 100, { duration: 180 });
  };

  const choosePercent = (value: number) => {
    setDraft(String(value));
    setOpen(false);
    void zoomTo(value / 100, { duration: 180 });
  };

  return (
    <Panel className={cn("flex items-center gap-1 rounded-md", className)} {...props}>
      {leadingControl}
      {onMiniMapToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onMiniMapToggle}
          aria-label={miniMapOpen ? "隐藏画布地图" : "显示画布地图"}
          aria-pressed={miniMapOpen}
          title={miniMapOpen ? "隐藏画布地图" : "显示画布地图"}
          className={cn("h-8 w-8 rounded-lg text-[#71717a] hover:bg-[#f3f3f4] hover:text-[#52525b]", miniMapOpen && "bg-[#f3f3f4] text-[#52525b]")}
        >
          <Map size={15} strokeWidth={1.7} aria-hidden="true" />
        </Button>
      )}
      {mapTrailingControl}
      <Popover open={open} onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          cancelInputRef.current = false;
          setDraft(String(percent));
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`画布缩放，当前 ${percent}%`}
            className="h-8 rounded-md bg-white/95 px-1.5 text-[12px] font-medium tabular-nums text-[#71717a] hover:bg-[#f3f3f3] hover:text-[#52525b]"
          >
            {percent}%
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          side="top"
          align="start"
          sideOffset={8}
          aria-label="画布缩放选项"
          className="nodrag nowheel w-[198px] rounded-xl border-[#e4e4e7] bg-white p-2 text-[#18181b] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="relative mb-1 px-1">
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="画布缩放百分比，范围 10 到 800"
              value={draft}
              onFocus={() => { cancelInputRef.current = false; }}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                if (cancelInputRef.current) {
                  cancelInputRef.current = false;
                  return;
                }
                applyPercent(draft);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelInputRef.current = true;
                  setDraft(String(percent));
                  setOpen(false);
                }
              }}
              className="h-9 border-[#e4e4e7] bg-[#fafafa] pl-2.5 pr-7 text-sm font-semibold tabular-nums text-[#18181b] shadow-none selection:bg-[#e4e4e7] selection:text-[#18181b] focus-visible:border-[#a1a1aa] focus-visible:ring-[#a1a1aa]/20"
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">%</span>
          </div>

          <Button type="button" variant="ghost" size="sm" className={rowClassName} disabled={zoom >= maxZoom} onClick={() => void zoomIn({ duration: 180 })}>
            放大 <Plus size={14} aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className={rowClassName} disabled={zoom <= minZoom} onClick={() => void zoomOut({ duration: 180 })}>
            缩小 <Minus size={14} aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className={rowClassName} onClick={() => { setOpen(false); void fitView({ padding: 0.18, maxZoom: 1, duration: 180 }); }}>
            适合屏幕 <Maximize2 size={14} aria-hidden="true" />
          </Button>

          <div className="my-1.5 h-px bg-[#e4e4e7]" aria-hidden="true" />

          <Button type="button" variant="ghost" size="sm" className={rowClassName} onClick={() => choosePercent(50)}>
            缩放至50%
          </Button>
          <Button type="button" variant="ghost" size="sm" className={rowClassName} onClick={() => choosePercent(100)}>
            缩放至100%
          </Button>
        </PopoverContent>
      </Popover>
    </Panel>
  );
}
