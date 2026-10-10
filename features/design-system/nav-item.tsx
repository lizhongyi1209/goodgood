"use client";

import type { ReactNode } from "react";
import { Tooltip } from "./tooltip";
import styles from "./design-system.module.css";

export function NavItem({ label, icon, href, onClick, current = false, compact = false }: { label: string; icon: ReactNode; href?: string; onClick?: () => void; current?: boolean; compact?: boolean }) {
  const content = <><span className={styles.navIcon} aria-hidden="true">{icon}</span>{!compact && <span>{label}</span>}</>;
  const props = { className: styles.navItem, "aria-label": label, "aria-current": current ? "page" as const : undefined, "data-compact": compact || undefined };
  const control = href ? <a {...props} href={href} onClick={onClick}>{content}</a> : <button {...props} type="button" onClick={onClick}>{content}</button>;
  return compact ? <Tooltip label={label}>{control}</Tooltip> : control;
}
