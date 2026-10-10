"use client";

import type { CSSProperties } from "react";
import { ArrowUpRight, Check, LoaderCircle, Maximize2, RotateCcw } from "lucide-react";
import styles from "./design-system.module.css";

export type MediaTileItem = { id: string; title: string; src: string; width: number; height: number; caption?: string; duration?: string; state?: "ready" | "loading" | "failed"; error?: string };
export function MediaTile({ item, onOpen, onAction, actionLabel, onRetry, selected, onSelect }: { item: MediaTileItem; onOpen: () => void; onAction?: () => void; actionLabel?: string; onRetry?: () => void; selected?: boolean; onSelect?: () => void }) {
  return <article className={styles.mediaTile} data-selected={selected || undefined}>
    <div className={styles.mediaFrame} style={{ aspectRatio: `${item.width} / ${item.height}` } as CSSProperties} data-state={item.state ?? "ready"}>
      <button type="button" className={styles.mediaOpen} aria-label={`查看 ${item.title}`} onClick={onOpen}>{item.state === "loading" ? <LoaderCircle className={styles.spin} /> : item.state === "failed" ? <span>{item.error ?? "读取失败，请重试"}</span> : <img src={item.src} alt={item.title} loading="lazy" />}</button>
      {(!item.state || item.state === "ready") && <button type="button" className={styles.mediaView} aria-label={`查看大图 ${item.title}`} onClick={onOpen}><Maximize2 aria-hidden="true" /></button>}
      {onSelect && <button className={styles.mediaSelect} type="button" aria-label={`选择 ${item.title}`} aria-pressed={selected} onClick={onSelect}>{selected && <Check aria-hidden="true" />}</button>}
      {item.duration && <span className={styles.duration}>{item.duration}</span>}
      {onAction && <button className={styles.mediaAction} type="button" aria-label={actionLabel} onClick={onAction}>{actionLabel}<ArrowUpRight aria-hidden="true" /></button>}
      {item.state === "failed" && onRetry && <button type="button" className={styles.mediaAction} onClick={onRetry}><RotateCcw aria-hidden="true" />重试</button>}
    </div>{item.caption && <p className={styles.mediaCaption}>{item.caption}</p>}
  </article>;
}
