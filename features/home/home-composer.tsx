"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Composer, ReferenceThumb, AddReferenceMenu, type ComposerMode, type ReferenceThumbItem } from "@/features/design-system";
import { useComposerFileDrop } from "@/features/creation/use-composer-file-drop";
import styles from "./home-page.module.css";

export type HomeComposerProps = { mode: ComposerMode; prompt: string; onPromptChange: (prompt: string) => void; onModeChange: (mode: ComposerMode) => void; onSubmit: () => void; references: readonly ReferenceThumbItem[]; referenceLimit: number; onFiles: (files: readonly File[]) => void; onLibrary: () => void; onLink?: (url: string) => Promise<void>; onRemove: (id: string) => void; onRetry: (id: string) => void; recent: readonly { id: string; name: string; url: string }[]; onRecent: (id: string) => void; showChat: boolean; busy: boolean; disabled: boolean; notice?: string };
export function HomeComposer(props: HomeComposerProps) {
  const [preview, setPreview] = useState<ReferenceThumbItem | null>(null), [intakeError, setIntakeError] = useState("");
  const previewFocus = useRef<HTMLElement | null>(null);
  const videoTextOnly = props.mode === "video";
  const intakeFiles = (files: readonly File[]) => {
    if (videoTextOnly) { setIntakeError("视频暂只支持文字描述"); return; }
    if (props.mode !== "chat") props.onFiles(files);
  };
  const fileDrop = useComposerFileDrop(intakeFiles);
  const notice = [videoTextOnly ? "视频暂只支持文字描述" : "", intakeError, props.notice].filter(Boolean).join(" · ");
  return <><Composer mode={props.mode} prompt={props.prompt} onPromptChange={props.onPromptChange} onModeChange={props.onModeChange} onSubmit={props.onSubmit} showChat={props.showChat} busy={props.busy} disabled={props.disabled} notice={notice} {...fileDrop} dragActive={videoTextOnly ? false : fileDrop.dragActive}
    onPaste={event => {
      if (props.mode === "chat") return;
      const files = Array.from(event.clipboardData.files);
      if (files.length) { event.preventDefault(); intakeFiles(files); return; }
      const value = event.clipboardData.getData("text/plain").trim();
      if (props.onLink && /^https?:\/\/\S+$/.test(value)) { event.preventDefault(); setIntakeError(""); void props.onLink(value).catch(error => setIntakeError(error instanceof Error ? error.message : "链接暂时无法读取，请重试。")); }
    }} materials={<>{props.references.map((item, index) => <ReferenceThumb key={item.id} item={item} ordinal={index + 1} onRemove={() => props.onRemove(item.id)} onRetry={() => props.onRetry(item.id)} onPreview={() => { previewFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPreview(item); }} />)}
      <AddReferenceMenu disabled={props.references.length >= props.referenceLimit || props.mode === "chat" || videoTextOnly} accept="image/jpeg,image/png,image/webp" onFiles={props.onFiles} onLibrary={props.onLibrary} onLink={props.onLink} recent={props.recent} onRecent={props.onRecent} />
    </>} />
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className={styles.previewDialog} onCloseAutoFocus={event => { event.preventDefault(); previewFocus.current?.focus(); }}>
      <DialogHeader><DialogTitle>{preview?.name}</DialogTitle><DialogDescription>参考素材预览</DialogDescription></DialogHeader>
      {preview?.mediaType === "video" ? <video src={preview.url} controls /> : preview?.mediaType === "audio" ? <audio src={preview.url} controls /> : preview && <img src={preview.url} alt={preview.name} />}
    </DialogContent></Dialog></>;
}
