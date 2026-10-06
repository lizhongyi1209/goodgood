"use client";

import { useEffect, useState } from "react";
import { PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIDEO_GENERATION_MODELS, VIDEO_GENERATION_COUNTS, type CanvasVideoGenerationDraft, type VideoGenerationCount } from "@/shared/contracts/video-generation.mjs";
import type { CanvasVideoParameterVisibility } from "./canvas-video-material-modes.mjs";
import composerStyles from "./canvas-page.module.css";
import styles from "./canvas-video-generator-node.module.css";

function Options({ name, value, choices, disabled, onChange }: Readonly<{
  name: string;
  value: string;
  choices: readonly { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}>) {
  return <section className={composerStyles.settingsSection}>
    <span className={composerStyles.settingsLabel}>{name}</span>
    <ToggleGroup type="single" spacing={8} value={value} disabled={disabled} aria-label={name}
      className={composerStyles.resolutionGroup} onValueChange={(next) => { if (next) onChange(next); }}>
      {choices.map((choice) => <ToggleGroupItem key={choice.value} value={choice.value} className={composerStyles.resolutionOption}>{choice.label}</ToggleGroupItem>)}
    </ToggleGroup>
  </section>;
}

export function CanvasVideoGeneratorSettings({ id, draft, visibility, disabled, countEnabled, onChange }: Readonly<{
  id: string;
  draft: CanvasVideoGenerationDraft;
  visibility: CanvasVideoParameterVisibility;
  disabled: boolean;
  countEnabled: boolean;
  onChange: (patch: Partial<CanvasVideoGenerationDraft>) => void;
}>) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const motion = draft.type === "motion_control";
  const model = VIDEO_GENERATION_MODELS.find((item) => item.id === draft.modelId)!;

  useEffect(() => {
    if (!panel) return;
    const trigger = document.getElementById(`${id}-trigger`);
    if (!trigger) return;
    let frame = 0;
    let previousHeight = -1;
    const fit = () => {
      const rect = trigger.getBoundingClientRect();
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      // Size from the anchor, never from Popper's observed content height.
      const availableHeight = Math.max(rect.top - viewportTop - 24, viewportTop + viewportHeight - rect.bottom - 24);
      const height = Math.max(0, Math.floor(Math.min(560, viewportHeight - 24, availableHeight)));
      if (height !== previousHeight) {
        panel.style.setProperty("--video-settings-available-height", `${height}px`);
        previousHeight = height;
      }
      frame = window.requestAnimationFrame(fit);
    };
    frame = window.requestAnimationFrame(fit);
    return () => window.cancelAnimationFrame(frame);
  }, [id, panel]);

  return <PopoverContent ref={setPanel} id={id} side="bottom" align="start" sideOffset={12} collisionPadding={12}
    className={`${composerStyles.settingsPanel} ${styles.settingsPopover} nodrag nopan nowheel`} aria-label="视频参数"
    onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
    <h2 className={composerStyles.settingsTitle}>视频参数</h2>
    <Options name="清晰度" value={draft.resolution} choices={model.resolutions.map((value) => ({ value, label: value === "4k" ? "4K" : value }))}
      disabled={disabled} onChange={(resolution) => onChange({ resolution: resolution as CanvasVideoGenerationDraft["resolution"] })} />
    {visibility.aspectRatio && <section className={composerStyles.settingsSection}>
        <span className={composerStyles.settingsLabel}>宽高比</span>
        <ToggleGroup type="single" spacing={8} value={draft.aspectRatio} disabled={disabled}
          className={`${composerStyles.ratioGroup} ${styles.ratioGroup}`} aria-label="宽高比"
          onValueChange={(aspectRatio) => { if (aspectRatio) onChange({ aspectRatio: aspectRatio as CanvasVideoGenerationDraft["aspectRatio"] }); }}>
          {[{ value: "16:9", width: 24, height: 13.5 }, { value: "9:16", width: 13.5, height: 24 }, { value: "1:1", width: 19, height: 19 }].map((ratio) =>
            <ToggleGroupItem key={ratio.value} value={ratio.value} className={composerStyles.ratioOption} aria-label={`宽高比 ${ratio.value}`}>
              <span className={composerStyles.ratioGlyph} style={{ width: ratio.width, height: ratio.height }} aria-hidden="true" />
              <span>{ratio.value}</span>
            </ToggleGroupItem>)}
        </ToggleGroup>
      </section>}
    {visibility.duration && <section className={composerStyles.settingsSection}>
        <div className={styles.durationRow}>
          <span className={composerStyles.settingsLabel}>时长</span>
          <output className={styles.durationValue}>{draft.duration} 秒</output>
        </div>
        <Slider className={`${styles.durationSlider} nodrag nopan nowheel`} aria-label="视频时长"
          value={[draft.duration]} min={3} max={15} step={1} disabled={disabled}
          onValueChange={([duration]) => { if (duration !== undefined) onChange({ duration }); }} />
      </section>}
    {motion && <Options name="角色朝向" value={draft.characterOrientation} choices={[{ value: "video", label: "跟随视频" }, { value: "image", label: "保持图片" }]}
      disabled={disabled} onChange={(characterOrientation) => onChange({ characterOrientation: characterOrientation as "video" | "image" })} />}
    <Options name="生成数量" value={String(draft.count ?? 1)} choices={VIDEO_GENERATION_COUNTS.map((count) => ({ value: String(count), label: String(count) }))}
      disabled={disabled || !countEnabled} onChange={(count) => onChange({ count: Number(count) as VideoGenerationCount })} />
    {visibility.audio && <Options name="音频" value={draft.audio}
      choices={[{ value: "off", label: "静音" }, ...(motion || draft.type === "video_edit" ? [{ value: "original", label: "保留原声" }] : [{ value: "native", label: "生成音频" }])]}
      disabled={disabled} onChange={(audio) => onChange({ audio: audio as CanvasVideoGenerationDraft["audio"] })} />}
  </PopoverContent>;
}
