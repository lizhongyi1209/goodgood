import { ImageIcon, Play } from "lucide-react";

import styles from "./canvas-workspace.module.css";

export function CanvasMediaMetadata({
  kind,
  name,
  nodeWidth,
  pixelWidth,
  pixelHeight,
  className,
}: Readonly<{
  kind: "image" | "video";
  name: string;
  nodeWidth?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  className?: string;
}>) {
  const dimensions = pixelWidth && pixelHeight
    ? `${Math.round(pixelWidth)}×${Math.round(pixelHeight)}`
    : "—";
  const compact = nodeWidth !== undefined && nodeWidth < 110;
  const iconOnly = nodeWidth !== undefined && nodeWidth < 90;

  return (
    <div className={`${styles.imageMetadata} ${compact ? styles.imageMetadataCompact : ""} ${iconOnly ? styles.imageMetadataIconOnly : ""} ${className ?? ""}`}>
      <span className={styles.imageMetadataName}>
        {kind === "video"
          ? <Play size={12} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          : <ImageIcon size={12} aria-hidden="true" />}
        <span className={styles.imageMetadataNameText}>{name}</span>
      </span>
      <span className={styles.imageMetadataSize} aria-label={pixelWidth && pixelHeight ? `原始尺寸 ${dimensions} 像素` : "原始尺寸暂不可用"}>{dimensions}</span>
    </div>
  );
}
