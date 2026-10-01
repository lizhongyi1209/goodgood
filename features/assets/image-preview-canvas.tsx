"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachImagePreviewNavigation, INITIAL_IMAGE_VIEW } from "./image-preview-navigation.mjs";
import styles from "./image-viewer.module.css";

export function ImagePreviewCanvas({ children, name }: Readonly<{ children: ReactNode; name: string }>) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<ReturnType<typeof attachImagePreviewNavigation> | null>(null);
  const [view, setView] = useState(INITIAL_IMAGE_VIEW);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const navigation = attachImagePreviewNavigation(surface, { onViewChange: setView, onDraggingChange: setDragging });
    navigationRef.current = navigation;
    return () => { navigationRef.current = null; navigation.dispose(); };
  }, []);

  return <div className={styles.imageCanvas}>
    <div ref={surfaceRef} className={styles.imageCanvasSurface} data-dragging={dragging || undefined}
      tabIndex={0} role="region" aria-label={`${name}，拖动移动图片，滚轮缩放；加减键缩放，0 适应画布，方向键移动`}>
      <div className={styles.imageCanvasPlane} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{children}</div>
    </div>
    <div className={styles.zoomControls} role="group" aria-label="图片缩放">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="缩小图片" disabled={view.scale <= .25}
        onClick={() => navigationRef.current?.zoomBy(.8)}><Minus size={15} aria-hidden="true" /></Button>
      <span aria-live="off">{view.scale.toFixed(1)}×</span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="放大图片" disabled={view.scale >= 16}
        onClick={() => navigationRef.current?.zoomBy(1.25)}><Plus size={15} aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="适应画布" title="适应画布"
        onClick={() => navigationRef.current?.fit()}><Scan size={15} aria-hidden="true" /></Button>
    </div>
  </div>;
}
