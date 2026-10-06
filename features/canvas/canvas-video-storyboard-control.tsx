"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clapperboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CanvasVideoGenerationDraft } from "@/shared/contracts/video-generation.mjs";
import { CanvasVideoStoryboardDialog } from "./canvas-video-storyboard-dialog";
import { CANVAS_VIDEO_CAMERA_REFERENCES, canvasVideoCameraDescription, canvasVideoCameraPrompt } from "./canvas-video-storyboard.mjs";
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
  const mode = custom ? "custom" : single ? "single" : "smart";
  const promptLines = draft.prompt.split(/\r?\n/).map((line) => line.trim());
  const camera = single ? CANVAS_VIDEO_CAMERA_REFERENCES.find((item) => promptLines.includes(item.text))?.id ?? "none" : "";
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
          aria-label={single ? "分镜：单镜头" : custom ? `分镜：${draft.shots.length} 个场景` : "分镜：智能分镜"}>
          <Clapperboard size={14} strokeWidth={1.5} aria-hidden="true" />
          {single ? "单镜头" : custom ? `分镜 · ${draft.shots.length}` : "智能分镜"}<ChevronDown size={13} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} collisionPadding={16}
        className={styles.storyboardMenu + " nodrag nopan nowheel"}
        onCloseAutoFocus={(event) => { if (openingDialog.current) { event.preventDefault(); openingDialog.current = false; } }}>
        <DropdownMenuRadioGroup value={mode} onValueChange={() => {
          if (!disabled) onApply({ prompt: canvasVideoCameraDescription(draft.prompt), multiShot: true, shots: [] });
        }}>
          <DropdownMenuRadioItem value="smart" disabled={disabled}>智能分镜</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset disabled={disabled}>
            {single && <Check className="absolute left-2 size-3.5" aria-hidden="true" />}单镜头
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent sideOffset={6} collisionPadding={16} className={styles.storyboardMenu + " nodrag nopan nowheel"}>
              <DropdownMenuRadioGroup value={camera} onValueChange={(value) => {
                if (disabled) return;
                if (value === "none") onApply({ prompt: canvasVideoCameraDescription(draft.prompt), multiShot: false, shots: [] });
                else chooseReference(value);
              }}>
                <DropdownMenuRadioItem value="none" disabled={disabled}>不指定运镜</DropdownMenuRadioItem>
                {CANVAS_VIDEO_CAMERA_REFERENCES.map((item) => <DropdownMenuRadioItem key={item.id} value={item.id}
                  disabled={disabled || canvasVideoCameraPrompt(draft.prompt, item.id, connectedText) === null}>{item.name}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem inset onSelect={() => {
          if (disabled) return;
          openingDialog.current = true; onOpenChange(false); setSession((current) => current + 1); setDialogOpen(true);
        }}>{custom && <Check className="absolute left-2 size-3.5" aria-hidden="true" />}自定义分镜</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <CanvasVideoStoryboardDialog key={session} id={id} draft={draft} connectedText={connectedText}
      onCancel={() => setDialogOpen(false)} onApply={(patch) => {
        if (!disabled) onApply(patch.multiShot && patch.shots?.length === 0 ? { ...patch, prompt: canvasVideoCameraDescription(draft.prompt) } : patch);
        setDialogOpen(false);
      }} />
  </Dialog>;
}
