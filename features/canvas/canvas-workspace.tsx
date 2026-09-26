"use client";

import { ReactFlow } from "@xyflow/react";

import { ZoomSelect } from "@/components/ui/zoom-select";
import styles from "./canvas-workspace.module.css";

export function CanvasWorkspace() {
  return (
    <section className={styles.canvas} aria-label="画布创作">
      <ReactFlow
        defaultNodes={[]}
        defaultEdges={[]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: "#fff" }}
      >
        <ZoomSelect position="bottom-right" />
      </ReactFlow>
    </section>
  );
}
