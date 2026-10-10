"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, Download, ImageIcon, LoaderCircle, Plus, RefreshCw, Settings2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { AddReferenceMenu, Menu, MenuItem, ReferenceThumb } from "@/features/design-system";
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
  onOpenReferenceLibrary: () => void;
  onAddRecentReference: (id: string) => void;
  onRemoveReference: (reference: GenerationReference) => void;
  onRetryReference: (reference: GenerationReference) => void;
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
}>;

function FieldSelect({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return <div className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    <Menu align="start" label={`${label}选项`} trigger={<button type="button" className={styles.selectTrigger}><span>{value}</span><ChevronDown aria-hidden="true" /></button>}>
      {children}
    </Menu>
  </div>;
}

function RunMediaTile({ item, onOpen, onDownload, downloading }: { item: ViewerItem; onOpen: () => void; onDownload: () => void; downloading: boolean }) {
  const model = item.batch.catalogModelName ?? getGenerationModel(item.batch.modelId).name;
  return <article className={styles.mediaTile}>
    <button type="button" className={styles.mediaOpen} aria-label={`查看 ${model} 生成的图片 ${item.index + 1}`} onClick={onOpen}>
      <PrivateObjectImage src={item.image.previewUrl} alt={`${model} 生成的图片 ${item.index + 1}`} style={{ objectPosition: item.image.previewPosition }} />
    </button>
    <button type="button" className={styles.mediaDownload} aria-label={downloading ? "正在下载图片" : "下载图片"} disabled={downloading} onClick={onDownload}>
      {downloading ? <LoaderCircle className={styles.spin} /> : <Download />}
    </button>
  </article>;
}

function MediaViewer({ items, activeKey, onActiveKeyChange, onClose, onDownload, isDownloading }: { items: readonly ViewerItem[]; activeKey: string; onActiveKeyChange: (key: string) => void; onClose: () => void; onDownload: ImageCreatePageProps["onDownload"]; isDownloading: ImageCreatePageProps["isDownloading"] }) {
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
  if (!active) return null;
  const modelName = active.batch.catalogModelName ?? getGenerationModel(active.batch.modelId).name;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className={styles.viewer} onKeyDown={handleKeyDown} onOpenAutoFocus={(event) => event.preventDefault()}>
      <DialogTitle className={styles.visuallyHidden}>图片查看器</DialogTitle>
      <DialogDescription className={styles.visuallyHidden}>使用方向键切换图片</DialogDescription>
      <section className={styles.viewerStage} aria-label="大图预览">
        <button className={styles.viewerClose} type="button" aria-label="关闭图片查看器" onClick={onClose}><X /></button>
        <PrivateObjectImage src={active.image.detailUrl ?? active.image.previewUrl} alt={`${modelName} 生成的图片`} loading="eager" style={{ objectPosition: active.image.previewPosition }} />
      </section>
      <aside className={styles.viewerInfo} aria-label="图片信息">
        <header><div><small>{active.batch.dateLabel} · {active.batch.time}</small><strong>{modelName}</strong></div><button type="button" aria-label="下载图片" disabled={isDownloading(active.batch, active.image)} onClick={() => onDownload(active.batch, active.image, active.index)}>{isDownloading(active.batch, active.image) ? <LoaderCircle className={styles.spin} /> : <Download />}</button></header>
        <section><span>提示词</span><p>{active.batch.prompt}</p></section>
        <section><span>生成参数</span><dl><div><dt>模型</dt><dd>{modelName}</dd></div><div><dt>画面比例</dt><dd>{getGenerationRatio(active.batch.aspectRatio).label}</dd></div><div><dt>分辨率</dt><dd>{formatGenerationResolution(active.batch.resolution, active.image)}</dd></div><div><dt>参考图</dt><dd>{active.batch.referenceCount ? `${active.batch.referenceCount} 张` : "无"}</dd></div></dl></section>
        <nav className={styles.viewerRail} aria-label="本次创作图片">{items.map((item, index) => <button type="button" key={item.key} aria-label={`查看第 ${index + 1} 张图片`} aria-current={item.key === active.key ? "true" : undefined} onClick={() => onActiveKeyChange(item.key)}><PrivateObjectImage src={item.image.previewUrl} alt="" /></button>)}</nav>
      </aside>
    </DialogContent>
  </Dialog>;
}

export function ImageCreatePage(props: ImageCreatePageProps) {
  const [attempted, setAttempted] = useState(false);
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
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

  const generate = () => {
    setAttempted(true);
    if (!props.prompt.trim()) { promptRef.current?.focus(); return; }
    if (disabled) return;
    props.onGenerate();
  };

  return <main className={styles.createPage}>
    <section className={styles.settingsPanel} aria-label="图片设置">
      <header className={styles.panelHeader}><h1>图片</h1></header>
      <div className={styles.panelFields}>
        <FieldSelect label="模型" value={activeModel.name}>{props.modelOptions.map((option) => <MenuItem key={option.catalogId ?? option.id} onSelect={() => props.onModelChange(option.catalogId, option.id)}><span className={styles.modelMenuCopy}><strong>{option.name}</strong>{option.description && <small>{option.description}</small>}</span>{option.id === props.modelId && option.catalogId === props.catalogModelId ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect>
        <div className={styles.field}>
          <div className={styles.fieldHeading}><span className={styles.fieldLabel}>参考图</span><small>{props.references.length} / {MAX_GENERATION_REFERENCES}</small></div>
          <div className={styles.references}>{props.references.map((reference, index) => <ReferenceThumb key={reference.id} item={reference} ordinal={index + 1} onRemove={() => props.onRemoveReference(reference)} onRetry={() => props.onRetryReference(reference)} />)}<AddReferenceMenu disabled={props.references.length >= MAX_GENERATION_REFERENCES} accept=".jpg,.jpeg,.png,image/jpeg,image/png" onFiles={props.onReferenceFiles} onLibrary={props.onOpenReferenceLibrary} recent={props.recentReferences} onRecent={props.onAddRecentReference} /></div>
          {uploadFailed.map((reference) => <div key={reference.id} className={styles.inlineNotice} role="alert"><strong>{reference.name} 上传失败</strong><span>{reference.errorMessage ?? "请重试或更换图片。"}</span></div>)}
        </div>
        <label className={styles.field}><span className={styles.fieldLabel}>提示词</span><textarea ref={promptRef} className={missingPrompt ? styles.invalid : undefined} rows={6} value={props.prompt} onChange={(event) => { props.onPromptChange(event.target.value); if (event.target.value.trim()) setAttempted(false); }} placeholder="描述你想创作的画面…" aria-invalid={missingPrompt || undefined} aria-describedby={missingPrompt ? "image-prompt-error" : undefined} />{missingPrompt && <span id="image-prompt-error" className={styles.fieldError} role="alert">请输入画面描述后再生成。</span>}</label>
        <div className={styles.fieldRow}>
          <FieldSelect label="画面比例" value={ratio.label}>{getGenerationRatioOptions(props.modelId).map((option) => <MenuItem key={option.id} onSelect={() => props.onAspectRatioChange(option.id)}><span>{option.label}</span>{getGenerationModelRatioIndex(props.modelId, props.aspectRatio) === getGenerationModelRatioIndex(props.modelId, option.id) ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect>
          <FieldSelect label="分辨率" value={props.resolution}>{GENERATION_RESOLUTION_OPTIONS.map((option) => <MenuItem key={option.value} onSelect={() => props.onResolutionChange(option.value)}><span>{option.label}</span>{props.resolution === option.value ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect>
        </div>
        <div className={styles.field}><span className={styles.fieldLabel}>数量</span><div className={styles.segmented}>{GENERATION_COUNTS.map((value) => <button type="button" key={value} aria-pressed={props.count === value} onClick={() => props.onCountChange(value)}>{value}</button>)}</div></div>
        {isGptImageModelId(props.modelId) && <FieldSelect label="质量" value={activeQuality}>{qualityOptions.map((option) => <MenuItem key={option.value} onSelect={() => props.onQualityChange(option.value)}><span>{option.label}</span>{props.quality === option.value ? <span aria-hidden="true">✓</span> : null}</MenuItem>)}</FieldSelect>}
      </div>
      <footer className={styles.generateFooter}>
        {insufficientCredits && <div className={styles.creditNotice} role="alert"><span>需要 {props.requiredCredits} 积分，当前余额 {props.availableCredits}</span><button type="button" onClick={props.onCredits}>补充积分</button></div>}
        <button type="button" className={styles.generateButton} disabled={disabled} onClick={generate}>{props.isGenerating ? <LoaderCircle className={styles.spin} /> : <ImageIcon />}<span>{props.isGenerating ? `继续生成 ${props.count} 张` : `生成 ${props.count} 张`}</span><strong>{props.billingLabel}</strong></button>
      </footer>
    </section>

    <section className={styles.runPane} aria-label="图片生成记录">
      <header className={styles.runHeader}><div><h2>{props.projectName ?? "本次创作"}</h2>{props.isGenerating && <span role="status"><LoaderCircle className={styles.spin} />{props.stageText}</span>}</div><div>{props.batches.length > 0 && <button type="button" onClick={props.onSaveProject}><Plus />{props.projectName ? "项目设置" : "保存为项目"}</button>}{props.projectName && <button type="button" onClick={props.onNewCreation}><Plus />新建创作</button>}</div></header>
      {props.runs.filter((run) => run.job.error).map((run) => <article className={styles.failedRun} key={run.key} role="alert"><div><strong>{run.job.error?.title ?? "生成失败"}</strong><p>{run.job.error?.message}</p><small>未扣除积分 · {run.job.error?.code}</small></div><div><button type="button" onClick={() => props.onRetryRun(run)}><RefreshCw />重新生成</button><button type="button" onClick={() => props.onRestoreRun(run.job.input)}><Settings2 />修改设置</button></div></article>)}
      {props.runs.filter((run) => !run.job.error && run.job.state !== "succeeded").map((run) => <article className={styles.runGroup} key={run.key}><header><div><p>{run.job.input.prompt}</p><small>{getGenerationModel(run.job.input.modelId).name} · {getGenerationRatio(run.job.input.aspectRatio).label} · {run.job.input.resolution}</small></div><span role="status"><LoaderCircle className={styles.spin} />生成中</span></header><div className={styles.mediaGrid}>{Array.from({ length: run.job.input.count }, (_, index) => <div className={styles.mediaSkeleton} key={index}><Image src="/goodgood-g-icon.svg" alt="" width={24} height={24} /></div>)}</div></article>)}
      {props.batches.map((batch) => <article className={styles.runGroup} key={batch.id}><header><div><p>{batch.prompt}</p><small>{batch.catalogModelName ?? getGenerationModel(batch.modelId).name} · {getGenerationRatio(batch.aspectRatio).label} · {batch.resolution} · {batch.time}</small></div></header><div className={styles.mediaGrid}>{batch.images.map((image, index) => { const item = { key: `${batch.id}-${image.id}`, batch, image, index }; return <RunMediaTile key={item.key} item={item} onOpen={() => setViewerKey(item.key)} downloading={props.isDownloading(batch, image)} onDownload={() => props.onDownload(batch, image, index)} />; })}</div></article>)}
      {!props.isGenerating && props.runs.length === 0 && props.batches.length === 0 && <div className={styles.emptyRuns}><Image src="/goodgood-g-icon.svg" alt="" width={32} height={32} /><h2>描述你想创作的画面</h2><p>设置参数并输入提示词后，生成结果会出现在这里。</p></div>}
    </section>
    {viewerKey && <MediaViewer items={viewerItems} activeKey={viewerKey} onActiveKeyChange={setViewerKey} onClose={() => setViewerKey(null)} onDownload={props.onDownload} isDownloading={props.isDownloading} />}
  </main>;
}
