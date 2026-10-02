"use client";

import { useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

import { CanvasAdaptiveImage } from "./canvas-adaptive-image";
import { CanvasImageViewButton } from "./canvas-image-view-button";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import { CanvasImageCropToolbar, useCanvasImageCrop } from "./canvas-image-crop";
import { canvasCropImageForNode } from "./canvas-image-crop-image";
import type { CanvasNode, CanvasSourceNode as CanvasSourceNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";
import assetStyles from "./canvas-asset-panel.module.css";

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
  const { request: cropRequest } = useCanvasImageCrop();
  const [readyPreview, setReadyPreview] = useState<string | null>(null);
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
  const cropImage = !imageFailed && readyPreview === (localFallback ?? data.previewUrl)
    ? canvasCropImageForNode({ id, type: "sourceImage", data, position: { x: 0, y: 0 } }) : null;
  const imageUrls = data.assetId ? privateImageUrls(data.assetKind === "generated" ? "asset" : "reference", data.assetId) : null;
  const viewerImages = [{ key: id, name: data.name,
    previewUrl: imageUrls?.previewUrl ?? (localFallback ?? data.previewUrl),
    sourceUrl: imageUrls?.contentUrl ?? (localFallback ?? data.previewUrl),
    width: data.pixelWidth, height: data.pixelHeight }];

  return (
    <>
      <CanvasImageCropToolbar image={cropImage} selected={selected} />
      {!imageFailed && <CanvasMediaMetadata kind="image" name={data.name} nodeWidth={width} pixelWidth={data.pixelWidth} pixelHeight={data.pixelHeight} />}
      <article data-canvas-crop-image={data.assetId} className={`${styles.sourceNode} ${assetStyles.visualFrame} ${imageFailed ? "" : styles.imageNode} ${data.uploadState === "uploading" ? styles.mediaUploading : ""}`} aria-label={`图片 ${data.name}`} aria-busy={data.uploadState === "uploading" || undefined}>
        {imageFailed
          ? <div className={styles.sourceFailure} role="alert">图片无法预览</div>
          : <CanvasAdaptiveImage
              src={localFallback ?? data.previewUrl}
              assetId={localFallback ? undefined : data.assetId}
              kind={data.assetKind === "generated" ? "asset" : "reference"}
              alt={data.name}
              className={styles.sourceImage}
              loading="eager"
              onLoad={(event) => {
                setReadyPreview(localFallback ?? data.previewUrl);
                if (data.assetId && !localFallback) data.onPreviewReady?.();
                // Preview pixels are display-only; retain the source's actual dimensions.
                const pixelWidth = data.pixelWidth ?? event.currentTarget.naturalWidth;
                const pixelHeight = data.pixelHeight ?? event.currentTarget.naturalHeight;
                const size = initialCanvasImageSize(pixelWidth, pixelHeight);
                if (!size) return;
                updateNode(id, (node) => {
                  if (node.type !== "sourceImage" || node.data.imageSized) return {};
                  return {
                    ...(!node.data.imageSized ? { style: { ...node.style, ...size } } : {}),
                    data: { ...node.data, imageSized: true },
                  };
                });
              }}
              onError={() => { setReadyPreview(null); setPreviewFailure(localFallback ? "local" : "remote"); }}
            />}
        {!imageFailed && <CanvasImageViewButton items={viewerImages} imageKey={id}
          disabled={Boolean(cropRequest) || readyPreview !== (localFallback ?? data.previewUrl)} />}
        {data.assetId && previewFailure && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span>图片已上传，预览暂不可用。</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); setPreviewFailure(null); }}>重试预览</button>
        </div>}
        {data.uploadState === "failed" && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span title={data.uploadError}>{data.uploadError ?? "图片上传失败。"}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); data.onRetryUpload?.(); }}>重试</button>
        </div>}
      </article>
      {selected && data.imageSized && !imageFailed && cropRequest?.nodeId !== id && (
        <CanvasImageResizeControls />
      )}
      {(data.assetId || data.uploadState) && <Handle type="source" id="reference" position={Position.Right} className={styles.referenceOutputHandle} aria-label="连接到图片生成器" />}
    </>
  );
}
