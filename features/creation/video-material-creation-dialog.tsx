"use client";

import { useState } from "react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  VideoReference,
  VideoReferenceMediaType,
} from "@/features/creation/video-generation-options";
import { AudioLines, Check, Film, Image as ImageIcon, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

type VideoMaterialCreationDialogProps = Readonly<{
  open: boolean;
  references: readonly VideoReference[];
  creationAvailable: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (references: readonly VideoReference[]) => void;
}>;

function mediaTypeLabel(mediaType: VideoReferenceMediaType) {
  return mediaType === "image" ? "图片" : mediaType === "video" ? "视频" : "音频";
}

export function VideoMaterialCreationDialog({
  open,
  references,
  creationAvailable,
  onOpenChange,
  onCreate,
}: VideoMaterialCreationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  const selectedReferences = selectedIds
    .map((id) => references.find((reference) => reference.id === id))
    .filter((reference): reference is VideoReference => Boolean(reference));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="video-material-creation-dialog">
          <header className="reference-library-dialog-header">
            <div>
              <DialogTitle>创建素材</DialogTitle>
              <DialogDescription>
                只选择确实需要创建的素材；普通参考素材不会自动创建。
              </DialogDescription>
            </div>
            <button aria-label="关闭素材创建" onClick={() => onOpenChange(false)}>
              <X size={18} />
            </button>
          </header>

          <div className="video-material-creation-intro">
            <strong>提交后将逐个创建</strong>
            <span>历史素材会在视频提交前重新检查；失效时需要重新创建。</span>
          </div>

          <div className="video-material-creation-body">
            {references.length === 0 ? (
              <div className="video-material-creation-empty">
                <ImageIcon size={20} />
                <strong>还没有可选择的参考素材</strong>
                <span>先上传素材或从资产库加入，再选择需要创建的项目。</span>
              </div>
            ) : (
              <div className="video-material-creation-list" role="group" aria-label="选择需要创建的素材">
                {references.map((reference) => {
                  const selected = selectedIds.includes(reference.id);
                  return (
                    <button
                      type="button"
                      key={reference.id}
                      className={selected ? "selected" : ""}
                      aria-pressed={selected}
                      onClick={() => setSelectedIds((current) => current.includes(reference.id)
                        ? current.filter((id) => id !== reference.id)
                        : [...current, reference.id])}
                    >
                      <span className={`video-material-creation-preview ${reference.mediaType}`}>
                        {reference.mediaType === "image" ? (
                          <PrivateObjectImage src={reference.url} alt="" />
                        ) : reference.mediaType === "video" ? (
                          <video src={reference.url} muted preload="metadata" />
                        ) : (
                          <AudioLines size={20} />
                        )}
                        {reference.mediaType === "video" && <Film size={14} />}
                      </span>
                      <span className="video-material-creation-copy">
                        <strong>{reference.name}</strong>
                        <small>{mediaTypeLabel(reference.mediaType)} · 当前为普通参考</small>
                      </span>
                      <span className="video-material-creation-check" aria-hidden="true">
                        {selected && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="reference-library-dialog-footer video-material-creation-footer">
            <span>
              {selectedReferences.length > 0
                ? `已选 ${selectedReferences.length} 个，将按顺序创建`
                : "默认不创建任何素材"}
            </span>
            <div>
              <button className="secondary" onClick={() => onOpenChange(false)}>取消</button>
              <button
                className="primary"
                disabled={!creationAvailable || selectedReferences.length === 0}
                onClick={() => onCreate(selectedReferences)}
              >
                {creationAvailable ? `创建 ${selectedReferences.length} 个` : "接口待接入"}
              </button>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
