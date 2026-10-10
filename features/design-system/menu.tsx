"use client";

import type { ComponentProps, ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./design-system.module.css";

export function Menu({ trigger, children, align = "end", open, onOpenChange, label }: { trigger: ReactNode; children: ReactNode; align?: "start" | "center" | "end"; open?: boolean; onOpenChange?: (open: boolean) => void; label?: string }) {
  return <DropdownMenu open={open} onOpenChange={onOpenChange}>
    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
    <DropdownMenuContent align={align} className={styles.menu} aria-label={label} {...(label ? { "aria-labelledby": undefined } : {})}>{children}</DropdownMenuContent>
  </DropdownMenu>;
}

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem {...props} className={`${styles.menuItem} ${className ?? ""}`} />;
}
export function MenuSeparator() { return <DropdownMenuSeparator className={styles.menuSeparator} />; }
