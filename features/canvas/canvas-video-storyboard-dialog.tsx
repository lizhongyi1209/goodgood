"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CanvasVideoGenerationDraft } from "@/shared/contracts/video-generation.mjs";
import { canvasVideoStoryboardProblem, canvasVideoStoryboardShots } from "./canvas-video-storyboard.mjs";
import composerStyles from "./canvas-page.module.css";
import styles from "./canvas-video-generator-node.module.css";

type Mode = "single" | "auto" | "manual";

/** Mounted per opening so dismissing never applies the editor's local draft. */
export function CanvasVideoStoryboardDialog({ id, draft, connectedText, automaticOnly, onApply, onCancel }: Readonly<{
  id: string;
  draft: CanvasVideoGenerationDraft;
  connectedText: string;
  automaticOnly: boolean;
  onApply: (patch: Partial<CanvasVideoGenerationDraft>) => void;
  onCancel: () => void;
}>) {
  const [mode, setMode] = useState<Mode>(automaticOnly ? "auto" : draft.shots.length ? "manual" : draft.multiShot ? "auto" : "single");
  const [shots, setShots] = useState(() => draft.shots.length ? draft.shots.map((shot) => ({ ...shot })) : [{ seconds: draft.duration, text: draft.prompt }]);
  const total = shots.reduce((sum, shot) => sum + shot.seconds, 0);
  const effective = canvasVideoStoryboardShots(shots, connectedText);
  const problem = mode === "manual" ? canvasVideoStoryboardProblem(shots, draft.duration, connectedText) : null;
  const addShot = () => setShots((current) => {
    if (current.length >= Math.min(6, draft.duration)) return current;
    const donor = current.findIndex((shot) => shot.seconds > 1);
    return [...current.map((shot, index) => index === donor ? { ...shot, seconds: shot.seconds - 1 } : shot), { seconds: 1, text: "" }];
  });
  const removeShot = (index: number) => setShots((current) => {
    if (current.length <= 1 || !current[index]) return current;
    const removed = current[index];
    const remaining = current.filter((_, position) => position !== index);
    const recipient = Math.max(0, index - 1);
    return remaining.map((shot, position) => position === recipient ? { ...shot, seconds: Math.min(15, shot.seconds + removed.seconds) } : shot);
  });
  const moveShot = (index: number, direction: -1 | 1) => setShots((current) => {
    if (index < 0 || index >= current.length || index + direction < 0 || index + direction >= current.length) return current;
    const next = [...current];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  });

  return <DialogContent className={`${styles.storyboardDialog} nodrag nopan nowheel`}
    overlayClassName={styles.storyboardOverlay} onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
    <header className={styles.storyboardHeader}>
      <DialogTitle>智能分镜</DialogTitle>
      <DialogDescription>设置每个镜头的时长和画面描述。</DialogDescription>
    </header>
    <ToggleGroup type="single" value={mode} spacing={8} aria-label="分镜方式" className={composerStyles.resolutionGroup}
      onValueChange={(value) => { if (value) setMode(value as Mode); }}>
      {[{ value: "single", label: "单镜头" }, { value: "auto", label: "自动分镜" }, { value: "manual", label: "手动分镜" }].map((item) =>
        <ToggleGroupItem key={item.value} value={item.value} disabled={automaticOnly && item.value !== "auto"}
          className={composerStyles.resolutionOption}>{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
    {mode === "manual" ? <>
      <div className={styles.storyboardSummary}>
        <span>{shots.length} 个镜头</span><output data-invalid={total !== draft.duration || undefined}>时长合计 {total} / {draft.duration} 秒</output>
      </div>
      <div className={styles.storyboardBody}>
        {connectedText.trim() && <section className={styles.storyboardContext}>
          <span>连接文本 · 合入首个镜头</span><p>{connectedText}</p>
        </section>}
        <div className={styles.shots}>
          {shots.map((shot, index) => <section className={styles.shot} key={index} aria-label={`镜头 ${index + 1}`}>
            <div className={styles.shotHeader}>
              <label htmlFor={`${id}-shot-${index}`}>镜头 {index + 1}</label>
              <div className={styles.shotActions}>
                <label className={styles.shotDuration}><input type="number" aria-label={`镜头 ${index + 1} 时长`} min={1} max={15} step={1} value={shot.seconds}
                  onChange={(event) => setShots((current) => current.map((item, position) => position === index
                    ? { ...item, seconds: Math.max(1, Math.min(15, Math.trunc(Number(event.target.value)) || 1)) } : item))} /><span>秒</span></label>
                <button type="button" disabled={index === 0} aria-label={`上移镜头 ${index + 1}`} onClick={() => moveShot(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" disabled={index === shots.length - 1} aria-label={`下移镜头 ${index + 1}`} onClick={() => moveShot(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" disabled={shots.length === 1} aria-label={`删除镜头 ${index + 1}`} onClick={() => removeShot(index)}><Trash2 size={14} /></button>
              </div>
            </div>
            <textarea id={`${id}-shot-${index}`} placeholder="描述画面、动作和镜头变化…" maxLength={512} value={shot.text} rows={3}
              onChange={(event) => setShots((current) => current.map((item, position) => position === index ? { ...item, text: event.target.value } : item))} />
            <span className={styles.shotLength} data-invalid={(effective[index]?.text.length ?? 0) > 512 || undefined}>{effective[index]?.text.length ?? 0} / 512</span>
          </section>)}
        </div>
        <Button type="button" variant="ghost" size="sm" className={styles.shotAdd} disabled={shots.length >= Math.min(6, draft.duration)} onClick={addShot}>
          <Plus size={14} />添加镜头
        </Button>
      </div>
      {problem && <p className={styles.storyboardNotice} role="status">{problem}</p>}
    </> : <p className={styles.storyboardModeHint}>
      {mode === "auto" ? automaticOnly ? "参考视频将自动使用多镜头，继续在输入框描述画面和动作。" : "根据输入描述自动安排镜头，继续在输入框描述画面和动作。" : "保持一个连续镜头，在输入框描述画面和动作。"}
    </p>}
    <footer className={styles.storyboardFooter}>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>取消</Button>
      <Button type="button" size="sm" className={styles.storyboardConfirm} disabled={Boolean(problem)} onClick={() => onApply({
        multiShot: mode !== "single", shots: mode === "manual" ? shots.map((shot) => ({ ...shot, text: shot.text.trim() })) : [],
      })}>确定</Button>
    </footer>
  </DialogContent>;
}
