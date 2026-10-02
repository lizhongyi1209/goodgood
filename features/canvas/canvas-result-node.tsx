"use client";

import { useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { imageDownloadFilename } from "@/features/assets/image-download";
import type { GenerationJob } from "@/shared/contracts/generation";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import { CanvasImageCropToolbar, useCanvasImageCrop } from "./canvas-image-crop";
import { canvasCropImageForNode } from "./canvas-image-crop-image";
import type { CanvasNode, CanvasResultNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasResultNodeData = Record<string, unknown> & {
  job: GenerationJob;
  index: number;
  onRetry: () => void;
  imageSized?: boolean;
};

export function CanvasResultNode({ id, data, selected, width }: NodeProps<CanvasResultNodeType>) {
  const { job, index, onRetry } = data;
  const output = job.outputs[index];
  const { updateNode } = useReactFlow<CanvasNode>();
  const { request: cropRequest } = useCanvasImageCrop();
  const [readyPreview, setReadyPreview] = useState<string | null>(null);

  if (job.state === "failed" || job.state === "cancelled") {
    return (
      <article className={`${styles.resultNode} ${styles.failedNode}`} role="alert">
        <CircleAlert size={18} aria-hidden="true" />
        <strong>{job.error?.title ?? "本次生成未完成"}</strong>
        <p>{job.error?.message ?? "请检查设置后重试。"}</p>
        <Button className="nodrag" size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden="true" />重试
        </Button>
      </article>
    );
  }

  if (!output) {
    return (
      <article className={`${styles.resultNode} ${styles.pendingNode}`} role="status">
        <div className={styles.pendingImage} aria-hidden="true" />
        <div className={styles.pendingLabel}>
          <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />
          {job.state === "queued" ? "等待生成" : job.state === "refining" ? "完善细节" : "正在生成"}
        </div>
      </article>
    );
  }

  return (
    <>
      <CanvasImageCropToolbar selected={selected} image={readyPreview === output.previewUrl
        ? canvasCropImageForNode({ id, type: "imageResult", data, position: { x: 0, y: 0 } }) : null} />
      <CanvasMediaMetadata
        kind="image"
        name={imageDownloadFilename(job.createdAt, index + 1, output.previewUrl)}
        nodeWidth={width}
        pixelWidth={output.width}
        pixelHeight={output.height}
      />
      <article data-canvas-crop-image={output.id} className={`${styles.resultNode} ${styles.imageNode} ${data.imageSized ? styles.sizedNode : ""}`}>
        <PrivateObjectImage
          src={output.previewUrl}
          alt={`生成图片 ${index + 1}`}
          className={styles.resultImage}
          style={output.width && output.height ? { aspectRatio: `${output.width} / ${output.height}` } : undefined}
          onLoad={(event) => {
            setReadyPreview(output.previewUrl);
            const size = initialCanvasImageSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
            if (!size) return;
            updateNode(id, (node) => node.type !== "imageResult" || node.data.imageSized ? {} : {
              style: { ...node.style, ...size },
              data: { ...node.data, imageSized: true },
            });
          }}
          onError={() => setReadyPreview(null)}
        />
      </article>
      {selected && data.imageSized && cropRequest?.nodeId !== id && (
        <CanvasImageResizeControls />
      )}
      {job.state === "succeeded" && <Handle type="source" id="reference" position={Position.Right} className={styles.referenceOutputHandle} aria-label="连接到图片生成器" />}
    </>
  );
}
