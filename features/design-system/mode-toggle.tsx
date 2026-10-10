"use client";

import { Image, MessageSquare, SquarePlay } from "lucide-react";
import { Tooltip } from "./tooltip";
import styles from "./design-system.module.css";

export type ComposerMode = "image" | "video" | "chat";
const modes = [{ value: "image", label: "图片", Icon: Image }, { value: "video", label: "视频", Icon: SquarePlay }, { value: "chat", label: "对话", Icon: MessageSquare }] as const;
export function ModeToggle({ value, onChange, showChat = false }: { value: ComposerMode; onChange: (mode: ComposerMode) => void; showChat?: boolean }) {
  return <div className={styles.modeToggle} role="group" aria-label="创作模式">{modes.filter(mode => mode.value !== "chat" || showChat).map(({ value: mode, label, Icon }) => <Tooltip key={mode} label={label}>
    <button type="button" aria-label={label} aria-pressed={value === mode} onClick={() => onChange(mode)}><Icon aria-hidden="true" /></button>
  </Tooltip>)}</div>;
}
