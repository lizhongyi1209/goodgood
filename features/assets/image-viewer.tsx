"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import styles from "./image-viewer.module.css";

export type ImageViewerItem = Readonly<{
  key: string;
  name: string;
  previewUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}>;

type ViewerProps = Readonly<{
  items: readonly ImageViewerItem[];
  selectedKey: string;
  returnFocusTo: HTMLElement | null;
  onSelect: (key: string) => void;
  onClose: () => void;
}>;

function ViewerImage({ src, name, thumbnail = false }: Readonly<{ src: string; name: string; thumbnail?: boolean }>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) return <span className={styles.imageState}>
    <ImageOff size={thumbnail ? 18 : 28} aria-hidden="true" />
    {!thumbnail && <><span role="alert">图片暂时无法读取。</span><Button type="button" variant="secondary" size="sm"
      onClick={() => { setAttempt((current) => current + 1); setLoaded(false); setFailed(false); }}>重试</Button></>}
  </span>;
  return <span className={styles.image} data-loading={!loaded || undefined} aria-busy={!loaded}>
    <PrivateObjectImage key={attempt} src={src} alt={thumbnail ? "" : name} loading={thumbnail ? "lazy" : "eager"}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    {!loaded && !thumbnail && <span className={styles.imageState} role="status">正在读取图片…</span>}
  </span>;
}

// This body mounts inside the portal, so its native wheel target already exists.
function ViewerBody({ items, selectedKey, onSelect, onClose }: Omit<ViewerProps, "returnFocusTo">) {
  const stageRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef(new Map<string, HTMLButtonElement>());
  const navigationRef = useRef({ items, selectedKey, onSelect });
  const index = items.findIndex((item) => item.key === selectedKey);
  const selected = items[index] ?? null;

  useEffect(() => { navigationRef.current = { items, selectedKey, onSelect }; }, [items, selectedKey, onSelect]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer: number | null = null;
    let total = 0;
    let lastTime = 0;
    let direction = 0;
    const wheel = (event: WheelEvent) => {
      // Preserve browser pinch/zoom and horizontal gestures; rail scrolling is separate.
      if (event.ctrlKey || event.metaKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      event.stopPropagation();
      const navigation = navigationRef.current;
      if (timer !== null || navigation.items.length < 2) return;
      const nextDirection = Math.sign(event.deltaY);
      if (direction !== nextDirection || event.timeStamp - lastTime > 180) total = 0;
      direction = nextDirection;
      lastTime = event.timeStamp;
      total += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      if (Math.abs(total) < 18) return;
      total = 0;
      const currentIndex = navigation.items.findIndex((item) => item.key === navigation.selectedKey);
      const nextIndex = Math.max(0, Math.min(currentIndex + direction, navigation.items.length - 1));
      const next = navigation.items[nextIndex];
      if (next && next.key !== navigation.selectedKey) navigation.onSelect(next.key);
      timer = window.setTimeout(() => { timer = null; total = 0; }, 280);
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => { stage.removeEventListener("wheel", wheel); if (timer !== null) window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    const thumbnail = thumbnailRefs.current.get(selectedKey);
    if (!rail || !thumbnail) return;
    const railBox = rail.getBoundingClientRect();
    const thumbnailBox = thumbnail.getBoundingClientRect();
    const offset = thumbnailBox.top < railBox.top ? thumbnailBox.top - railBox.top
      : thumbnailBox.bottom > railBox.bottom ? thumbnailBox.bottom - railBox.bottom : 0;
    if (offset) rail.scrollTo({ top: rail.scrollTop + offset, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [selectedKey, items]);

  const selectAdjacent = (direction: number) => {
    const next = items[Math.max(0, Math.min(index + direction, items.length - 1))];
    if (next) onSelect(next.key);
  };

  return <div className={styles.layout} onKeyDown={(event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (["ArrowDown", "ArrowRight"].includes(event.key)) { event.preventDefault(); selectAdjacent(1); }
    if (["ArrowUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); selectAdjacent(-1); }
  }}>
    <section ref={stageRef} className={styles.stage} aria-label="大图预览" onDragStart={(event) => event.preventDefault()}>
      <Button type="button" variant="ghost" size="icon" className={styles.close} aria-label="关闭图片预览" onClick={onClose}><X size={20} aria-hidden="true" /></Button>
      {selected ? <ViewerImage key={`${selected.key}:${selected.sourceUrl}`} src={selected.sourceUrl} name={selected.name} />
        : <p className={styles.empty} role="status">{items.length ? "此图片已不在当前列表中，请选择右侧图片。" : "当前范围没有图片。"}</p>}
      <div className={styles.caption}><span>{selected?.name ?? "图片预览"}</span><small>{index >= 0 ? index + 1 : "—"} / {items.length}</small></div>
    </section>
    <nav className={styles.rail} aria-label="当前范围图片" onWheel={(event) => event.stopPropagation()}>
      <span className={styles.railTitle}>图片</span>
      <div ref={railRef} className={styles.thumbnails}>
        {items.map((item, itemIndex) => <button key={item.key} type="button" className={styles.thumbnail}
          ref={(element) => { if (element) thumbnailRefs.current.set(item.key, element); else thumbnailRefs.current.delete(item.key); }}
          style={{ aspectRatio: item.width && item.height && item.width > 0 && item.height > 0 ? item.width / item.height : 1 }}
          aria-label={`查看第 ${itemIndex + 1} 张图片：${item.name}`} aria-current={item.key === selectedKey ? "true" : undefined}
          onClick={() => onSelect(item.key)}>
          <ViewerImage key={item.previewUrl} src={item.previewUrl} name={item.name} thumbnail />
        </button>)}
      </div>
    </nav>
  </div>;
}

export function ImageViewer({ returnFocusTo, onClose, ...props }: ViewerProps) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={styles.dialog} overlayClassName={styles.overlay} showCloseButton={false}
      onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true }); }}
      onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <DialogTitle className="sr-only">图片预览</DialogTitle>
      <DialogDescription className="sr-only">滚动大图区或使用方向键切换图片，右侧缩略图可滚动和点击。按 Escape 关闭。</DialogDescription>
      <ViewerBody {...props} onClose={onClose} />
    </DialogContent>
  </Dialog>;
}
