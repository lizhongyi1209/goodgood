"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import styles from "./canvas-page.module.css";

export function CanvasVideoGeneratorPrompt({ id, value, placeholder, readOnly, maxLength, width, canGenerate, onChange, onInteract, onGenerate }: Readonly<{
  id: string;
  value: string;
  placeholder: string;
  readOnly: boolean;
  maxLength: number;
  width: number;
  canGenerate: boolean;
  onChange: (value: string) => void;
  onInteract: () => void;
  onGenerate: () => void;
}>) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);

  const syncScrollbar = useCallback(() => {
    const field = fieldRef.current;
    const area = areaRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!field || !area || !track || !thumb) return;
    const range = field.scrollHeight - field.clientHeight;
    area.dataset.scrollable = range > 1 ? "true" : "false";
    if (range <= 1) return;
    const height = Math.min(track.clientHeight, Math.max(28, track.clientHeight * field.clientHeight / field.scrollHeight));
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translateY(${Math.max(0, track.clientHeight - height) * Math.min(1, Math.max(0, field.scrollTop / range))}px)`;
  }, []);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    const height = Math.max(70, field.scrollHeight);
    field.style.height = `${expanded ? height : Math.min(height, 188)}px`;
    if (!expanded) setOverflow(height > field.clientHeight + 1);
    syncScrollbar();
  }, [value, width, expanded, syncScrollbar]);

  return <div ref={areaRef} className={styles.promptArea}>
    <Textarea ref={fieldRef} id={id} className={`${styles.prompt} ${expanded ? styles.promptExpanded : ""} nodrag nopan nowheel`}
      value={value} placeholder={placeholder} readOnly={readOnly} maxLength={maxLength} aria-label="视频提示词"
      onPointerDown={onInteract} onFocus={onInteract} onScroll={syncScrollbar}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (canGenerate) onGenerate();
        }
      }} />
    <span ref={trackRef} className={styles.promptScrollbar} aria-hidden="true"><span ref={thumbRef} className={styles.promptScrollbarThumb} /></span>
    <span className={styles.promptControlSlot}>
      {(overflow || expanded) && <button type="button" className={`${styles.promptExpand} ${expanded ? styles.promptExpandActive : ""}`}
        aria-label={expanded ? "收起提示词" : "展开提示词"} aria-controls={id} aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}>
        {expanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
      </button>}
    </span>
  </div>;
}
