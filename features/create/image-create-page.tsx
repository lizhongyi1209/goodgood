"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode, type WheelEvent } from "react";
import Image from "next/image";
import { ChevronDown, Download, LoaderCircle, MoreHorizontal, Plus, RefreshCw, Settings2, WandSparkles, X, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { AddReferenceMenu, Menu, MenuItem, MenuSeparator, ReferenceThumb } from "@/features/design-system";
import { useComposerFileDrop } from "@/features/creation/use-composer-file-drop";
import { ReferenceQuickEditor } from "@/features/references/reference-quick-editor";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import {
  GENERATION_COUNTS,
  MAX_GENERATION_REFERENCES,
  isGptImageModelId,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationJob,
  type GenerationModelId,
  type GenerationOutput,
  type GenerationReference,
  type GenerationResolution,
  type GptImageQuality,
} from "@/shared/contracts/generation";
import {
  GENERATION_RESOLUTION_OPTIONS,
  formatGenerationResolution,
  getGenerationModelRatioIndex,
  getGenerationRatio,
  getGenerationRatioOptions,
  getGptImageQualityOptions,
} from "@/features/creation/generation-options";
import { getGenerationModel } from "@/features/models/catalog";
import type { TrackedGenerationRun } from "@/features/creation/generation-runs";
import styles from "./create-page.module.css";
import { useOfflineNotice } from "./use-offline-notice";

export type CreateImageBatch = Readonly<{
  id: string;
  createdAt: string;
  dateLabel: string;
  time: string;
  prompt: string;
  modelId: GenerationModelId;
  catalogModelName?: string;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  referenceCount: number;
  images: readonly GenerationOutput[];
}>;

export type ImageModelOption = Readonly<{
  id: GenerationModelId;
  catalogId?: string;
  name: string;
  description: string;
}>;

type ViewerItem = Readonly<{
  key: string;
  image: GenerationOutput;
  index: number;
  batch: CreateImageBatch;
}>;

export type ImageCreatePageProps = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  catalogModelId?: string;
  modelOptions: readonly ImageModelOption[];
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  quality: GptImageQuality;
  billingLabel: string;
  requiredCredits: string | null;
  availableCredits: string | null;
  billingUnavailable: boolean;
  isGenerating: boolean;
  stageText: string;
  batches: readonly CreateImageBatch[];
  runs: readonly TrackedGenerationRun[];
  recentReferences: readonly { id: string; name: string; url: string }[];
  projectName?: string | null;
  onPromptChange: (value: string) => void;
  onReferenceFiles: (files: readonly File[]) => void;
  onDropFiles: (files: readonly File[]) => void;
  onOpenReferenceLibrary: () => void;
  onAddRecentReference: (id: string) => void;
  onRemoveReference: (reference: GenerationReference) => void;
  onRetryReference: (reference: GenerationReference) => void;
  onReorderReference: (sourceId: string, targetId: string) => void;
  referenceEditorMaterials: readonly ReferenceMaterial[];
  onSaveReferenceEdit: (source: GenerationReference, file: File) => Promise<void>;
  onModelChange: (catalogId: string | undefined, modelId: GenerationModelId) => void;
  onAspectRatioChange: (ratio: GenerationAspectRatio) => void;
  onResolutionChange: (resolution: GenerationResolution) => void;
  onCountChange: (count: GenerationCount) => void;
  onQualityChange: (quality: GptImageQuality) => void;
  onGenerate: () => void;
  onRetryRun: (run: TrackedGenerationRun) => void;
  onRestoreRun: (input: GenerationJob["input"]) => void;
  onDownload: (batch: CreateImageBatch, image: GenerationOutput, index: number) => void;
  isDownloading: (batch: CreateImageBatch, image: GenerationOutput) => boolean;
  onCredits: () => void;
  onSaveProject: () => void;
  onNewCreation: () => void;
  onClear: () => void;
}>;

function FieldSelect({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return <div className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    <Menu align="start" label={`${label}选项`} matchTriggerWidth trigger={<button type="button" className={styles.selectTrigger} aria-label={`${label}：${value}`}><span>{value}</span><ChevronDown aria-hidden="true" /></button>}>
      {children}
    </Menu>
  </div>;
}

function RatioGlyph({ value }: { value: number }) {
  const width = value >= 1 ? 14 : Math.max(4, 14 * value);
  const height = value <= 1 ? 14 : Math.max(4, 14 / value);
  return <svg className={styles.ratioGlyph} viewBox="0 0 16 16" aria-hidden="true"><rect x={(16 - width) / 2} y={(16 - height) / 2} width={width} height={height} rx="1" /></svg>;
}

function RunMediaTile({ item, onOpen, onDownload, downloading }: { item: ViewerItem; onOpen: () => void; onDownload: () => void; downloading: boolean }) {
  const model = item.batch.catalogModelName ?? getGenerationModel(item.batch.modelId).name;
  const aspectRatio = item.image.width && item.image.height ? item.image.width / item.image.height : getGenerationRatio(item.batch.aspectRatio).value;
  return <article className={styles.mediaTile} style={{ aspectRatio }}>
    <button type="button" className={styles.mediaOpen} aria-label={`查看 ${model} 生成的图片 ${item.index + 1}`} onClick={onOpen}>
      <PrivateObjectImage src={item.image.previewUrl} alt={`${model} 生成的图片 ${item.index + 1}`} style={{ objectPosition: item.image.previewPosition }} />
    </button>
    <button type="button" className={styles.mediaDownload} aria-label={downloading ? "正在下载图片" : "下载图片"} disabled={downloading} onClick={onDownload}>
      {downloading ? <LoaderCircle className={styles.spin} /> : <Download />}
    </button>
  </article>;
}

function MediaViewer({ items, activeKey, onActiveKeyChange, onClose, onDownload, isDownloading, onUse }: { items: readonly ViewerItem[]; activeKey: string; onActiveKeyChange: (key: string) => void; onClose: () => void; onDownload: ImageCreatePageProps["onDownload"]; isDownloading: ImageCreatePageProps["isDownloading"]; onUse: (item: ViewerItem) => void }) {
  const wheelTimer = useRef<number | null>(null);
  const activeIndex = Math.max(0, items.findIndex((item) => item.key === activeKey));
  const active = items[activeIndex];
  const selectOffset = (offset: number) => {
    if (items.length < 2) return;
    onActiveKeyChange(items[(activeIndex + offset + items.length) % items.length].key);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); selectOffset(-1); }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); selectOffset(1); }
  };
  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) < 18 || wheelTimer.current !== null || items.length < 2) return;
    event.preventDefault();
    selectOffset(event.deltaY > 0 ? 1 : -1);
    wheelTimer.current = window.setTimeout(() => { wheelTimer.current = null; }, 280);
  };
  useEffect(() => () => { if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current); }, []);
  if (!active) return null;
  const modelName = active.batch.catalogModelName ?? getGenerationModel(active.batch.modelId).name;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={styles.viewer} showCloseButton={false} onKeyDown={handleKeyDown} onOpenAutoFocus={(event) => event.preventDefault()}>
      <DialogTitle className={styles.visuallyHidden}>图片查看器</DialogTitle>
      <DialogDescription className={styles.visuallyHidden}>使用方向键切换图片</DialogDescription>
      <header className={styles.viewerToolbar}>
        <button type="button" aria-label="关闭图片查看器" onClick={onClose}><X /></button>
        <div>
          <button type="button" aria-label="下载图片" disabled={isDownloading(active.batch, active.image)} onClick={() => onDownload(active.batch, active.image, active.index)}>{isDownloading(active.batch, active.image) ? <LoaderCircle className={styles.spin} /> : <Download />}</button>
          <Menu label="更多图片操作" trigger={<button type="button" aria-label="更多图片操作"><MoreHorizontal /></button>}><MenuItem onSelect={() => void navigator.clipboard?.writeText(active.batch.prompt)}>复制提示词</MenuItem></Menu>
          <button type="button" className={styles.viewerPrimary} onClick={() => onUse(active)}><WandSparkles />做同款</button>
        </div>
      </header>
      <section className={styles.viewerStage} aria-label="大图预览" onWheel={handleWheel}>
        <PrivateObjectImage src={active.image.detailUrl ?? active.image.previewUrl} alt={`${modelName} 生成的图片`} loading="eager" style={{ objectPosition: active.image.previewPosition }} />
      </section>
      <nav className={styles.viewerRail} aria-label="本次创作图片">{items.map((item, index) => <button type="button" key={item.key} aria-label={`查看第 ${index + 1} 张图片`} aria-current={item.key === active.key ? "true" : undefined} onClick={() => onActiveKeyChange(item.key)}><PrivateObjectImage src={item.image.previewUrl} alt="" /></button>)}</nav>
      <aside className={styles.viewerInfo} aria-label="图片信息">
        <header><div><small>{active.batch.dateLabel} · {active.batch.time}</small><strong>{modelName}</strong></div></header>
        <section><span>提示词</span><p>{active.batch.prompt}</p></section>
        <section><span>生成参数</span><dl><div><dt>模型</dt><dd>{modelName}</dd></div><div><dt>画面比例</dt><dd>{getGenerationRatio(active.batch.aspectRatio).label}</dd></div><div><dt>分辨率</dt><dd>{formatGenerationResolution(active.batch.resolution, active.image)}</dd></div><div><dt>参考图</dt><dd>{active.batch.referenceCount ? `${active.batch.referenceCount} 张` : "无"}</dd></div></dl></section>
      </aside>
    </DialogContent>
  </Dialog>;
}

export function ImageCreatePage(props: ImageCreatePageProps) {
  useOfflineNotice();
  const [attempted, setAttempted] = useState(false);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const [previewReferenceId, setPreviewReferenceId] = useState<string | null>(null);
  const [draggedReferenceId, setDraggedReferenceId] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const suppressReferencePreviewRef = useRef(false);
  const fileDrop = useComposerFileDrop(props.onDropFiles);
  const activeModel = props.modelOptions.find((option) => option.catalogId === props.catalogModelId) ?? props.modelOptions.find((option) => option.id === props.modelId) ?? { id: props.modelId, name: getGenerationModel(props.modelId).name, description: "" };
  const ratio = getGenerationRatio(props.aspectRatio);
  const missingPrompt = attempted && !props.prompt.trim();
  const uploadFailed = props.references.filter((reference) => reference.status === "failed");
  const uploadPending = props.references.some((reference) => reference.status === "uploading");
  const insufficientCredits = props.requiredCredits !== null && props.availableCredits !== null && BigInt(props.availableCredits) < BigInt(props.requiredCredits);
  const disabled = uploadPending || insufficientCredits || props.billingUnavailable;
  const viewerItems = useMemo(() => props.batches.flatMap((batch) => batch.images.map((image, index) => ({ key: `${batch.id}-${image.id}`, batch, image, index }))), [props.batches]);
  const qualityOptions = getGptImageQualityOptions(props.modelId);
  const activeQuality = qualityOptions.find((option) => option.value === props.quality)?.label ?? props.quality;
  const previewReferenceIndex = props.references.findIndex((reference) => reference.id === previewReferenceId);
  const previewReference = previewReferenceIndex >= 0 ? props.references[previewReferenceIndex] : null;

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
  const useViewerItem = (item: ViewerItem) => {
    const sourceRun = props.runs.find((run) => run.job.id === item.batch.id);
    if (sourceRun) props.onRestoreRun(sourceRun.job.input);
    else {
      props.onPromptChange(item.batch.prompt);
      props.onModelChange(undefined, item.batch.modelId);
      props.onAspectRatioChange(item.batch.aspectRatio);
      props.onResolutionChange(item.batch.resolution);
      props.onCountChange(item.batch.count);
    }
    setViewerKey(null);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  };
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    props.onDropFiles(files);
  };

  return <main className={styles.createPage}>
    <section className={styles.settingsPanel} aria-label="图像生成区域" data-drag-active={fileDrop.dragActive || undefined} onDragEnter={fileDrop.onDragEnter} onDragOver={fileDrop.onDragOver} onDragLeave={fileDrop.onDragLeave} onDrop={fileDrop.onDrop}>
      <header className={styles.panelHeader}><h1>图片</h1><button type="button" onClick={clear}>清空</button></header>
      <div className={styles.panelFields}>
        <FieldSelect label="模型" value={activeModel.name}>{props.modelOptions.map((option) => { const selected = props.catalogModelId ? option.catalogId === props.catalogModelId : option.id === props.modelId; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.catalogId ?? option.id} onSelect={() => props.onModelChange(option.catalogId, option.id)}><span className={styles.modelMenuCopy}><strong>{option.name}</strong>{option.description && <small>{option.description}</small>}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</FieldSelect>
        <div className={styles.field}>
          <div className={styles.fieldHeading}><span className={styles.fieldLabel}>参考图</span><small>{props.references.length} / {MAX_GENERATION_REFERENCES}</small></div>
          <div className={styles.references}>{props.references.map((reference, index) => <div className={styles.referenceDraggable} key={reference.id} draggable={props.references.length > 1} tabIndex={props.references.length > 1 ? 0 : -1} aria-label={props.references.length > 1 ? `${reference.name}，可拖拽排序` : undefined} aria-keyshortcuts={props.references.length > 1 ? "Alt+ArrowLeft Alt+ArrowRight" : undefined} data-dragging={draggedReferenceId === reference.id || undefined} onDragStart={event => { if (event.target instanceof Element && event.target.closest('button[aria-label^="移除"]')) { event.preventDefault(); return; } suppressReferencePreviewRef.current = true; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", reference.id); setDraggedReferenceId(reference.id); }} onDragOver={event => { if (draggedReferenceId && draggedReferenceId !== reference.id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={event => { if (Array.from(event.dataTransfer.types).includes("Files")) return; event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || draggedReferenceId; if (sourceId && sourceId !== reference.id) props.onReorderReference(sourceId, reference.id); setDraggedReferenceId(null); }} onDragEnd={() => { setDraggedReferenceId(null); window.setTimeout(() => { suppressReferencePreviewRef.current = false; }, 0); }} onKeyDown={event => { if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return; const target = props.references[event.key === "ArrowLeft" ? index - 1 : index + 1]; if (!target) return; event.preventDefault(); props.onReorderReference(reference.id, target.id); }}><ReferenceThumb item={reference} ordinal={index + 1} onRemove={() => props.onRemoveReference(reference)} onRetry={() => props.onRetryReference(reference)} onPreview={() => { if (!suppressReferencePreviewRef.current) setPreviewReferenceId(reference.id); }} /></div>)}<AddReferenceMenu disabled={props.references.length >= MAX_GENERATION_REFERENCES} accept=".jpg,.jpeg,.png,image/jpeg,image/png" onFiles={props.onReferenceFiles} onLibrary={props.onOpenReferenceLibrary} recent={props.recentReferences} onRecent={props.onAddRecentReference} /></div>
          {uploadFailed.map((reference) => <div key={reference.id} className={styles.inlineNotice} role="alert"><strong>{reference.name} 上传失败</strong><span>{reference.errorMessage ?? "请重试或更换图片。"}</span></div>)}
        </div>
        <label className={styles.field}><span className={styles.fieldLabel}>提示词</span><textarea ref={promptRef} className={missingPrompt ? styles.invalid : undefined} rows={6} value={props.prompt} onChange={(event) => { props.onPromptChange(event.target.value); if (event.target.value.trim()) setAttempted(false); }} onPaste={handlePaste} placeholder="描述你想创作的画面…" aria-invalid={missingPrompt || undefined} aria-describedby={missingPrompt ? "image-prompt-error" : undefined} />{missingPrompt && <span id="image-prompt-error" className={styles.fieldError} role="alert">请输入画面描述后再生成。</span>}</label>
        <div className={styles.fieldRow}>
          <FieldSelect label="画面比例" value={ratio.label}>{(["square", "portrait", "landscape"] as const).map((mode, groupIndex) => { const options = getGenerationRatioOptions(props.modelId).filter((option) => option.mode === mode); if (!options.length) return null; return <div className={styles.ratioGroup} key={mode}>{groupIndex > 0 && <MenuSeparator />}<span className={styles.menuGroupLabel}>{mode === "square" ? "方形" : mode === "portrait" ? "竖版" : "横版"}</span>{options.map((option) => { const selected = getGenerationModelRatioIndex(props.modelId, props.aspectRatio) === getGenerationModelRatioIndex(props.modelId, option.id); return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.id} onSelect={() => props.onAspectRatioChange(option.id)}><RatioGlyph value={option.value} /><span>{option.label}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</div>; })}</FieldSelect>
          <FieldSelect label="分辨率" value={props.resolution}>{GENERATION_RESOLUTION_OPTIONS.map((option) => { const selected = props.resolution === option.value; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.value} onSelect={() => props.onResolutionChange(option.value)}><span>{option.label}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</FieldSelect>
        </div>
        <div className={styles.field}><span className={styles.fieldLabel}>数量</span><div className={styles.segmented}>{GENERATION_COUNTS.map((value) => <button type="button" key={value} aria-pressed={props.count === value} onClick={() => props.onCountChange(value)}>{value}</button>)}</div></div>
        {isGptImageModelId(props.modelId) && <FieldSelect label="质量" value={activeQuality}>{qualityOptions.map((option) => { const selected = props.quality === option.value; return <MenuItem className={styles.selectMenuItem} aria-current={selected ? "true" : undefined} key={option.value} onSelect={() => props.onQualityChange(option.value)}><span>{option.label}</span>{selected ? <span className={styles.menuCheck} aria-hidden="true">✓</span> : null}</MenuItem>; })}</FieldSelect>}
      </div>
      <footer className={styles.generateFooter}>
        {insufficientCredits && <div className={styles.creditNotice} role="alert"><span>需要 {props.requiredCredits} 积分，当前余额 {props.availableCredits}</span><button type="button" onClick={props.onCredits}>补充积分</button></div>}
        <button type="button" className={styles.generateButton} disabled={disabled} onClick={generate}>{props.isGenerating && <LoaderCircle className={styles.spin} />}<span>生成</span><span className={styles.generatePrice}><Zap fill="currentColor" />{props.requiredCredits ?? props.billingLabel}</span></button>
      </footer>
    </section>

    <section className={styles.runPane} aria-label="图片生成记录">
      <header className={styles.runHeader}><div><h2>{props.projectName ?? "本次创作"}</h2>{props.isGenerating && <span role="status"><LoaderCircle className={styles.spin} />{props.stageText}</span>}</div><div>{props.batches.length > 0 && <button type="button" onClick={props.onSaveProject}><Plus />{props.projectName ? "项目设置" : "保存为项目"}</button>}{props.projectName && <button type="button" onClick={props.onNewCreation}><Plus />新建创作</button>}</div></header>
      {props.runs.filter((run) => run.job.error).map((run) => { const reviewFailure = run.job.error?.code === "MODEL_REJECTED"; return <article className={styles.failedRun} key={run.key} role="alert"><div><strong>{reviewFailure ? "审核未通过" : run.job.error?.title ?? "生成失败"}</strong><p>{run.job.error?.message}</p><small>未扣除积分 · {run.job.error?.code}</small></div><div><button type="button" onClick={() => { if (reviewFailure) { props.onRestoreRun(run.job.input); window.setTimeout(() => promptRef.current?.focus(), 0); } else props.onRetryRun(run); }}>{reviewFailure ? <Settings2 /> : <RefreshCw />}{reviewFailure ? "修改提示词" : "重试"}</button></div></article>; })}
      {props.runs.filter((run) => !run.job.error && run.job.state !== "succeeded").map((run) => <article className={styles.runGroup} key={run.key}><header><div><p>{run.job.input.prompt}</p><small>{getGenerationModel(run.job.input.modelId).name} · {getGenerationRatio(run.job.input.aspectRatio).label} · {run.job.input.resolution}</small></div><span role="status"><LoaderCircle className={styles.spin} />生成中</span></header><div className={styles.mediaGrid}>{Array.from({ length: run.job.input.count }, (_, index) => <div className={styles.mediaSkeleton} style={{ aspectRatio: getGenerationRatio(run.job.input.aspectRatio).value }} key={index}><Image src="/goodgood-g-icon.svg" alt="" width={24} height={24} /></div>)}</div></article>)}
      {props.batches.map((batch) => <article className={styles.runGroup} key={batch.id}><header><div><p>{batch.prompt}</p><small>{batch.catalogModelName ?? getGenerationModel(batch.modelId).name} · {getGenerationRatio(batch.aspectRatio).label} · {batch.resolution} · {batch.time}</small></div></header><div className={styles.mediaGrid}>{batch.images.map((image, index) => { const item = { key: `${batch.id}-${image.id}`, batch, image, index }; return <RunMediaTile key={item.key} item={item} onOpen={() => setViewerKey(item.key)} downloading={props.isDownloading(batch, image)} onDownload={() => props.onDownload(batch, image, index)} />; })}</div></article>)}
      {!props.isGenerating && props.runs.length === 0 && props.batches.length === 0 && <div className={styles.emptyRuns}><Image src="/goodgood-g-icon.svg" alt="" width={32} height={32} /><h2>描述你想创作的画面</h2><p>设置参数并输入提示词后，生成结果会出现在这里。</p></div>}
    </section>
    {viewerKey && <MediaViewer items={viewerItems} activeKey={viewerKey} onActiveKeyChange={setViewerKey} onClose={() => setViewerKey(null)} onDownload={props.onDownload} isDownloading={props.isDownloading} onUse={useViewerItem} />}
    {previewReference?.status === "ready" && <ReferenceQuickEditor key={previewReference.id} reference={previewReference} ordinal={previewReferenceIndex + 1} materials={props.referenceEditorMaterials} onClose={() => setPreviewReferenceId(null)} onInsertPrompt={text => props.onPromptChange(`${props.prompt.trimEnd()}${props.prompt.trim() ? "\n" : ""}${text}`)} onSave={props.onSaveReferenceEdit} />}
  </main>;
}
