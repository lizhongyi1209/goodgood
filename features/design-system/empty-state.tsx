import type { ReactNode } from "react";
import styles from "./design-system.module.css";

export function EmptyState({ icon, title, description, actions }: { icon: ReactNode; title: string; description: string; actions?: ReactNode }) {
  return <div className={styles.emptyState}><span className={styles.emptyIcon} aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p>{actions && <div>{actions}</div>}</div>;
}
