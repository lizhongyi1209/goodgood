"use client";

import { useRef, useState } from "react";
import { Clock3, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { CanvasVideoGenerationDraft } from "@/shared/contracts/video-generation.mjs";
import { canvasVideoStoryboardProblem, canvasVideoStoryboardResize, canvasVideoStoryboardSceneSeconds, canvasVideoStoryboardShots } from "./canvas-video-storyboard.mjs";
import styles from "./canvas-video-generator-node.module.css";

function DurationControl({ value, min, max, disabled, label, total = false, onChange }: Readonly<{
  value: number; min: number; max: number; disabled: boolean; label: string; total?: boolean; onChange: (value: number) => void;
}>) {
  return <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className={total ? styles.totalDuration : styles.sceneDuration}
        disabled={disabled} aria-label={label + "，" + value + "秒"}>
        {total && <Clock3 size={14} strokeWidth={1.5} aria-hidden="true" />}{value}s
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" sideOffset={8} collisionPadding={16} className={styles.durationPopover}
      onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
      <h3>时长设置</h3>
      <div className={styles.durationRow}><span>{label}</span><output className={styles.durationValue}>{value}s</output></div>
      <Slider className={styles.durationSlider} aria-label={label} value={[value]} min={min} max={max} step={1}
        disabled={disabled || min === max} onValueChange={([seconds]) => { if (seconds !== undefined) onChange(seconds); }} />
    </PopoverContent>
  </Popover>;
}

/** Local edits apply only on confirmation; closing discards this opening's draft. */
export function CanvasVideoStoryboardDialog({ id, draft, connectedText, onApply, onCancel }: Readonly<{
  id: string; draft: CanvasVideoGenerationDraft; connectedText: string;
  onApply: (patch: Partial<CanvasVideoGenerationDraft>) => void; onCancel: () => void;
}>) {
  const [enabled, setEnabled] = useState(true);
  const [duration, setDuration] = useState(Math.min(15, Math.max(3, draft.duration, draft.shots.length)));
  const [shots, setShots] = useState(() => draft.shots.length ? canvasVideoStoryboardResize(draft.shots, duration)
    : [{ seconds: Math.floor(duration / 2), text: draft.prompt }, { seconds: duration - Math.floor(duration / 2), text: "" }]);
  const [interacted, setInteracted] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const effective = canvasVideoStoryboardShots(shots, connectedText);
  const problem = enabled ? canvasVideoStoryboardProblem(shots, duration, connectedText) : null;
  const resize = (seconds: number) => { setDuration(seconds); setShots((current) => canvasVideoStoryboardResize(current, seconds)); };
  const sceneSeconds = (index: number, seconds: number) => {
    if (shots.length === 1) resize(seconds);
    else setShots((current) => canvasVideoStoryboardSceneSeconds(current, index, seconds, duration));
  };
  const add = () => setShots((current) => {
    if (current.length >= Math.min(6, duration)) return current;
    const donor = current.findIndex((shot) => shot.seconds > 1);
    return [...current.map((shot, index) => index === donor ? { ...shot, seconds: shot.seconds - 1 } : shot), { seconds: 1, text: "" }];
  });
  const remove = (index: number) => setShots((current) => {
    if (current.length <= 1 || !current[index]) return current;
    const remaining = current.filter((_, position) => position !== index);
    const recipient = Math.max(0, index - 1);
    return remaining.map((shot, position) => position === recipient ? { ...shot, seconds: shot.seconds + current[index].seconds } : shot);
  });
  const move = (from: number, to: number) => setShots((current) => {
    if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
    const next = [...current]; const [scene] = next.splice(from, 1); next.splice(to, 0, scene); return next;
  });

  return <DialogContent className={styles.storyboardDialog + " nodrag nopan nowheel"} overlayClassName={styles.storyboardOverlay} showCloseButton={false}
    onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}
    onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById(id + "-trigger")?.focus(); }}>
    <header className={styles.storyboardHeader}>
      <DialogTitle>自定义分镜</DialogTitle>
      <DialogDescription className="sr-only">设置场景描述和时长，确定后应用。</DialogDescription>
      <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="启用自定义分镜" />
    </header>
    <div className={styles.storyboardBody} data-disabled={!enabled || undefined}>
      {connectedText.trim() && <details className={styles.storyboardContext}>
        <summary>连接文本 · 场景1</summary><p>{connectedText}</p>
      </details>}
      <div className={styles.shots}>
        {shots.map((shot, index) => <section className={styles.scene} key={index} aria-label={"场景 " + (index + 1)}
          onDragOver={(event) => { if (enabled && dragIndex.current !== null) event.preventDefault(); }}
          onDrop={(event) => { if (enabled && dragIndex.current !== null) { event.preventDefault(); move(dragIndex.current, index); dragIndex.current = null; } }}>
          <div className={styles.sceneHeader}>
            <div className={styles.sceneName}>
              <button type="button" id={id + "-move-" + index} className={styles.sceneMove} disabled={!enabled} draggable={enabled} aria-label={"移动场景 " + (index + 1)}
                title="拖动排序；Alt＋方向键移动" onDragStart={(event) => { dragIndex.current = index; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }}
                onDragEnd={() => { dragIndex.current = null; }} onKeyDown={(event) => {
                  if (event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault(); const next = index + (event.key === "ArrowUp" ? -1 : 1);
                    if (next >= 0 && next < shots.length) { move(index, next); requestAnimationFrame(() => document.getElementById(id + "-move-" + next)?.focus()); }
                  }
                }}><GripVertical size={13} aria-hidden="true" /></button>
              <label htmlFor={id + "-scene-" + index}>场景 {index + 1}</label>
            </div>
            <button type="button" className={styles.sceneRemove} disabled={!enabled || shots.length === 1}
              aria-label={"删除场景 " + (index + 1)} onClick={() => remove(index)}><Trash2 size={14} strokeWidth={1.5} aria-hidden="true" /></button>
          </div>
          <div className={styles.sceneCard}>
            <textarea id={id + "-scene-" + index} disabled={!enabled} placeholder="描述这个场景…" value={shot.text} maxLength={512} rows={3}
              onBlur={() => setInteracted(true)} onChange={(event) => setShots((current) => current.map((item, position) => position === index ? { ...item, text: event.target.value } : item))} />
            <div className={styles.sceneCardFooter}>
              <DurationControl value={shot.seconds} min={shots.length === 1 ? 3 : 1} max={shots.length === 1 ? 15 : duration - shots.length + 1}
                disabled={!enabled} label={"场景 " + (index + 1) + " 时长"} onChange={(seconds) => sceneSeconds(index, seconds)} />
              {(effective[index]?.text.length ?? 0) >= 450 && <span className={styles.shotLength} data-invalid={(effective[index]?.text.length ?? 0) > 512 || undefined}>
                {effective[index]?.text.length ?? 0} / 512
              </span>}
            </div>
          </div>
        </section>)}
      </div>
      <Button type="button" variant="ghost" className={styles.shotAdd} disabled={!enabled || shots.length >= Math.min(6, duration)} onClick={add}>
        <Plus size={15} strokeWidth={1.5} aria-hidden="true" />添加场景 {shots.length + 1}
      </Button>
    </div>
    {problem && interacted && <p className={styles.storyboardNotice} role="status">{problem}</p>}
    <footer className={styles.storyboardFooter}>
      <DurationControl value={duration} min={Math.max(3, shots.length)} max={15} disabled={!enabled} label="总时长" total onChange={resize} />
      <div className={styles.storyboardActions}>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>取消</Button>
        <Button type="button" size="sm" className={styles.storyboardConfirm} disabled={Boolean(problem)} onClick={() => onApply({
          duration, multiShot: true, shots: enabled ? shots.map((shot) => ({ ...shot, text: shot.text.trim() })) : [],
        })}>确定</Button>
      </div>
    </footer>
  </DialogContent>;
}
