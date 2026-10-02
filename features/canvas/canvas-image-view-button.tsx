"use client";

import { useRef, useState } from "react";
import { useStore } from "@xyflow/react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageViewer, type ImageViewerItem } from "@/features/assets/image-viewer";
import { describeViewerGeneration } from "@/features/assets/image-viewer-details";
import { imageDownloadFilename } from "@/features/assets/image-download";
import type { GenerationJob } from "@/shared/contracts/generation";
import { privateImageUrls } from "@/shared/private-image-urls.mjs";
import assetStyles from "./canvas-asset-panel.module.css";

export function canvasGenerationViewerItems(jobs: readonly GenerationJob[]): ImageViewerItem[] {
  return jobs.flatMap((job) => job.outputs.map((output, index) => ({
    key: output.id,
    name: imageDownloadFilename(job.createdAt, index + 1, output.previewUrl),
    previewUrl: output.previewUrl,
    sourceUrl: privateImageUrls("asset", output.id).contentUrl,
    width: output.width,
    height: output.height,
    metadata: describeViewerGeneration(job.input, output),
  })));
}

/** The enclosing picture uses the asset panel's visualFrame hover rules. */
export function CanvasImageViewButton({ items, imageKey, disabled = false }: Readonly<{
  items: readonly ImageViewerItem[];
  imageKey: string;
  disabled?: boolean;
}>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const zoom = useStore((state) => state.transform[2]);
  const image = items.find((item) => item.key === imageKey);
  if (!image) return null;

  return <>
    <Button ref={triggerRef} type="button" variant="ghost" size="icon-sm"
      className={`${assetStyles.expand} nodrag nopan nowheel`} disabled={disabled}
      style={{ transform: `scale(${1 / zoom})`, transformOrigin: "top right", top: 5 / zoom, right: 5 / zoom }}
      aria-label={`查看大图 ${image.name}`} title="查看大图" aria-haspopup="dialog"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); setSelectedKey(imageKey); }}>
      <Maximize2 size={14} aria-hidden="true" />
    </Button>
    {selectedKey && <ImageViewer mode="canvas" items={items} selectedKey={selectedKey}
      returnFocusTo={triggerRef.current} onSelect={setSelectedKey} onClose={() => setSelectedKey(null)} />}
  </>;
}
