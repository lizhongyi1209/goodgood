"use client";

import { useEffect, useRef, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { ModeToggle, type ComposerMode } from "./mode-toggle";
import { SendButton } from "./send-button";
import styles from "./design-system.module.css";

export function shouldSubmitComposer(event: { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number }) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229;
}
export type ComposerProps = { mode: ComposerMode; prompt: string; onPromptChange: (value: string) => void; onModeChange: (mode: ComposerMode) => void; onSubmit: () => void; materials?: ReactNode; showChat?: boolean; disabled?: boolean; busy?: boolean; notice?: ReactNode; dragActive?: boolean; onDragEnter?: (event: DragEvent<HTMLFormElement>) => void; onDragOver?: (event: DragEvent<HTMLFormElement>) => void; onDragLeave?: (event: DragEvent<HTMLFormElement>) => void; onDrop?: (event: DragEvent<HTMLFormElement>) => void; onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void };
export function Composer({ mode, prompt, onPromptChange, onModeChange, onSubmit, materials, showChat, disabled, busy, notice, dragActive, ...events }: ComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const node = textarea.current;
    if (!node) return;
    node.style.height = "auto";
    const computed = getComputedStyle(node);
    const maximum = Number.parseFloat(computed.maxHeight);
    node.style.height = `${Math.min(node.scrollHeight, maximum)}px`;
  }, [prompt]);
  const unavailable = disabled || !prompt.trim();
  return <form className={styles.composer} aria-label="开始创作" data-drag-active={dragActive || undefined} onDragEnter={events.onDragEnter} onDragOver={events.onDragOver} onDragLeave={events.onDragLeave} onDrop={events.onDrop} onSubmit={event => { event.preventDefault(); if (!unavailable && !busy) onSubmit(); }}>
    {materials && <div className={styles.materials} aria-label="参考素材">{materials}</div>}
    <textarea ref={textarea} className={styles.prompt} aria-label={mode === "video" ? "视频描述" : mode === "chat" ? "对话内容" : "画面描述"} placeholder={mode === "video" ? "描述你想创作的视频…" : mode === "chat" ? "想聊些什么？" : "描述你想创作的画面…"} rows={2} value={prompt} onChange={event => onPromptChange(event.target.value)} onPaste={events.onPaste} onKeyDown={event => {
      if (shouldSubmitComposer({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing, keyCode: event.nativeEvent.keyCode })) {
        event.preventDefault();
        if (!unavailable && !busy) onSubmit();
      }
    }} />
    <div className={styles.composerFooter}><ModeToggle value={mode} onChange={onModeChange} showChat={showChat} /><SendButton mode={mode} disabled={unavailable} busy={busy} /></div>
    {notice && <div className={styles.inlineNotice} role="status">{notice}</div>}
    {dragActive && <div className={styles.dropNotice}>松开即可添加</div>}
  </form>;
}
