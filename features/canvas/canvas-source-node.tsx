"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ImagePlus, Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CanvasSourceNode as CanvasSourceNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasSourceNodeData = Record<string, unknown> & {
  file: File;
  name: string;
  previewUrl: string;
  referenceStatus?: "uploading" | "ready" | "failed";
  onPreview: () => void;
  onUseReference: () => void;
  onRemove: () => void;
};

export function CanvasSourceNode({ data }: NodeProps<CanvasSourceNodeType>) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className={styles.sourceNode} aria-label={`本地图片 ${data.name}`}>
      {imageFailed
        ? <div className={styles.sourceFailure} role="alert">图片无法预览</div>
        : <PrivateObjectImage src={data.previewUrl} alt={data.name} className={styles.sourceImage} loading="eager" onError={() => setImageFailed(true)} />}
      <div className={styles.sourceActions}>
        <Button className="nodrag" type="button" size="icon-sm" variant="secondary" disabled={imageFailed} onClick={data.onPreview} aria-label={`查看大图 ${data.name}`} title="查看大图">
          <Maximize2 size={14} aria-hidden="true" />
        </Button>
        <Button
          className="nodrag"
          type="button"
          size="sm"
          variant="secondary"
          disabled={imageFailed || Boolean(data.referenceStatus)}
          onClick={data.onUseReference}
          aria-label={`${data.referenceStatus ? "已加入参考图" : "用作参考图"} ${data.name}`}
        >
          <ImagePlus size={14} aria-hidden="true" />
          {data.referenceStatus === "uploading" ? "上传中" : data.referenceStatus ? "已加入参考" : "用作参考"}
        </Button>
        <Button className="nodrag" type="button" size="icon-sm" variant="secondary" onClick={data.onRemove} aria-label={`从画布移除 ${data.name}`} title="从画布移除">
          <X size={14} aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
