"use client";

import { NodeResizeControl } from "@xyflow/react";

import styles from "./canvas-workspace.module.css";

const corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

export function CanvasImageResizeControls() {
  return <>
    {corners.map((position) => (
      <NodeResizeControl
        key={position}
        position={position}
        keepAspectRatio
        minWidth={48}
        minHeight={48}
        maxWidth={960}
        maxHeight={960}
        className={styles.resizeControl}
      />
    ))}
  </>;
}
