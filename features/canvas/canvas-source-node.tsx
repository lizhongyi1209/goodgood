"use client";

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";

import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CanvasSourceNode as CanvasSourceNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasSourceNodeData = Record<string, unknown> & {
  name: string;
  previewUrl: string;
};

export function CanvasSourceNode({ data }: NodeProps<CanvasSourceNodeType>) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className={`${styles.sourceNode} ${imageFailed ? "" : styles.imageNode}`} aria-label={`本地图片 ${data.name}`}>
      {imageFailed
        ? <div className={styles.sourceFailure} role="alert">图片无法预览</div>
        : <PrivateObjectImage src={data.previewUrl} alt={data.name} className={styles.sourceImage} loading="eager" onError={() => setImageFailed(true)} />}
    </article>
  );
}
