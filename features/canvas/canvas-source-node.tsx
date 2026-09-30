"use client";

import { useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import type { CanvasNode, CanvasSourceNode as CanvasSourceNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasSourceNodeData = Record<string, unknown> & {
  name: string;
  previewUrl: string;
  uploadState?: "uploading" | "failed";
  uploadError?: string;
  onRetryUpload?: () => void;
  onPreviewReady?: () => void;
  assetId?: string;
  assetKind?: "reference" | "generated";
  localPreviewUrl?: string;
  imageSized?: boolean;
  pixelWidth?: number;
  pixelHeight?: number;
};

export function CanvasSourceNode({ id, data, selected, width }: NodeProps<CanvasSourceNodeType>) {
  const [previewFailureState, setPreviewFailureState] = useState<{
    url: string;
    value: "remote" | "local" | null;
  }>({ url: data.previewUrl, value: null });
  const previewFailure = previewFailureState.url === data.previewUrl ? previewFailureState.value : null;
  const setPreviewFailure = (value: "remote" | "local" | null) => {
    setPreviewFailureState({ url: data.previewUrl, value });
  };
  const { updateNode } = useReactFlow<CanvasNode>();
  const localFallback = previewFailure === "remote" ? data.localPreviewUrl : undefined;
  const imageFailed = previewFailure === "local" || (previewFailure === "remote" && !localFallback);

  return (
    <>
      {!imageFailed && <CanvasMediaMetadata kind="image" name={data.name} nodeWidth={width} pixelWidth={data.pixelWidth} pixelHeight={data.pixelHeight} />}
      <article className={`${styles.sourceNode} ${imageFailed ? "" : styles.imageNode} ${data.uploadState === "uploading" ? styles.mediaUploading : ""}`} aria-label={`图片 ${data.name}`} aria-busy={data.uploadState === "uploading" || undefined}>
        {imageFailed
          ? <div className={styles.sourceFailure} role="alert">图片无法预览</div>
          : <PrivateObjectImage
              src={localFallback ?? data.previewUrl}
              alt={data.name}
              className={styles.sourceImage}
              loading="eager"
              onLoad={(event) => {
                if (data.assetId && event.currentTarget.currentSrc === new URL(data.previewUrl, window.location.href).href) data.onPreviewReady?.();
                const pixelWidth = event.currentTarget.naturalWidth;
                const pixelHeight = event.currentTarget.naturalHeight;
                const size = initialCanvasImageSize(pixelWidth, pixelHeight);
                if (!size) return;
                updateNode(id, (node) => {
                  if (node.type !== "sourceImage" || (node.data.imageSized && node.data.pixelWidth === pixelWidth && node.data.pixelHeight === pixelHeight)) return {};
                  return {
                    ...(!node.data.imageSized ? { style: { ...node.style, ...size } } : {}),
                    data: { ...node.data, imageSized: true, pixelWidth, pixelHeight },
                  };
                });
              }}
              onError={() => setPreviewFailure(localFallback ? "local" : "remote")}
            />}
        {data.assetId && previewFailure && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span>图片已上传，预览暂不可用。</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); setPreviewFailure(null); }}>重试预览</button>
        </div>}
        {data.uploadState === "failed" && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span title={data.uploadError}>{data.uploadError ?? "图片上传失败。"}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); data.onRetryUpload?.(); }}>重试</button>
        </div>}
      </article>
      {selected && data.imageSized && !imageFailed && (
        <CanvasImageResizeControls />
      )}
      {(data.assetId || data.uploadState) && <Handle type="source" id="reference" position={Position.Right} className={styles.referenceOutputHandle} aria-label="连接到图片生成器" />}
    </>
  );
}
