"use client";

import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Film, LoaderCircle, Play, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AddReferenceMenu, Menu, MenuItem, ReferenceThumb } from "@/features/design-system";
import type { LocalVideoPreviewAvailability } from "@/features/creation/http-video-preview-boundary";
import {
  VIDEO_RATIO_OPTIONS,
  type VideoAspectRatio,
  type VideoGenerationMode,
  type VideoGenerationModelId,
  type VideoReference,
  type VideoResolution,
} from "@/features/creation/video-generation-options";
import { getVideoGenerationModel, getVideoReferenceLimits } from "@/features/creation/video-generation-options";
import type { VideoPreviewRun } from "@/features/creation/video-preview-runs";
import { VideoReferencePreviewDialog } from "@/features/creation/video-reference-preview-dialog";
import { useComposerFileDrop } from "@/features/creation/use-composer-file-drop";
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
}>;

function FieldSelect({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return <div className={styles.field}><span className={styles.fieldLabel}>{label}</span><Menu align="start" label={`${label}选项`} trigger={<button type="button" className={styles.selectTrigger} aria-label={`${label}：${value}`}><span>{value}</span><ChevronDown aria-hidden="true" /></button>}>{children}</Menu></div>;
}

function VideoViewer({ runs, activeKey, onActiveKeyChange, onClose }: { runs: readonly VideoPreviewRun[]; activeKey: string; onActiveKeyChange: (key: string) => void; onClose: () => void }) {
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
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className={styles.viewer} onKeyDown={handleKeyDown} onOpenAutoFocus={(event) => event.preventDefault()}>
    <DialogTitle className={styles.visuallyHidden}>视频查看器</DialogTitle><DialogDescription className={styles.visuallyHidden}>使用方向键切换视频</DialogDescription>
    <section className={styles.viewerStage} aria-label="视频预览"><button className={styles.viewerClose} type="button" aria-label="关闭视频查看器" onClick={onClose}><X /></button><video src={active.job.resultUrl} controls playsInline /></section>
    <nav className={styles.viewerRail} aria-label="本次创作视频">{completed.map((run, index) => <button type="button" key={run.key} aria-label={`查看第 ${index + 1} 个视频`} aria-current={run.key === active.key ? "true" : undefined} onClick={() => onActiveKeyChange(run.key)}><video src={run.job.resultUrl ?? undefined} muted preload="metadata" /></button>)}</nav>
    <aside className={styles.viewerInfo} aria-label="视频信息"><header><div><small>{new Date(active.submittedAt).toLocaleString("zh-CN")}</small><strong>{model}</strong></div></header><section><span>提示词</span><p>{active.input.prompt}</p></section><section><span>生成参数</span><dl><div><dt>模型</dt><dd>{model}</dd></div><div><dt>画面比例</dt><dd>{VIDEO_RATIO_OPTIONS.find((option) => option.id === active.input.ratio)?.label}</dd></div><div><dt>分辨率</dt><dd>{active.input.resolution}</dd></div><div><dt>时长</dt><dd>{active.input.duration} 秒</dd></div><div><dt>声音</dt><dd>{active.input.generateAudio ? "生成" : "静音"}</dd></div></dl></section></aside>
  </DialogContent></Dialog>;
}

export function VideoCreatePage(props: VideoCreatePageProps) {
  useOfflineNotice();
  const [attempted, setAttempted] = useState(false);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const [previewReferenceId, setPreviewReferenceId] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const fileDrop = useComposerFileDrop(props.onDropFiles);
  const activeModel = props.modelOptions.find((option) => option.catalogId === props.catalogModelId) ?? props.modelOptions.find((option) => option.id === props.modelId) ?? (() => { const fallback = getVideoGenerationModel(props.modelId); return { id: fallback.id, name: fallback.name, description: fallback.description, resolutions: fallback.capabilities.resolutions, duration: fallback.capabilities.duration }; })();
  const limits = getVideoReferenceLimits(props.modelId, props.generationMode);
  const missingPrompt = attempted && !props.prompt.trim();
  const pendingReference = props.references.some((reference) => reference.status === "uploading");
  const failedReferences = props.references.filter((reference) => reference.status === "failed");
  const referencesUnsupported = props.references.length > 0;
  const unavailable = props.availability !== "available";
  const disabled = pendingReference || referencesUnsupported || unavailable;
  const groupedRuns = useMemo(() => {
    const groups = new Map<string, VideoPreviewRun[]>();
    for (const run of props.runs) groups.set(run.batchId, [...(groups.get(run.batchId) ?? []), run]);
    return [...groups.values()].sort((left, right) => (right[0]?.submittedAt ?? 0) - (left[0]?.submittedAt ?? 0));
  }, [props.runs]);
  const previewReferenceIndex = props.references.findIndex((reference) => reference.id === previewReferenceId);
  const previewReference = previewReferenceIndex >= 0 ? props.references[previewReferenceIndex] : null;
  const previewReferenceOrdinal = previewReference ? props.references.slice(0, previewReferenceIndex + 1).filter((reference) => reference.mediaType === previewReference.mediaType).length : 0;
  const generate = () => {
    setAttempted(true);
    if (!props.prompt.trim()) { promptRef.current?.focus(); return; }
    if (disabled) return;
    props.onGenerate();
  };
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    props.onDropFiles(files);
  };
  return <main className={styles.createPage}>
    <section className={styles.settingsPanel} aria-label="视频生成区域" data-drag-active={fileDrop.dragActive || undefined} onDragEnter={fileDrop.onDragEnter} onDragOver={fileDrop.onDragOver} onDragLeave={fileDrop.onDragLeave} onDrop={fileDrop.onDrop}>
      <header className={styles.panelHeader}><h1>视频</h1></header>
      <div className={styles.panelFields}>
        <FieldSelect label="模型" value={activeModel.name}>{props.modelOptions.map((option) => <MenuItem key={option.catalogId ?? option.id} onSelect={() => props.onModelChange(option.catalogId, option.id)}><span className={styles.modelMenuCopy}><strong>{option.name}</strong>{option.description && <small>{option.description}</small>}</span>{option.id === props.modelId && option.catalogId === props.catalogModelId ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect>
        <div className={styles.field}><span className={styles.fieldLabel}>生成方式</span><div className={styles.modeGrid}><button type="button" aria-pressed={props.generationMode === "multimodal"} onClick={() => props.onGenerationModeChange("multimodal")}><Film aria-hidden="true" /><strong>文生视频</strong><small>根据提示词生成新视频</small></button></div></div>
        <div className={styles.field}><div className={styles.fieldHeading}><span className={styles.fieldLabel}>素材</span><small>{props.references.length} / {limits.totalLimit}</small></div><div className={styles.references}>{props.references.map((reference, index) => <ReferenceThumb key={reference.id} item={{ ...reference, mediaType: reference.mediaType }} ordinal={index + 1} onRemove={() => props.onRemoveReference(reference)} onRetry={() => props.onRetryReference(reference)} onPreview={() => { previewTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPreviewReferenceId(reference.id); }} />)}<AddReferenceMenu disabled={props.references.length >= limits.totalLimit} accept=".jpg,.jpeg,.png,.mp4,.mov,.mp3,.wav,image/jpeg,image/png,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/x-wav" onFiles={props.onReferenceFiles} onLibrary={props.onOpenReferenceLibrary} recent={props.recentReferences} onRecent={props.onAddRecentReference} /></div>{failedReferences.map((reference) => <div key={reference.id} className={styles.inlineNotice} role="alert"><strong>{reference.name} 上传失败</strong><span>{reference.errorMessage ?? "请重试或更换素材。"}</span></div>)}{referencesUnsupported && <div className={styles.inlineNotice} role="status"><strong>当前接口先支持文生视频</strong><span>已选素材会保留在当前会话；移除素材后可提交。本页素材接口完整接通后再开放参考生成方式。</span></div>}</div>
        <label className={styles.field}><span className={styles.fieldLabel}>提示词</span><textarea ref={promptRef} className={missingPrompt ? styles.invalid : undefined} rows={6} value={props.prompt} onChange={(event) => { props.onPromptChange(event.target.value); if (event.target.value.trim()) setAttempted(false); }} onPaste={handlePaste} placeholder="描述画面、动作、镜头和声音…" aria-invalid={missingPrompt || undefined} aria-describedby={missingPrompt ? "video-prompt-error" : undefined} />{missingPrompt && <span id="video-prompt-error" className={styles.fieldError} role="alert">请输入视频描述后再生成。</span>}</label>
        <div className={styles.fieldRow}><FieldSelect label="画面比例" value={VIDEO_RATIO_OPTIONS.find((option) => option.id === props.aspectRatio)?.label ?? props.aspectRatio}>{VIDEO_RATIO_OPTIONS.map((option) => <MenuItem key={option.id} onSelect={() => props.onAspectRatioChange(option.id)}><span>{option.label}</span>{props.aspectRatio === option.id ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect><FieldSelect label="分辨率" value={props.resolution}>{activeModel.resolutions.map((value) => <MenuItem key={value} onSelect={() => props.onResolutionChange(value)}><span>{value}</span>{props.resolution === value ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect></div>
        <label className={styles.field}><span className={styles.fieldHeading}><span className={styles.fieldLabel}>时长</span><output>{props.durationSeconds} 秒</output></span><input className={styles.durationSlider} type="range" min={activeModel.duration.min} max={activeModel.duration.max} step={1} value={props.durationSeconds} onChange={(event) => props.onDurationChange(Number(event.target.value))} /></label>
        <div className={styles.field}><span className={styles.fieldLabel}>生成音频</span><div className={styles.segmented}><button type="button" aria-pressed={props.generateAudio} onClick={() => props.onGenerateAudioChange(true)}><Volume2 aria-hidden="true" />有声</button><button type="button" aria-pressed={!props.generateAudio} onClick={() => props.onGenerateAudioChange(false)}><VolumeX aria-hidden="true" />静音</button></div></div>
      </div>
      <footer className={styles.generateFooter}>{unavailable && <div className={styles.inlineNotice} role="status"><strong>{props.availability === "checking" ? "正在检查视频接口" : "视频接口暂不可用"}</strong><span>当前提示词、素材和参数会保留。</span></div>}<button type="button" className={styles.generateButton} disabled={disabled} onClick={generate}>{props.isGenerating ? <LoaderCircle className={styles.spin} /> : <Film />}<span>{props.isGenerating ? "继续生成视频" : "生成视频"}</span><strong>{props.availability === "available" ? "接口可用" : "暂不可用"}</strong></button></footer>
    </section>
    <section className={styles.runPane} aria-label="视频生成记录"><header className={styles.runHeader}><div><h2>本次创作</h2>{props.isGenerating && <span role="status"><LoaderCircle className={styles.spin} />视频生成中</span>}</div></header>{groupedRuns.map((runs) => { const first = runs[0]; return <article className={styles.runGroup} key={first.batchId}><header><div><p>{first.input.prompt}</p><small>{getVideoGenerationModel(first.input.modelId).name} · {VIDEO_RATIO_OPTIONS.find((option) => option.id === first.input.ratio)?.label} · {first.input.resolution} · {first.input.duration} 秒</small></div></header><div className={styles.mediaGrid}>{runs.map((run) => { const failure = run.monitoringError ?? run.job.error; const aspectRatio = run.outputRatio ?? VIDEO_RATIO_OPTIONS.find(option => option.id === run.input.ratio)?.value ?? 16 / 9; return run.job.resultUrl ? <article className={styles.mediaTile} style={{ aspectRatio }} key={run.key}><button type="button" className={styles.mediaOpen} aria-label={`查看生成视频 ${run.ordinal + 1}`} onClick={() => setViewerKey(run.key)}><video src={run.job.resultUrl} muted playsInline preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (video.videoWidth && video.videoHeight) props.onDimensions(run, video.videoWidth, video.videoHeight); }} /><span className={styles.videoMarker}><Play fill="currentColor" />{run.input.duration} 秒</span></button></article> : <article className={failure ? styles.failedTile : styles.mediaSkeleton} style={failure ? undefined : { aspectRatio }} key={run.key} role={failure ? "alert" : "status"}>{failure ? <><strong>{run.job.status === "failed" ? "生成失败" : "连接中断"}</strong><p>{failure}</p>{run.monitoringError && !run.job.taskId.startsWith("local_") ? <button type="button" onClick={() => props.onResumeRun(run)}><RefreshCw />继续查询</button> : !run.monitoringError ? <button type="button" onClick={() => props.onRetryRun(run)}><RefreshCw />原位重试</button> : <small>提交状态未知，请先核对上游记录。</small>}</> : <><LoaderCircle className={styles.spin} /><strong>{run.job.status === "queued" ? "已排队" : `生成中${run.job.progress === null ? "" : ` · ${run.job.progress}%`}`}</strong></>}</article>; })}</div></article>; })}{props.runs.length === 0 && <div className={styles.emptyRuns}><Film size={32} /><h2>描述你想创作的视频</h2><p>输入提示词并设置参数后，生成记录会出现在这里。</p></div>}</section>
    {viewerKey && <VideoViewer runs={props.runs} activeKey={viewerKey} onActiveKeyChange={setViewerKey} onClose={() => setViewerKey(null)} />}
    {previewReference && <VideoReferencePreviewDialog key={`${previewReference.id}:${previewReference.url}`} reference={previewReference} label={`${previewReference.mediaType === "image" ? "图片" : previewReference.mediaType === "video" ? "视频" : "音频"}${previewReferenceOrdinal}`} onClose={() => setPreviewReferenceId(null)} onReturnFocus={() => previewTriggerRef.current?.focus()} />}
  </main>;
}
