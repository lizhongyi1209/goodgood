"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ImageOff, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { adjacentViewerIndex, createViewerWheelStep } from "./image-viewer-navigation.mjs";
import styles from "./image-viewer.module.css";

export type ImageViewerItem = Readonly<{
  key: string;
  name: string;
  previewUrl: string;
  sourceUrl: string;
  width?: number;
  height?: number;
  media?: "image" | "video";
}>;

type ViewerProps = Readonly<{
  items: readonly ImageViewerItem[];
  selectedKey: string;
  returnFocusTo: HTMLElement | null;
  onSelect: (key: string) => void;
  onClose: () => void;
  mode?: "canvas";
  renderVideo?: (item: ImageViewerItem) => ReactNode;
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

function VideoThumbnail({ src }: Readonly<{ src: string }>) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.image}>
    {failed ? <ImageOff size={18} aria-hidden="true" /> : <video src={src} muted playsInline preload="metadata" aria-hidden="true"
      onError={() => setFailed(true)} onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        try { video.currentTime = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(.05, video.duration / 2) : .05; }
        catch { /* Keep the browser's initial frame if seeking is unavailable. */ }
      }} />}
    {!failed && <Play className={styles.thumbnailPlay} size={12} fill="currentColor" aria-hidden="true" />}
  </span>;
}

function ThumbnailCarousel({ items, selectedKey, onSelect }: Pick<ViewerProps, "items" | "selectedKey" | "onSelect">) {
  const railRef = useRef<HTMLElement>(null);
  const index = Math.max(0, items.findIndex((item) => item.key === selectedKey));
  useEffect(() => {
    const rail = railRef.current;
    if (rail?.contains(document.activeElement)) rail.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus({ preventScroll: true });
  }, [selectedKey]);
  // Only nearby frames are mounted; large libraries do not load every video.
  const start = Math.max(0, index - 7);
  return <nav ref={railRef} className={styles.carousel} aria-label="当前范围图片和视频">
    {items.slice(start, index + 8).map((item, offset) => {
      const itemIndex = start + offset;
      const active = item.key === selectedKey;
      const ratio = item.width && item.height && item.width > 0 && item.height > 0 ? item.width / item.height : 1;
      return <button key={item.key} type="button" className={styles.carouselThumbnail}
        style={{ "--thumbnail-offset": itemIndex - index, "--thumbnail-ratio": ratio } as CSSProperties}
        aria-label={`查看第 ${itemIndex + 1} 个${item.media === "video" ? "视频" : "图片"}：${item.name}`}
        tabIndex={active ? 0 : -1}
        aria-current={active ? "true" : undefined} onClick={() => onSelect(item.key)}>
        {item.media === "video" ? <VideoThumbnail key={item.previewUrl} src={item.previewUrl} />
          : <ViewerImage key={item.previewUrl} src={item.previewUrl} name={item.name} thumbnail />}
      </button>;
    })}
  </nav>;
}

// This body mounts inside the portal, so its native wheel target already exists.
function ViewerBody({ items, selectedKey, onSelect, onClose, mode, renderVideo }: Omit<ViewerProps, "returnFocusTo">) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef(new Map<string, HTMLButtonElement>());
  const navigationRef = useRef({ items, selectedKey, onSelect });
  const index = items.findIndex((item) => item.key === selectedKey);
  const selected = items[index] ?? null;

  useEffect(() => { navigationRef.current = { items, selectedKey, onSelect }; }, [items, selectedKey, onSelect]);

  useEffect(() => {
    const stage = mode === "canvas" ? layoutRef.current : stageRef.current;
    if (!stage) return;
    const step = createViewerWheelStep();
    const wheel = (event: WheelEvent) => {
      const direction = step(event, stage.clientHeight);
      if (direction === null) return;
      event.preventDefault();
      event.stopPropagation();
      const navigation = navigationRef.current;
      if (!direction || navigation.items.length < 2) return;
      const currentIndex = navigation.items.findIndex((item) => item.key === navigation.selectedKey);
      const nextIndex = adjacentViewerIndex(currentIndex, navigation.items.length, direction);
      const next = navigation.items[nextIndex];
      if (next && next.key !== navigation.selectedKey) navigation.onSelect(next.key);
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => stage.removeEventListener("wheel", wheel);
  }, [mode]);

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
    const next = items[adjacentViewerIndex(index, items.length, direction)];
    if (next) onSelect(next.key);
  };
  const media = selected ? selected.media === "video" ? renderVideo?.(selected)
    : <ViewerImage key={`${selected.key}:${selected.sourceUrl}`} src={selected.sourceUrl} name={selected.name} />
    : <p className={styles.empty} role="status">{items.length ? "此资产已不在当前列表中，请选择右侧缩略图。" : "当前范围没有可预览的资产。"}</p>;

  return <div ref={layoutRef} className={`${styles.layout} ${mode === "canvas" ? styles.canvasLayout : ""}`} onKeyDown={(event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (["ArrowDown", "ArrowRight"].includes(event.key)) { event.preventDefault(); selectAdjacent(1); }
    if (["ArrowUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); selectAdjacent(-1); }
  }}>
    <section ref={stageRef} className={styles.stage} aria-label="大图预览" onDragStart={(event) => event.preventDefault()}>
      <Button type="button" variant="ghost" size="icon" className={styles.close} aria-label={mode === "canvas" ? "关闭资产预览" : "关闭图片预览"} onClick={onClose}><X size={20} aria-hidden="true" /></Button>
      {mode === "canvas" ? <div className={styles.stageMedia}>{media}</div> : media}
      <div className={styles.caption}><span>{selected?.name ?? "图片预览"}</span><small>{index >= 0 ? index + 1 : "—"} / {items.length}</small></div>
    </section>
    {mode === "canvas" ? <ThumbnailCarousel items={items} selectedKey={selectedKey} onSelect={onSelect} /> : <nav className={styles.rail} aria-label="当前范围图片" onWheel={(event) => event.stopPropagation()}>
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
    </nav>}
  </div>;
}

export function ImageViewer({ returnFocusTo, onClose, ...props }: ViewerProps) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={`${styles.dialog} ${props.mode === "canvas" ? styles.canvasDialog : ""}`} overlayClassName={styles.overlay} showCloseButton={false}
      onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true }); }}
      onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <DialogTitle className="sr-only">{props.mode === "canvas" ? "资产预览" : "图片预览"}</DialogTitle>
      <DialogDescription className="sr-only">{props.mode === "canvas" ? "滚动鼠标或使用方向键切换图片和视频，点击右侧缩略图也可切换。视频可悬停或手动播放。" : "滚动大图区或使用方向键切换图片，右侧缩略图可滚动和点击。"}按 Escape 关闭。</DialogDescription>
      <ViewerBody {...props} onClose={onClose} />
    </DialogContent>
  </Dialog>;
}
