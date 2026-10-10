"use client";

import { ArrowUp, LoaderCircle, Square } from "lucide-react";
import type { ComposerMode } from "./mode-toggle";
import styles from "./design-system.module.css";

export function SendButton({ mode, disabled, busy = false, stopping = false, onClick }: { mode: ComposerMode; disabled?: boolean; busy?: boolean; stopping?: boolean; onClick?: () => void }) {
  const label = stopping ? "停止" : mode === "chat" ? "发送" : "生成";
  return <button type={onClick ? "button" : "submit"} className={styles.sendButton} aria-label={label} aria-busy={busy || undefined} disabled={disabled || busy} onClick={onClick}>
    {stopping ? <Square aria-hidden="true" fill="currentColor" /> : busy ? <LoaderCircle aria-hidden="true" className={styles.spin} /> : <ArrowUp aria-hidden="true" />}
  </button>;
}
