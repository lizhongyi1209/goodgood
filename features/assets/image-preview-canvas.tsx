"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { attachImagePreviewNavigation, INITIAL_IMAGE_VIEW } from "./image-preview-navigation.mjs";
import styles from "./image-viewer.module.css";

export function ImagePreviewCanvas({ children, name }: Readonly<{ children: ReactNode; name: string }>) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(INITIAL_IMAGE_VIEW);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const navigation = attachImagePreviewNavigation(surface, { onViewChange: setView, onDraggingChange: setDragging });
    return () => navigation.dispose();
  }, []);

  return <div className={styles.imageCanvas}>
    <div ref={surfaceRef} className={styles.imageCanvasSurface} data-dragging={dragging || undefined}
      tabIndex={0} role="region" aria-label={`${name}，拖动移动图片，滚轮缩放；加减键缩放，0 适应画布，方向键移动`}>
      <div className={styles.imageCanvasPlane} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{children}</div>
    </div>
  </div>;
}
