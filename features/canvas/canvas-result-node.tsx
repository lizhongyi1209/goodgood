"use client";

import type { NodeProps } from "@xyflow/react";
import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { GenerationJob } from "@/shared/contracts/generation";
import type { CanvasResultNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasResultNodeData = Record<string, unknown> & {
  job: GenerationJob;
  index: number;
  onRetry: () => void;
};

export function CanvasResultNode({ data }: NodeProps<CanvasResultNodeType>) {
  const { job, index, onRetry } = data;
  const output = job.outputs[index];

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
    <article className={styles.resultNode}>
      <a className="nodrag" href={`/assets/${encodeURIComponent(output.id)}`} aria-label={`查看生成图片 ${index + 1}`}>
        <PrivateObjectImage
          src={output.previewUrl}
          alt={`生成图片 ${index + 1}`}
          className={styles.resultImage}
          style={output.width && output.height ? { aspectRatio: `${output.width} / ${output.height}` } : undefined}
        />
      </a>
    </article>
  );
}
