"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VIDEO_GENERATION_MODELS, type CanvasVideoGenerationDraft, type VideoGenerationMedia } from "@/shared/contracts/video-generation.mjs";
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

export function CanvasVideoGeneratorSettings({ id, draft, media, disabled, onChange }: Readonly<{
  id: string;
  draft: CanvasVideoGenerationDraft;
  media: readonly VideoGenerationMedia[];
  disabled: boolean;
  onChange: (patch: Partial<CanvasVideoGenerationDraft>) => void;
}>) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const motion = draft.type === "motion_control";
  const referenceVideo = media.some((item) => item.role === "feature_video");
  const inheritedRatio = media.some((item) => ["first_frame", "feature_video", "base_video"].includes(item.role));
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
    <Options name="分辨率" value={draft.resolution} choices={model.resolutions.map((value) => ({ value, label: value === "4k" ? "4K" : value }))}
      disabled={disabled} onChange={(resolution) => onChange({ resolution: resolution as CanvasVideoGenerationDraft["resolution"] })} />
    {!motion && <>
      <section className={composerStyles.settingsSection}>
        <span className={composerStyles.settingsLabel}>宽高比</span>
        <ToggleGroup type="single" spacing={8} value={draft.aspectRatio} disabled={disabled || inheritedRatio}
          className={`${composerStyles.ratioGroup} ${styles.ratioGroup}`} aria-label="宽高比"
          onValueChange={(aspectRatio) => { if (aspectRatio) onChange({ aspectRatio: aspectRatio as CanvasVideoGenerationDraft["aspectRatio"] }); }}>
          {[{ value: "16:9", width: 24, height: 13.5 }, { value: "9:16", width: 13.5, height: 24 }, { value: "1:1", width: 19, height: 19 }].map((ratio) =>
            <ToggleGroupItem key={ratio.value} value={ratio.value} className={composerStyles.ratioOption} aria-label={`宽高比 ${ratio.value}`}>
              <span className={composerStyles.ratioGlyph} style={{ width: ratio.width, height: ratio.height }} aria-hidden="true" />
              <span>{ratio.value}</span>
            </ToggleGroupItem>)}
        </ToggleGroup>
      </section>
      <section className={composerStyles.settingsSection}>
        <div className={styles.durationRow}>
          <span className={composerStyles.settingsLabel}>时长</span>
          <output className={styles.durationValue}>{draft.duration} 秒</output>
        </div>
        <Slider className={`${styles.durationSlider} nodrag nopan nowheel`} aria-label="视频时长"
          value={[draft.duration]} min={3} max={15} step={1} disabled={disabled}
          onValueChange={([duration]) => { if (duration !== undefined) onChange({ duration }); }} />
      </section>
    </>}
    {motion && <Options name="角色朝向" value={draft.characterOrientation} choices={[{ value: "video", label: "跟随视频" }, { value: "image", label: "保持图片" }]}
      disabled={disabled} onChange={(characterOrientation) => onChange({ characterOrientation: characterOrientation as "video" | "image" })} />}
    <Options name="音频" value={referenceVideo ? "off" : draft.audio}
      choices={[{ value: "off", label: "静音" }, ...(motion || draft.type === "video_edit" ? [{ value: "original", label: "保留原声" }] : [{ value: "native", label: "生成音频" }])]}
      disabled={disabled || referenceVideo} onChange={(audio) => onChange({ audio: audio as CanvasVideoGenerationDraft["audio"] })} />
    {!motion && <Options name="镜头" value={draft.shots.length ? "manual" : referenceVideo || draft.multiShot ? "multi" : "single"}
      choices={[{ value: "single", label: "单镜头" }, { value: "multi", label: "自动多镜头" }, { value: "manual", label: "手动分镜" }]}
      disabled={disabled || referenceVideo || draft.type === "video_edit"}
      onChange={(value) => onChange({ multiShot: value !== "single", shots: value === "manual" ? [{ seconds: draft.duration, text: "" }] : [] })} />}
    {draft.shots.length > 0 && <section className={`${composerStyles.settingsSection} ${styles.shots}`} aria-label="手动分镜">
      {draft.shots.map((shot, index) => <div className={styles.shot} key={index}>
        <label>镜头 {index + 1}<input type="number" aria-label={`镜头 ${index + 1} 时长`} min={1} max={15} value={shot.seconds} disabled={disabled}
          onChange={(event) => onChange({ shots: draft.shots.map((item, position) => position === index ? { ...item, seconds: Math.max(1, Math.min(15, Number(event.target.value) || 1)) } : item) })} /></label>
        <textarea aria-label={`镜头 ${index + 1} 描述`} placeholder="描述画面和动作" maxLength={512} value={shot.text} readOnly={disabled}
          onChange={(event) => onChange({ shots: draft.shots.map((item, position) => position === index ? { ...item, text: event.target.value } : item) })} />
        <button type="button" disabled={disabled} aria-label={`移除镜头 ${index + 1}`} onClick={() => onChange({ shots: draft.shots.filter((_, position) => position !== index) })}><X size={13} /></button>
      </div>)}
      <button type="button" disabled={disabled || draft.shots.length >= 6} className={styles.shotAdd}
        onClick={() => onChange({ shots: [...draft.shots, { seconds: 1, text: "" }] })}><Plus size={13} />添加镜头</button>
    </section>}
  </PopoverContent>;
}
