"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import styles from "./design-system.module.css";

export const AccountRow = forwardRef<HTMLButtonElement, Omit<ComponentProps<"button">, "children"> & { name: string; balanceLabel: string; avatar?: ReactNode; credit?: ReactNode; compact?: boolean }>(function AccountRow({ name, balanceLabel, avatar, credit, compact = false, className, ...props }, ref) {
  return <button {...props} ref={ref} className={`${styles.accountRow} ${className ?? ""}`} type="button" aria-label={props["aria-label"] ?? `${name}，${balanceLabel}，打开账户菜单`} data-compact={compact || undefined}>
    <span className={styles.avatar}>{avatar ?? name.slice(0, 1)}</span>
    {!compact && <><span className={styles.accountName}>{name}</span>{credit}</>}
  </button>;
});
