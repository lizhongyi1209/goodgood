"use client";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KlingModelIcon } from "@/features/models/kling-model-icon";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import { VIDEO_GENERATION_MODELS, type VideoModelId, type SeedanceVideoLine } from "@/shared/contracts/video-generation.mjs";
import { CANVAS_SEEDANCE_LINES, isSeedanceVideoModel } from "@/shared/contracts/seedance-video-generation.mjs";
import styles from "./canvas-video-generator-node.module.css";

export function CanvasVideoModelSelect({ modelId, line = "standard", open, disabled, availableModels, onOpenChange, onChange }: Readonly<{
  modelId: VideoModelId; line?: SeedanceVideoLine; open: boolean; disabled: boolean; availableModels: readonly VideoModelId[];
  onOpenChange: (open: boolean) => void; onChange: (modelId: VideoModelId, line?: SeedanceVideoLine) => void;
}>) {
  const [previewLine, setPreviewLine] = useState<SeedanceVideoLine>(line);
  const seedance = isSeedanceVideoModel(modelId);
  const model = VIDEO_GENERATION_MODELS.find((item) => item.id === modelId)!;
  return <Popover open={open} onOpenChange={(next) => { if (next) setPreviewLine(line); onOpenChange(next); }}>
    <PopoverTrigger asChild data-slot="button"><Button type="button" variant="ghost" size="sm" disabled={disabled} className={styles.modelTrigger} aria-label="视频模型">
      {seedance ? <SeedanceModelIcon /> : <KlingModelIcon />}<span>{model.name}</span>
      {seedance && <span className={styles.modelLine}>{line === "backup" ? "HC" : "MAX"}</span>}<ChevronDown size={13} aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className={`${styles.modelPopover} nodrag nopan nowheel`} aria-label="选择视频模型"
      onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      {VIDEO_GENERATION_MODELS.filter((item) => !isSeedanceVideoModel(item.id)).map((item) => <button key={item.id} type="button" className={styles.modelOption} disabled={!availableModels.includes(item.id)} title={!availableModels.includes(item.id) ? "更新后端后可用" : undefined} aria-pressed={modelId === item.id}
        onClick={() => { onChange(item.id); onOpenChange(false); }}><KlingModelIcon /><span>{item.name}</span>{modelId === item.id && <Check size={14} aria-hidden="true" />}</button>)}
      <div className={styles.modelLineSection}>
        <ToggleGroup type="single" value={previewLine} disabled={!availableModels.some((item) => isSeedanceVideoModel(item))} aria-label="Seedance 线路" spacing={4} className={styles.modelLines}
          onValueChange={(value) => { if (!value) return; const next = value as SeedanceVideoLine; setPreviewLine(next); if (seedance) onChange(modelId, next); }}>
          {CANVAS_SEEDANCE_LINES.map((item) => <ToggleGroupItem key={item.id} value={item.id}>{item.name}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      {VIDEO_GENERATION_MODELS.filter((item) => isSeedanceVideoModel(item.id)).map((item) => <button key={item.id} type="button" className={styles.modelOption} aria-pressed={modelId === item.id && line === previewLine}
        onClick={() => { onChange(item.id, previewLine); onOpenChange(false); }}><SeedanceModelIcon /><span>{item.name}</span>{modelId === item.id && line === previewLine && <Check size={14} aria-hidden="true" />}</button>)}
    </PopoverContent>
  </Popover>;
}
