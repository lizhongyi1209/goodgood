"use client";

import { FileImage, FileText, FileVideo, FileAudio, LoaderCircle, RotateCw, X } from "lucide-react";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "./attachment";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { PrivateObjectImage } from "./private-object-image";
import styles from "./input-attachment.module.css";

export type InputAttachmentProps = Readonly<{
  media: "image" | "text" | "video" | "audio";
  name: string; description?: string; url?: string; text?: string;
  state?: "ready" | "uploading" | "failed"; error?: string; disabled?: boolean;
  onPreview?: (trigger: HTMLButtonElement) => void;
  onRemove: () => void; onRetry?: () => void;
}>;
const icons = { image: FileImage, text: FileText, video: FileVideo, audio: FileAudio };
const labels = { image: "图片", text: "文本", video: "视频", audio: "音频" };

/** One file-card geometry and icon family across all composer inputs. */
export function InputAttachment({ media, name, description, url, text, state = "ready", error, disabled, onPreview, onRemove, onRetry }: InputAttachmentProps) {
  const Icon = icons[media];
  const content = <>
    <AttachmentMedia className={styles.icon}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{name}</AttachmentTitle>
      <AttachmentDescription>{state === "uploading" ? "上传中…" : state === "failed" ? "上传失败" : description ?? labels[media]}</AttachmentDescription>
    </AttachmentContent>
  </>;
  const buttonProps = { type: "button" as const, className: styles.trigger, "aria-label": `预览${labels[media]}：${name}`, title: error ?? name };
  return <Attachment size="xs" state={state === "failed" ? "error" : state === "uploading" ? "uploading" : "done"}
    className={styles.card} data-media={media} aria-busy={state === "uploading" || undefined}>
    {onPreview ? <button {...buttonProps} aria-haspopup="dialog" onClick={(event) => onPreview(event.currentTarget)}>{content}</button> :
      <Popover><PopoverTrigger asChild><button {...buttonProps}>{content}</button></PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={8} className={`${styles.preview} nodrag nopan nowheel`}>
          <p className={styles.previewName}><Icon size={14} aria-hidden="true" />{name}</p>
          {media === "text" ? <div className={styles.text}>{text || "还没有文本内容"}</div>
            : media === "image" && url ? <PrivateObjectImage src={url} alt={name} loading="eager" />
              : media === "video" && url ? <video src={url} controls playsInline preload="metadata" aria-label={name} />
                : media === "audio" && url ? <audio src={url} controls preload="metadata" aria-label={name} />
                  : <p className={styles.unavailable}>{error ?? (state === "uploading" ? "素材正在上传" : "预览暂不可用")}</p>}
        </PopoverContent>
      </Popover>}
    <AttachmentActions className={styles.actions}>
      {state === "uploading" && <LoaderCircle size={12} className={styles.loading} aria-label="上传中" />}
      {state === "failed" && onRetry && <AttachmentAction type="button" size="icon-xs" disabled={disabled} onClick={onRetry} aria-label={`重试上传：${name}`} title="重试"><RotateCw size={12} /></AttachmentAction>}
      <AttachmentAction type="button" size="icon-xs" disabled={disabled} onClick={onRemove} aria-label={`移除${labels[media]}：${name}`} title="移除"><X size={12} /></AttachmentAction>
    </AttachmentActions>
  </Attachment>;
}
