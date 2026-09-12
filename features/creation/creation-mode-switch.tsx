"use client";

import { ImageIcon, Video } from "lucide-react";
import type { CreationMode } from "@/features/creation/video-generation-options";

export function CreationModeSwitch({
  value,
  onChange,
}: Readonly<{
  value: CreationMode;
  onChange: (mode: CreationMode) => void;
}>) {
  return (
    <div className="creation-mode-row">
      <div className="creation-mode-switch" role="tablist" aria-label="创作类型">
        <button
          type="button"
          role="tab"
          aria-selected={value === "image"}
          className={value === "image" ? "selected" : ""}
          onClick={() => onChange("image")}
        >
          <ImageIcon size={14} />
          图片
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "video"}
          className={value === "video" ? "selected" : ""}
          onClick={() => onChange("video")}
        >
          <Video size={14} />
          视频
        </button>
      </div>
    </div>
  );
}

