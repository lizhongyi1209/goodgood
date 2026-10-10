"use client";

import { ArrowRight } from "lucide-react";
import { useId } from "react";
import styles from "./design-system.module.css";

export function CategoryTabs({ title, categories, value, onChange, onViewAll }: { title: string; categories: readonly string[]; value: string; onChange: (value: string) => void; onViewAll?: () => void }) {
  const heading = useId();
  return <div className={styles.categorySection}><div className={styles.sectionHeading}><h2 id={heading}>{title}</h2>{onViewAll && <button type="button" onClick={onViewAll}>查看全部<ArrowRight aria-hidden="true" /></button>}</div>
    <div className={styles.categoryTabs} role="group" aria-labelledby={heading}>{categories.map(category => <button type="button" key={category} aria-pressed={category === value} onClick={() => onChange(category)}>{category}</button>)}</div>
  </div>;
}
