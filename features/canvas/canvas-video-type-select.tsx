"use client";

import { Film, GalleryHorizontal, Image, Layers, PersonStanding, Type, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VideoGenerationType, VideoModelId } from "@/shared/contracts/video-generation.mjs";
import type { CanvasVideoTypeOption } from "./canvas-video-material-modes.mjs";
import composerStyles from "./canvas-page.module.css";
import styles from "./canvas-video-generator-node.module.css";

const icons: Record<VideoGenerationType, LucideIcon> = {
  text_to_video: Type, image_to_video: Image, first_last_frame: GalleryHorizontal,
  reference_to_video: Layers, video_edit: Film, motion_control: PersonStanding,
};

export function CanvasVideoTypeSelect({ value, modelId, options, open, disabled, onOpenChange, onValueChange }: Readonly<{
  value: VideoGenerationType;
  modelId: VideoModelId;
  options: readonly CanvasVideoTypeOption[];
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (type: VideoGenerationType) => void;
}>) {
  return <Select open={open} onOpenChange={onOpenChange} value={value} disabled={disabled}
    onValueChange={(next) => {
      const option = options.find((item) => item.id === next && item.modelId === modelId);
      if (option?.enabled) onValueChange(option.id);
    }}>
    <SelectTrigger size="sm" className={`${composerStyles.modelSelect} ${styles.typeSelect}`} aria-label="生成类型"><SelectValue /></SelectTrigger>
    <SelectContent position="popper" align="start" className={`${composerStyles.modelMenu} nodrag nopan nowheel`}>
      {options.filter((item) => item.modelId === modelId).map((item) => {
        const Icon = icons[item.id];
        return <Tooltip key={item.id} delayDuration={150} disableHoverableContent>
          <TooltipTrigger asChild>
            {/* Disabled Radix items ignore pointer events; their wrapper still receives hover. */}
            <span className={styles.typeHintRow}>
              <SelectItem value={item.id} disabled={!item.enabled} aria-description={item.rule}>
                <Icon size={14} strokeWidth={1.5} className="text-foreground" aria-hidden="true" />{item.name}
              </SelectItem>
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" sideOffset={8} collisionPadding={12} hideArrow className={styles.typeRuleTooltip}>
            {item.rule}
          </TooltipContent>
        </Tooltip>;
      })}
    </SelectContent>
  </Select>;
}
