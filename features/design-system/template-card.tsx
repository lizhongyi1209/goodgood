"use client";

import { Workflow, Zap } from "lucide-react";
import styles from "./design-system.module.css";

export type TemplateCardItem = { id: string; name: string; cover: string; kind: "quick" | "workflow" };
export function TemplateCard({ item, onUse }: { item: TemplateCardItem; onUse: () => void }) {
  const Icon = item.kind === "quick" ? Zap : Workflow;
  return <button type="button" className={styles.templateCard} aria-label={`使用模板 ${item.name}`} onClick={onUse}><span className={styles.templateCover}>
    <img src={item.cover} alt="" /><span className={styles.templateMark}><Icon aria-hidden="true" /></span><span className={styles.templateUse}>使用模板</span>
  </span><span className={styles.templateName}>{item.name}</span></button>;
}
