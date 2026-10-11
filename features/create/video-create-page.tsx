"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Download, Film, LoaderCircle, MoreHorizontal, Play, RefreshCw, WandSparkles, X } from "lucide-react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Menu, MenuItem, MenuSeparator } from "@/features/design-system";
import type { LocalVideoPreviewAvailability } from "@/features/creation/http-video-preview-boundary";
import {
  VIDEO_RATIO_OPTIONS,
  type VideoAspectRatio,
  type VideoGenerationMode,
  type VideoGenerationModelId,
  type VideoReference,
  type VideoResolution,
} from "@/features/creation/video-generation-options";
import { getVideoGenerationModel } from "@/features/creation/video-generation-options";
import type { VideoPreviewRun } from "@/features/creation/video-preview-runs";
import { useOfflineNotice } from "./use-offline-notice";
import styles from "./create-page.module.css";

type VideoModelOption = Readonly<{
  id: VideoGenerationModelId;
  catalogId?: string;
  name: string;
  description: string;
  resolutions: readonly VideoResolution[];
  duration: Readonly<{ min: number; max: number }>;
}>;

export type VideoCreatePageProps = Readonly<{
  prompt: string;
  references: readonly VideoReference[];
  generationMode: VideoGenerationMode;
  modelId: VideoGenerationModelId;
  catalogModelId?: string;
  modelOptions: readonly VideoModelOption[];
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  durationSeconds: number;
  generateAudio: boolean;
  availability: LocalVideoPreviewAvailability;
  isGenerating: boolean;
  runs: readonly VideoPreviewRun[];
  recentReferences: readonly { id: string; name: string; url: string }[];
  onPromptChange: (value: string) => void;
  onReferenceFiles: (files: readonly File[]) => void;
  onDropFiles: (files: readonly File[]) => void;
  onOpenReferenceLibrary: () => void;
  onAddRecentReference: (id: string) => void;
  onRemoveReference: (reference: VideoReference) => void;
  onRetryReference: (reference: VideoReference) => void;
  onModelChange: (catalogId: string | undefined, modelId: VideoGenerationModelId) => void;
  onGenerationModeChange: (mode: VideoGenerationMode) => void;
  onAspectRatioChange: (ratio: VideoAspectRatio) => void;
  onResolutionChange: (resolution: VideoResolution) => void;
  onDurationChange: (duration: number) => void;
  onGenerateAudioChange: (enabled: boolean) => void;
  onGenerate: () => void;
  onRetryRun: (run: VideoPreviewRun) => void;
  onResumeRun: (run: VideoPreviewRun) => void;
  onDimensions: (run: VideoPreviewRun, width: number, height: number) => void;
  onClear: () => void;
}>;

function FieldSelect({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return <div className={styles.field}><span className={styles.fieldLabel}>{label}</span><Menu align="start" label={`${label}选项`} matchTriggerWidth trigger={<button type="button" className={styles.selectTrigger} aria-label={`${label}：${value}`}><span>{value}</span><ChevronDown aria-hidden="true" /></button>}>{children}</Menu></div>;
}

function RatioGlyph({ value }: { value: number | null }) {
  const ratio = value ?? 1;
  const width = ratio >= 1 ? 14 : Math.max(4, 14 * ratio);
  const height = ratio <= 1 ? 14 : Math.max(4, 14 / ratio);
  return <svg className={styles.ratioGlyph} viewBox="0 0 16 16" aria-hidden="true"><rect x={(16 - width) / 2} y={(16 - height) / 2} width={width} height={height} rx="1" /></svg>;
}

function VideoViewer({ runs, activeKey, onActiveKeyChange, onClose, onUse }: { runs: readonly VideoPreviewRun[]; activeKey: string; onActiveKeyChange: (key: string) => void; onClose: () => void; onUse: (run: VideoPreviewRun) => void }) {
  const completed = runs.filter((run) => run.job.resultUrl);
  const activeIndex = Math.max(0, completed.findIndex((run) => run.key === activeKey));
  const active = completed[activeIndex];
  const selectOffset = (offset: number) => { if (completed.length > 1) onActiveKeyChange(completed[(activeIndex + offset + completed.length) % completed.length].key); };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); selectOffset(-1); }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); selectOffset(1); }
  };
  if (!active?.job.resultUrl) return null;
  const model = getVideoGenerationModel(active.input.modelId).name;
  const download = () => { const link = document.createElement("a"); link.href = active.job.resultUrl!; link.download = `goodgood-video-${active.ordinal + 1}.mp4`; link.click(); };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className={styles.viewer} showCloseButton={false} onKeyDown={handleKeyDown} onOpenAutoFocus={(event) => event.preventDefault()}>
    <DialogTitle className={styles.visuallyHidden}>视频查看器</DialogTitle><DialogDescription className={styles.visuallyHidden}>使用方向键切换视频</DialogDescription>
    <header className={styles.viewerToolbar}><button type="button" aria-label="关闭视频查看器" onClick={onClose}><X /></button><div><button type="button" aria-label="下载视频" onClick={download}><Download /></button><Menu label="更多视频操作" trigger={<button type="button" aria-label="更多视频操作"><MoreHorizontal /></button>}><MenuItem onSelect={() => void navigator.clipboard?.writeText(active.input.prompt)}>复制提示词</MenuItem></Menu><button type="button" className={styles.viewerPrimary} onClick={() => onUse(active)}><WandSparkles />做同款</button></div></header>
    <section className={styles.viewerStage} aria-label="视频预览"><video src={active.job.resultUrl} controls playsInline /></section>
    <nav className={styles.viewerRail} aria-label="本次创作视频">{completed.map((run, index) => <button type="button" key={run.key} aria-label={`查看第 ${index + 1} 个视频`} aria-current={run.key === active.key ? "true" : undefined} onClick={() => onActiveKeyChange(run.key)}><video src={run.job.resultUrl ?? undefined} muted preload="metadata" /></button>)}</nav>
    <aside className={styles.viewerInfo} aria-label="视频信息"><header><div><small>{new Date(active.submittedAt).toLocaleString("zh-CN")}</small><strong>{model}</strong></div></header><section><span>提示词</span><p>{active.input.prompt}</p></section><section><span>生成参数</span><dl><div><dt>模型</dt><dd>{model}</dd></div><div><dt>画面比例</dt><dd>{VIDEO_RATIO_OPTIONS.find((option) => option.id === active.input.ratio)?.label}</dd></div><div><dt>分辨率</dt><dd>{active.input.resolution}</dd></div><div><dt>时长</dt><dd>{active.input.duration} 秒</dd></div><div><dt>声音</dt><dd>{active.input.generateAudio ? "生成" : "静音"}</dd></div></dl></section></aside>
  </DialogContent></Dialog>;
}

export function VideoCreatePage(props: VideoCreatePageProps) {
  useOfflineNotice();
  const [attempted, setAttempted] = useState(false);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const activeModel = props.modelOptions.find((option) => option.catalogId === props.catalogModelId) ?? props.modelOptions.find((option) => option.id === props.modelId) ?? (() => { const fallback = getVideoGenerationModel(props.modelId); return { id: fallback.id, name: fallback.name, description: fallback.description, resolutions: fallback.capabilities.resolutions, duration: fallback.capabilities.duration }; })();
  const missingPrompt = attempted && !props.prompt.trim();
  const referencesUnsupported = props.references.length > 0;
  const unavailable = props.availability !== "available";
  const disabled = referencesUnsupported || unavailable;
  const groupedRuns = useMemo(() => {
    const groups = new Map<string, VideoPreviewRun[]>();
    for (const run of props.runs) groups.set(run.batchId, [...(groups.get(run.batchId) ?? []), run]);
    return [...groups.values()].sort((left, right) => (right[0]?.submittedAt ?? 0) - (left[0]?.submittedAt ?? 0));
  }, [props.runs]);
  const generate = () => {
    setAttempted(true);
    if (!props.prompt.trim()) { promptRef.current?.focus(); return; }
    if (disabled) return;
    props.onGenerate();
  };
  const clear = () => {
    props.onClear();
    setAttempted(false);
  };
  const useViewerRun = (run: VideoPreviewRun) => {
    props.onPromptChange(run.input.prompt);
    props.onModelChange(undefined, run.input.modelId);
    props.onGenerationModeChange(run.input.generationMode);
    props.onAspectRatioChange(run.input.ratio);
    props.onResolutionChange(run.input.resolution);
    props.onDurationChange(run.input.duration);
    props.onGenerateAudioChange(run.input.generateAudio);
    setViewerKey(null);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  };
  return <main className={styles.createPage}>
    <section className={styles.settingsPanel} aria-label="视频生成区域">
      <header className={styles.panelHeader}><h1>视频</h1><button type="button" onClick={clear}>清空</button></header>
      <div className={styles.panelFields}>
        <FieldSelect label="模型" value={activeModel.name}>{props.modelOptions.map((option) => { const selected = props.catalogModelId ? option.catalogId === props.catalogModelId : option.id === props.modelId; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.catalogId ?? option.id} onSelect={() => props.onModelChange(option.catalogId, option.id)}><span className={styles.modelMenuCopy}><strong>{option.name}</strong>{option.description && <small>{option.description}</small>}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</FieldSelect>
        {referencesUnsupported && <div className={styles.inlineNotice} role="status"><strong>视频暂只支持文字描述</strong><span>当前草稿里仍有素材，点击“清空”移除后即可生成。</span></div>}
        <label className={styles.field}><span className={styles.fieldLabel}>提示词</span><textarea ref={promptRef} className={missingPrompt ? styles.invalid : undefined} rows={6} value={props.prompt} onChange={(event) => { props.onPromptChange(event.target.value); if (event.target.value.trim()) setAttempted(false); }} placeholder="描述画面、动作、镜头和声音…" aria-invalid={missingPrompt || undefined} aria-describedby={missingPrompt ? "video-prompt-error" : undefined} />{missingPrompt && <span id="video-prompt-error" className={styles.fieldError} role="alert">请输入视频描述后再生成。</span>}</label>
        <div className={styles.fieldRow}><FieldSelect label="画面比例" value={VIDEO_RATIO_OPTIONS.find((option) => option.id === props.aspectRatio)?.label ?? props.aspectRatio}>{(["square", "portrait", "landscape"] as const).map((mode, groupIndex) => { const options = VIDEO_RATIO_OPTIONS.filter((option) => mode === "square" ? option.value === null || option.value === 1 : mode === "portrait" ? option.value !== null && option.value < 1 : option.value !== null && option.value > 1); if (!options.length) return null; return <div className={styles.ratioGroup} key={mode}>{groupIndex > 0 && <MenuSeparator />}<span className={styles.menuGroupLabel}>{mode === "square" ? "方形" : mode === "portrait" ? "竖版" : "横版"}</span>{options.map((option) => { const selected = props.aspectRatio === option.id; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.id} onSelect={() => props.onAspectRatioChange(option.id)}><RatioGlyph value={option.value} /><span>{option.label}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</div>; })}</FieldSelect><FieldSelect label="分辨率" value={props.resolution}>{activeModel.resolutions.map((value) => { const selected = props.resolution === value; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={value} onSelect={() => props.onResolutionChange(value)}><span>{value}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</FieldSelect></div>
        <label className={styles.field}><span className={styles.fieldHeading}><span className={styles.fieldLabel}>时长</span><output>{props.durationSeconds} 秒</output></span><input className={styles.durationSlider} type="range" min={activeModel.duration.min} max={activeModel.duration.max} step={1} value={props.durationSeconds} onChange={(event) => props.onDurationChange(Number(event.target.value))} /></label>
        <label className={styles.switchRow}><span className={styles.fieldLabel}>生成音频</span><SwitchPrimitive.Root className={styles.audioSwitch} checked={props.generateAudio} onCheckedChange={props.onGenerateAudioChange} aria-label="生成音频"><SwitchPrimitive.Thumb className={styles.audioSwitchThumb} /></SwitchPrimitive.Root></label>
      </div>
      <footer className={styles.generateFooter}>{unavailable && <div className={styles.inlineNotice} role="status"><strong>{props.availability === "checking" ? "正在检查视频接口" : "视频接口暂不可用"}</strong><span>当前提示词和参数会保留。</span></div>}<button type="button" className={styles.generateButton} disabled={disabled} onClick={generate}>{props.isGenerating && <LoaderCircle className={styles.spin} />}<span>生成</span></button></footer>
    </section>
    <section className={styles.runPane} aria-label="视频生成记录"><header className={styles.runHeader}><div><h2>本次创作</h2>{props.isGenerating && <span role="status"><LoaderCircle className={styles.spin} />视频生成中</span>}</div></header>{groupedRuns.map((runs) => { const first = runs[0]; return <article className={styles.runGroup} key={first.batchId}><header><div><p>{first.input.prompt}</p><small>{getVideoGenerationModel(first.input.modelId).name} · {VIDEO_RATIO_OPTIONS.find((option) => option.id === first.input.ratio)?.label} · {first.input.resolution} · {first.input.duration} 秒</small></div></header><div className={styles.mediaGrid}>{runs.map((run) => { const failure = run.monitoringError ?? run.job.error; const reviewFailure = !!failure && /审核|内容.*(?:不通过|拒绝)|moderation|safety|rejected/i.test(failure); const aspectRatio = run.outputRatio ?? VIDEO_RATIO_OPTIONS.find(option => option.id === run.input.ratio)?.value ?? 16 / 9; return run.job.resultUrl ? <article className={styles.mediaTile} style={{ aspectRatio }} key={run.key}><button type="button" className={styles.mediaOpen} aria-label={`查看生成视频 ${run.ordinal + 1}`} onClick={() => setViewerKey(run.key)}><video src={run.job.resultUrl} muted playsInline preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) props.onDimensions(run, video.videoWidth, video.videoHeight); }} /><span className={styles.videoMarker}><Play fill="currentColor" />{run.input.duration} 秒</span></button></article> : <article className={failure ? styles.failedTile : styles.mediaSkeleton} style={failure ? undefined : { aspectRatio }} key={run.key} role={failure ? "alert" : "status"}>{failure ? <><strong>{reviewFailure ? "审核未通过" : run.job.status === "failed" ? "生成失败" : "连接中断"}</strong><p>{failure}</p>{reviewFailure ? <button type="button" onClick={() => { props.onPromptChange(run.input.prompt); promptRef.current?.focus(); }}>修改提示词</button> : run.monitoringError && !run.job.taskId.startsWith("local_") ? <button type="button" onClick={() => props.onResumeRun(run)}><RefreshCw />继续查询</button> : !run.monitoringError ? <button type="button" onClick={() => props.onRetryRun(run)}><RefreshCw />重试</button> : <small>提交状态未知，请先核对上游记录。</small>}</> : <><LoaderCircle className={styles.spin} /><strong>{run.job.status === "queued" ? "已排队" : `生成中${run.job.progress === null ? "" : ` · ${run.job.progress}%`}`}</strong></>}</article>; })}</div></article>; })}{props.runs.length === 0 && <div className={styles.emptyRuns}><Film size={32} /><h2>描述你想创作的视频</h2><p>输入提示词并设置参数后，生成记录会出现在这里。</p></div>}</section>
    {viewerKey && <VideoViewer runs={props.runs} activeKey={viewerKey} onActiveKeyChange={setViewerKey} onClose={() => setViewerKey(null)} onUse={useViewerRun} />}
  </main>;
}
