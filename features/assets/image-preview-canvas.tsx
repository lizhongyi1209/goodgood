"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { attachImagePreviewNavigation, coverImageFrame, INITIAL_IMAGE_VIEW } from "./image-preview-navigation.mjs";
import styles from "./image-viewer.module.css";

export function ImagePreviewCanvas({ children, name, width, height }: Readonly<{ children: ReactNode; name: string; width?: number; height?: number }>) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(INITIAL_IMAGE_VIEW);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [source, setSource] = useState({ width, height });
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const navigation = attachImagePreviewNavigation(surface, { onViewChange: setView, onDraggingChange: setDragging });
    const measure = () => setViewport({ width: surface.clientWidth, height: surface.clientHeight });
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(surface);
    if (!observer) window.addEventListener("resize", measure);
    return () => { navigation.dispose(); observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const frame = coverImageFrame(viewport, source);

  return <div className={styles.imageCanvas}>
    <div ref={surfaceRef} className={styles.imageCanvasSurface} data-dragging={dragging || undefined}
      onLoadCapture={(event) => {
        const image = event.target;
        if (image instanceof HTMLImageElement && image.naturalWidth && image.naturalHeight) setSource({ width: image.naturalWidth, height: image.naturalHeight });
      }}
      tabIndex={0} role="region" aria-label={`${name}，拖动移动图片，滚轮缩放；加减键缩放，0 填满画布，方向键移动`}>
      <div className={styles.imageCanvasPlane} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        <div className={styles.imageCanvasContent} style={frame ? { left: frame.x, top: frame.y, width: frame.width, height: frame.height } : undefined}>{children}</div>
      </div>
    </div>
  </div>;
}
