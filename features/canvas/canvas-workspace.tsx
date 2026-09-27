"use client";

import { useRef, useState } from "react";
import {
  ReactFlow,
  ViewportPortal,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ZoomSelect } from "@/components/ui/zoom-select";
import { canvasAlignmentGuides } from "./canvas-alignment-guides.mjs";
import { CanvasResultNode, type CanvasResultNodeData } from "./canvas-result-node";
import { CanvasSourceNode as CanvasSourceImageNode, type CanvasSourceNodeData } from "./canvas-source-node";
import styles from "./canvas-workspace.module.css";

export type CanvasResultNodeType = Node<CanvasResultNodeData, "imageResult">;
export type CanvasSourceNode = Node<CanvasSourceNodeData, "sourceImage">;
export type CanvasNode = CanvasResultNodeType | CanvasSourceNode;

const nodeTypes = { imageResult: CanvasResultNode, sourceImage: CanvasSourceImageNode };
const initialNodes: CanvasNode[] = [];
const initialEdges: [] = [];
type GuideState = { guides: NonNullable<ReturnType<typeof canvasAlignmentGuides>>; zoom: number };

function isLoadedImage(node: CanvasNode) {
  return !node.hidden && Boolean(node.data.imageSized) &&
    (node.type === "sourceImage" || node.type === "imageResult" && Boolean(node.data.job.outputs[node.data.index]));
}

export function CanvasWorkspace({
  onInit,
  onNodesChange,
}: Readonly<{
  onInit: (instance: ReactFlowInstance<CanvasNode>) => void;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
}>) {
  const flowRef = useRef<ReactFlowInstance<CanvasNode> | null>(null);
  const [guideState, setGuideState] = useState<GuideState | null>(null);

  return (
    <section className={styles.canvas} aria-label="画布创作">
      <ReactFlow<CanvasNode>
        defaultNodes={initialNodes}
        defaultEdges={initialEdges}
        nodeTypes={nodeTypes}
        onInit={(instance) => { flowRef.current = instance; onInit(instance); }}
        onNodesChange={onNodesChange}
        onNodeDrag={(_, node, draggedNodes) => {
          const instance = flowRef.current;
          if (!instance) return;
          const dragged = draggedNodes.length ? draggedNodes : [node];
          const moving = dragged.filter(isLoadedImage);
          const movingIds = new Set(dragged.map((item) => item.id));
          if (!moving.length) { setGuideState(null); return; }
          const others = instance.getNodes()
            .filter((item) => isLoadedImage(item) && !movingIds.has(item.id))
            .map((item) => instance.getNodesBounds([item.id]));
          const zoom = instance.getViewport().zoom;
          const guides = canvasAlignmentGuides(instance.getNodesBounds(moving.map((item) => item.id)), others, zoom);
          setGuideState(guides ? { guides, zoom } : null);
        }}
        onNodeDragStop={() => setGuideState(null)}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        nodesConnectable={false}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: "#fff" }}
      >
        {guideState && <ViewportPortal>
          {guideState.guides.vertical && <div
            className={styles.alignmentGuide}
            aria-hidden="true"
            style={{
              left: guideState.guides.vertical.x,
              top: guideState.guides.vertical.y1,
              width: 1 / guideState.zoom,
              height: guideState.guides.vertical.y2 - guideState.guides.vertical.y1,
              transform: "translateX(-50%)",
            }}
          />}
          {guideState.guides.horizontal && <div
            className={styles.alignmentGuide}
            aria-hidden="true"
            style={{
              left: guideState.guides.horizontal.x1,
              top: guideState.guides.horizontal.y,
              width: guideState.guides.horizontal.x2 - guideState.guides.horizontal.x1,
              height: 1 / guideState.zoom,
              transform: "translateY(-50%)",
            }}
          />}
        </ViewportPortal>}
        <ZoomSelect position="bottom-right" />
      </ReactFlow>
    </section>
  );
}
