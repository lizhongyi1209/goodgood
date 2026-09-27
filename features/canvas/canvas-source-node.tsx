"use client";

import { useState } from "react";
import { NodeResizeControl, useReactFlow, type NodeProps } from "@xyflow/react";

import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { initialCanvasImageSize } from "./canvas-image-size.mjs";
import type { CanvasNode, CanvasSourceNode as CanvasSourceNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasSourceNodeData = Record<string, unknown> & {
  name: string;
  previewUrl: string;
  imageSized?: boolean;
};

export function CanvasSourceNode({ id, data, selected }: NodeProps<CanvasSourceNodeType>) {
  const [imageFailed, setImageFailed] = useState(false);
  const { updateNode } = useReactFlow<CanvasNode>();

  return (
    <>
      <article className={`${styles.sourceNode} ${imageFailed ? "" : styles.imageNode}`} aria-label={`本地图片 ${data.name}`}>
        {imageFailed
          ? <div className={styles.sourceFailure} role="alert">图片无法预览</div>
          : <PrivateObjectImage
              src={data.previewUrl}
              alt={data.name}
              className={styles.sourceImage}
              loading="eager"
              onLoad={(event) => {
                const size = initialCanvasImageSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
                if (!size) return;
                updateNode(id, (node) => node.type !== "sourceImage" || node.data.imageSized ? {} : {
                  ...size,
                  data: { ...node.data, imageSized: true },
                });
              }}
              onError={() => setImageFailed(true)}
            />}
      </article>
      {selected && data.imageSized && !imageFailed && (
        <NodeResizeControl
          position="bottom-right"
          keepAspectRatio
          minWidth={48}
          minHeight={48}
          maxWidth={960}
          maxHeight={960}
          className={styles.resizeControl}
        />
      )}
    </>
  );
}
