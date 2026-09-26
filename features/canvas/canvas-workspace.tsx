"use client";

import {
  ReactFlow,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";

import { ZoomSelect } from "@/components/ui/zoom-select";
import { CanvasResultNode, type CanvasResultNodeData } from "./canvas-result-node";
import { CanvasSourceNode as CanvasSourceImageNode, type CanvasSourceNodeData } from "./canvas-source-node";
import styles from "./canvas-workspace.module.css";

export type CanvasResultNodeType = Node<CanvasResultNodeData, "imageResult">;
export type CanvasSourceNode = Node<CanvasSourceNodeData, "sourceImage">;
export type CanvasNode = CanvasResultNodeType | CanvasSourceNode;

const nodeTypes = { imageResult: CanvasResultNode, sourceImage: CanvasSourceImageNode };

export function CanvasWorkspace({
  nodes,
  onInit,
  onNodesChange,
}: Readonly<{
  nodes: CanvasNode[];
  onInit: (instance: ReactFlowInstance<CanvasNode>) => void;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
}>) {
  return (
    <section className={styles.canvas} aria-label="画布创作">
      <ReactFlow<CanvasNode>
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        nodesConnectable={false}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: "#fff" }}
      >
        <ZoomSelect position="bottom-right" />
      </ReactFlow>
    </section>
  );
}
