"use client";

import { AlertCircle, AudioLines, ImagePlus, LoaderCircle, RotateCcw, X } from "lucide-react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import styles from "./design-system.module.css";

export type ReferenceThumbItem = { id: string; name: string; url?: string; mediaType?: "image" | "video" | "audio"; status?: "uploading" | "ready" | "failed"; errorMessage?: string; durationLabel?: string };
export function ReferenceThumb({ item, ordinal, onRemove, onRetry, onPreview }: { item: ReferenceThumbItem; ordinal: number; onRemove?: () => void; onRetry?: () => void; onPreview?: () => void }) {
  const media = item.mediaType ?? "image";
  return <div className={styles.referenceThumb} data-state={item.status ?? "ready"}>
    <button type="button" className={styles.referencePreview} aria-label={item.status === "failed" ? `重试上传 ${item.name}` : `预览 ${item.name}`} onClick={item.status === "failed" ? onRetry : onPreview} disabled={item.status === "uploading"}>
      {media === "audio" ? <AudioLines aria-hidden="true" /> : media === "video" ? <video src={item.url} muted preload="metadata" aria-label={item.name} /> : item.url ? <PrivateObjectImage src={item.url} alt={item.name} /> : <ImagePlus aria-hidden="true" />}
      {item.status === "uploading" && <span className={styles.referenceState} role="status" aria-label={`${item.name} 正在上传`}><LoaderCircle className={styles.spin} /></span>}
      {item.status === "failed" && <span className={styles.referenceState} title={item.errorMessage}>{onRetry ? <RotateCcw /> : <AlertCircle />}</span>}
      <span className={styles.referenceOrdinal}>{media === "video" ? "视" : media === "audio" ? "音" : "图"}{ordinal}</span>
      {item.durationLabel && <span className={styles.duration}>{item.durationLabel}</span>}
    </button>
    {onRemove && <button className={styles.removeReference} type="button" aria-label={`移除 ${item.name}`} onClick={onRemove}><X aria-hidden="true" /></button>}
  </div>;
}
