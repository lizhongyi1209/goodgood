"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CanvasVideoGenerationDraft } from "@/shared/contracts/video-generation.mjs";
import { CanvasVideoStoryboardDialog } from "./canvas-video-storyboard-dialog";
import { CANVAS_VIDEO_CAMERA_REFERENCES, canvasVideoCameraPrompt } from "./canvas-video-storyboard.mjs";
import composerStyles from "./canvas-page.module.css";
import styles from "./canvas-video-generator-node.module.css";

export function CanvasVideoStoryboardControl({ id, draft, connectedText, disabled, open, onOpenChange, onApply }: Readonly<{
  id: string; draft: CanvasVideoGenerationDraft; connectedText: string; disabled: boolean; open: boolean;
  onOpenChange: (open: boolean) => void; onApply: (patch: Partial<CanvasVideoGenerationDraft>) => void;
}>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [session, setSession] = useState(0);
  const openingDialog = useRef(false);
  const custom = draft.shots.length > 0;
  const single = !draft.multiShot && !custom;
  useEffect(() => { if (disabled) setDialogOpen(false); }, [disabled]);
  const chooseReference = (referenceId: string) => {
    const prompt = canvasVideoCameraPrompt(draft.prompt, referenceId, connectedText);
    if (!disabled && prompt !== null) onApply({ prompt, multiShot: false, shots: [] });
  };

  return <Dialog open={dialogOpen && !disabled} onOpenChange={setDialogOpen}>
    <DropdownMenu open={open && !disabled} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button id={id + "-trigger"} type="button" variant="ghost" size="sm" disabled={disabled}
          className={`${composerStyles.settingsTrigger} ${styles.storyboardTrigger}`} data-active={single || custom || undefined}
          aria-label={single ? "分镜：单镜头" : custom ? `分镜：${draft.shots.length} 个场景` : "分镜设置"}>
          <Clapperboard size={14} strokeWidth={1.5} aria-hidden="true" />
          {single ? "单镜头" : custom ? `分镜 · ${draft.shots.length}` : "分镜"}<ChevronDown size={13} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} collisionPadding={16}
        className={styles.storyboardMenu + " nodrag nopan nowheel"}
        onCloseAutoFocus={(event) => { if (openingDialog.current) { event.preventDefault(); openingDialog.current = false; } }}>
        <DropdownMenuCheckboxItem checked={single} disabled={disabled} onCheckedChange={(checked) => {
          if (!disabled) onApply({ multiShot: !checked, shots: [] });
        }}>单镜头</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>运镜参考</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent sideOffset={6} collisionPadding={16} className={styles.storyboardMenu + " nodrag nopan nowheel"}>
              <DropdownMenuLabel>添加到提示词</DropdownMenuLabel>
              {CANVAS_VIDEO_CAMERA_REFERENCES.map((item) => <DropdownMenuItem key={item.id}
                disabled={disabled || canvasVideoCameraPrompt(draft.prompt, item.id, connectedText) === null}
                onSelect={() => chooseReference(item.id)}>{item.name}</DropdownMenuItem>)}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem inset onSelect={() => {
          if (disabled) return;
          openingDialog.current = true; onOpenChange(false); setSession((current) => current + 1); setDialogOpen(true);
        }}>自定义分镜</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <CanvasVideoStoryboardDialog key={session} id={id} draft={draft} connectedText={connectedText}
      onCancel={() => setDialogOpen(false)} onApply={(patch) => { if (!disabled) onApply(patch); setDialogOpen(false); }} />
  </Dialog>;
}
