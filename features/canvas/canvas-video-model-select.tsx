"use client";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KlingModelIcon } from "@/features/models/kling-model-icon";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import { VIDEO_GENERATION_MODELS, type VideoModelId } from "@/shared/contracts/video-generation.mjs";
import { isSeedanceVideoModel } from "@/shared/contracts/seedance-video-generation.mjs";
import styles from "./canvas-video-generator-node.module.css";

export function CanvasVideoModelSelect({ modelId, open, disabled, availableModels, onOpenChange, onChange }: Readonly<{
  modelId: VideoModelId; open: boolean; disabled: boolean; availableModels: readonly VideoModelId[];
  onOpenChange: (open: boolean) => void; onChange: (modelId: VideoModelId) => void;
}>) {
  const seedance = isSeedanceVideoModel(modelId);
  const model = VIDEO_GENERATION_MODELS.find((item) => item.id === modelId)!;
  return <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild data-slot="button"><Button type="button" variant="ghost" size="sm" disabled={disabled} className={styles.modelTrigger} aria-label="视频模型">
      {seedance ? <SeedanceModelIcon /> : <KlingModelIcon />}<span>{model.name}</span>
      <ChevronDown size={13} aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className={`${styles.modelPopover} nodrag nopan nowheel`} aria-label="选择视频模型"
      onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      {VIDEO_GENERATION_MODELS.map((item) => <button key={item.id} type="button" className={styles.modelOption} disabled={!availableModels.includes(item.id)} title={!availableModels.includes(item.id) ? "更新后端后可用" : undefined} aria-pressed={modelId === item.id}
        onClick={() => { onChange(item.id); onOpenChange(false); }}>
        {isSeedanceVideoModel(item.id) ? <SeedanceModelIcon /> : <KlingModelIcon />}<span>{item.name}</span>{modelId === item.id && <Check size={14} aria-hidden="true" />}
      </button>)}
    </PopoverContent>
  </Popover>;
}
