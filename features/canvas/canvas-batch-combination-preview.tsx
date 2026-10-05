"use client";

import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { CanvasBatchPanelItem } from "./canvas-batch-reference-panel";
import batchStyles from "./canvas-batch-generator.module.css";
import styles from "./canvas-batch-combination-preview.module.css";

type Props = {
  combination?: { key: string; index: number; items: readonly CanvasBatchPanelItem[] };
};

export function CanvasBatchCombinationPreview({ combination }: Props) {
  return <div className={styles.preview} role="group" aria-label="首组参考图序预览">
    <span className={styles.label}>组合预览</span>
    <div className={`${batchStyles.materials} ${styles.images} nodrag nopan nowheel nokey`}
      role="list" aria-label="提示词中的参考图顺序" tabIndex={combination ? 0 : undefined}>
      {combination?.items.map((item, index) => <span className={batchStyles.material} key={item.reference.id}
        role="listitem" title={`图 ${index + 1}：${item.reference.name}`} aria-busy={item.reference.status === "uploading" || undefined}>
        <PrivateObjectImage src={item.previewUrl} alt={`图 ${index + 1}：${item.reference.name}`} />
        <span className={batchStyles.ordinal} aria-hidden="true">{index + 1}</span>
        {item.reference.status !== "ready" && <span className={styles.imageStatus}>{item.reference.status === "failed" ? "载入失败" : "载入中"}</span>}
      </span>)}
      {!combination && <span className={batchStyles.empty}>添加素材后显示预览</span>}
    </div>
  </div>;
}
