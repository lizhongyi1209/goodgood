"use client";

import { useEffect } from "react";
import { Handle, Position, useStore, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { CanvasGeneratorNode } from "./canvas-generator-node";
import { isCanvasBatchGeneratorId, canvasBatchModeFromEdges, canvasBatchGroupCountFromEdges, canvasBatchReferenceHandle } from "./canvas-batch-reference-model.mjs";
import type { CanvasGeneratorNodeType } from "./canvas-workspace";
import styles from "./canvas-batch-generator.module.css";

export function CanvasImageGeneratorNode(props: NodeProps<CanvasGeneratorNodeType>) {
  return isCanvasBatchGeneratorId(props.id) ? <CanvasBatchGeneratorNode {...props} /> : <CanvasGeneratorNode {...props} />;
}

function CanvasBatchGeneratorNode(props: NodeProps<CanvasGeneratorNodeType>) {
  const { id, data } = props;
  const edges = useStore((state) => state.edges);
  const mode = canvasBatchModeFromEdges(edges, id, data.batchMode === "paired" ? "paired" : "all");
  const count = canvasBatchGroupCountFromEdges(edges, id, typeof data.batchGroupCount === "number" ? data.batchGroupCount : 1);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => { updateNodeInternals(id); }, [id, mode, count, updateNodeInternals]);
  return <>
    <CanvasGeneratorNode {...props} />
    {Array.from({ length: count + 1 }, (_, index) => <Handle key={index === 0 ? "reference" : canvasBatchReferenceHandle(index, mode)}
      type="target" id={index === 0 ? "reference" : canvasBatchReferenceHandle(index, mode)} position={Position.Left}
      className={styles.port} style={{ top: `${(index + 1) / (count + 2) * 100}%` }}
      title={index === 0 ? "公共参考 · 每次都使用" : `素材组 ${index} · 每次选一张`}
      aria-label={index === 0 ? "连接公共参考或提示词" : `连接素材组 ${index}`} role="button" tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); event.currentTarget.click(); } }}>
      <span className={styles.portLabel}>{index === 0 ? "公共" : `组 ${index}`}</span>
    </Handle>)}
  </>;
}
