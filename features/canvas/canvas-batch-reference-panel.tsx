"use client";

import { Plus, X } from "lucide-react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GenerationReference } from "@/shared/contracts/generation";
import styles from "./canvas-batch-generator.module.css";

export type CanvasBatchPanelItem = { key: string; reference: GenerationReference; previewUrl: string; kind: "direct" | "linked" };
type Props = {
  common: readonly CanvasBatchPanelItem[];
  groups: readonly { id: string; name: string; items: readonly CanvasBatchPanelItem[] }[];
  mode: "all" | "paired";
  disabled: boolean;
  total: number;
  count: number;
  error: string | null;
  preview: readonly { key: string; index: number; items: readonly CanvasBatchPanelItem[] }[];
  onMode: (mode: "all" | "paired") => void;
  onAddGroup: () => void;
  onRemoveGroup: (index: number) => void;
  onRemove: (item: CanvasBatchPanelItem) => void;
  onRetry: (item: CanvasBatchPanelItem) => void;
  onAddCommon: () => void;
};

export function CanvasBatchReferencePanel(props: Props) {
  const row = (name: string, items: readonly CanvasBatchPanelItem[], index: number) => <div className={styles.row} key={index}>
    <div className={styles.rowHeading}><span>{name}</span><small>{items.length} 张</small>
      {index > 0 && props.groups.length > 1 && <button type="button" disabled={props.disabled} className={styles.iconButton} onClick={() => props.onRemoveGroup(index)}
        aria-label={`移除素材组 ${index}`}><X size={12} /></button>}
    </div>
    <div className={styles.materials}>
      {items.map((item, itemIndex) => <div className={styles.material} key={item.key} aria-busy={item.reference.status === "uploading" || undefined}>
        <PrivateObjectImage src={item.previewUrl} alt={item.reference.name} />
        <span className={styles.ordinal}>{itemIndex + 1}</span>
        <button type="button" disabled={props.disabled} onClick={() => props.onRemove(item)} className={styles.remove}
          aria-label={`移除 ${name}：${item.reference.name}`}><X size={10} /></button>
        {item.reference.status !== "ready" && <span className={styles.status}>
          {item.reference.status === "failed" ? <button type="button" disabled={props.disabled} onClick={() => props.onRetry(item)}>重试</button> : "载入中"}
        </span>}
      </div>)}
      {!items.length && <span className={styles.empty}>{index === 0 ? "每个任务都会使用" : "连接图片或图片组，每次选一张"}</span>}
      {index === 0 && items.length < 10 && <button type="button" className={styles.addMaterial} disabled={props.disabled} onClick={props.onAddCommon} aria-label="添加公共参考"><Plus size={14} /></button>}
    </div>
  </div>;
  return <section className={styles.panel} aria-label="批量参考组合">
    <div className={styles.heading}><span>参考组合</span>
      <ToggleGroup type="single" value={props.mode} disabled={props.disabled} onValueChange={(value) => { if (value === "all" || value === "paired") props.onMode(value); }} className={styles.modes} aria-label="组合方式">
        <ToggleGroupItem value="all">全部组合</ToggleGroupItem><ToggleGroupItem value="paired">顺序配对</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div className={styles.rows}>{row("公共参考", props.common, 0)}{props.groups.map((group, index) => row(group.name, group.items, index + 1))}</div>
    <div className={styles.footer}>
      <button type="button" className={styles.addGroup} disabled={props.disabled || props.groups.length >= 5} onClick={props.onAddGroup}><Plus size={12} />添加素材组</button>
      <span aria-live="polite">{props.total > 0 ? `${props.total} 组 · 共 ${props.total * props.count} 个任务` : "连接素材后开始"}</span>
    </div>
    {props.preview.length > 0 && <details className={styles.preview}>
      <summary>查看组合{props.total > props.preview.length ? " · 前6组" : ""}</summary>
      <div className={styles.previewRows}>{props.preview.map((combination) => <div className={styles.previewRow} key={combination.key}>
        <span>组合 {combination.index + 1}</span>
        <div>{combination.items.map((item, index) => <span className={styles.previewImage} key={item.reference.id} title={`图 ${index + 1}：${item.reference.name}`}>
          <PrivateObjectImage src={item.previewUrl} alt={`图 ${index + 1}：${item.reference.name}`} /><small>{index + 1}</small>
        </span>)}</div>
      </div>)}</div>
    </details>}
    {props.error && <p className={styles.error} role="status">{props.error}</p>}
  </section>;
}
