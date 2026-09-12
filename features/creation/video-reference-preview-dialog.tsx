"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AudioLines, CircleAlert, LoaderCircle, X } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import type { VideoReference } from "@/features/creation/video-generation-options";

type PreviewState = "loading" | "ready" | "failed";

export function VideoReferencePreviewStage({
  reference, state, onReady, onError, onRetry,
}: Readonly<{
  reference: VideoReference;
  state: PreviewState;
  onReady: () => void;
  onError: () => void;
  onRetry: () => void;
}>) {
  return (
    <div className="video-reference-preview-stage" aria-busy={state === "loading"}>
      {reference.mediaType === "image" ? (
        <PrivateObjectImage src={reference.url} alt={reference.name} loading="eager" onLoad={onReady} onError={onError} />
      ) : reference.mediaType === "video" ? (
        <video src={reference.url} aria-label={reference.name} controls playsInline preload="metadata" onLoadedMetadata={onReady} onError={onError} />
      ) : (
        <div className="video-reference-preview-audio">
          <AudioLines size={56} aria-hidden="true" />
          <audio src={reference.url} aria-label={reference.name} controls preload="metadata" onLoadedMetadata={onReady} onError={onError} />
        </div>
      )}
      {state === "loading" && (
        <div className="video-reference-preview-status" role="status"><LoaderCircle size={22} /><span>正在加载预览</span></div>
      )}
      {state === "failed" && (
        <div className="video-reference-preview-status failed" role="alert">
          <CircleAlert size={24} /><span>素材预览加载失败，素材已保留</span>
          <button type="button" onClick={onRetry}>重新加载</button>
        </div>
      )}
    </div>
  );
}

export function VideoReferencePreviewDialog({ reference, label, onClose, onReturnFocus }: Readonly<{
  reference: VideoReference;
  label: string;
  onClose: () => void;
  onReturnFocus: () => void;
}>) {
  const [state, setState] = useState<PreviewState>("loading");
  const [attempt, setAttempt] = useState(0);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="reference-preview-overlay" />
        <DialogPrimitive.Content className="video-reference-preview-dialog" aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}>
          <header className="video-reference-preview-header">
            <DialogTitle title={reference.name}>{label} · {reference.name}</DialogTitle>
            <DialogPrimitive.Close asChild>
              <button type="button" className="video-reference-preview-close" aria-label="关闭素材预览"><X size={18} /></button>
            </DialogPrimitive.Close>
          </header>
          <VideoReferencePreviewStage
            key={attempt}
            reference={reference}
            state={state}
            onReady={() => setState("ready")}
            onError={() => setState("failed")}
            onRetry={() => { setState("loading"); setAttempt((current) => current + 1); }}
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
