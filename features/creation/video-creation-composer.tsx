"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { InputAttachment } from "@/components/ui/input-attachment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { CreationModeSwitch } from "@/features/creation/creation-mode-switch";
import { CreationPromptTextarea } from "@/features/creation/creation-prompt-textarea";
import { ParameterChoiceGroup } from "@/features/creation/parameter-choice-group";
import { useParameterDrawerViewport } from "@/features/creation/use-parameter-drawer-viewport";
import { useComposerFileDrop } from "@/features/creation/use-composer-file-drop";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import { getRatioFrame } from "@/features/creation/generation-options";
import { VideoMaterialCreationDialog } from "@/features/creation/video-material-creation-dialog";
import { VideoReferencePreviewDialog } from "@/features/creation/video-reference-preview-dialog";
import type { LocalVideoPreviewAvailability } from "@/features/creation/http-video-preview-boundary";
import {
  VIDEO_GENERATION_MODEL_CATALOG,
  VIDEO_GENERATION_COUNTS,
  VIDEO_GENERATION_MODE_OPTIONS,
  VIDEO_PROVIDER_LINE_OPTIONS,
  VIDEO_RATIO_OPTIONS,
  countVideoReferences,
  getVideoGenerationModel,
  getVideoReferenceLimits,
  videoReferenceRoleLabel,
  type CreationMode,
  type VideoAspectRatio,
  type VideoGenerationMode,
  type VideoGenerationModelId,
  type VideoGenerationCount,
  type VideoProviderLine,
  type VideoReference,
  type VideoReferenceMediaType,
  type VideoResolution,
} from "@/features/creation/video-generation-options";
import {
  ArrowUp,
  ChevronDown,
  Film,
  ImagePlus,
  Images,
  SlidersHorizontal,
  Upload,
  Volume2,
  X,
} from "lucide-react";

export type VideoCreationComposerProps = Readonly<{
  modelOptions?: readonly (ReturnType<typeof getVideoGenerationModel> & { catalogId: string })[];
  catalogModelId?: string;
  onCatalogModelChange?: (id: string, modelId: VideoGenerationModelId) => void;
  mode: CreationMode;
  prompt: string;
  references: readonly VideoReference[];
  generationMode: VideoGenerationMode;
  modelId: VideoGenerationModelId;
  providerLine: VideoProviderLine;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  durationSeconds: number;
  generationCount: VideoGenerationCount;
  generateAudio: boolean;
  drawerOpen: boolean;
  interfaceAvailability: LocalVideoPreviewAvailability;
  isGenerating: boolean;
  onModeChange: (mode: CreationMode) => void;
  onPromptChange: (prompt: string) => void;
  onReferenceFiles: (files: readonly File[]) => void;
  onDropFiles?: (files: readonly File[]) => void;
  onOpenReferenceLibrary: () => void;
  onRemoveReference: (reference: VideoReference) => void;
  onRetryReference?: (reference: VideoReference) => void;
  onGenerationModeChange: (generationMode: VideoGenerationMode) => void;
  onModelChange: (modelId: VideoGenerationModelId) => void;
  onProviderLineChange: (line: VideoProviderLine) => void;
  onAspectRatioChange: (ratio: VideoAspectRatio) => void;
  onResolutionChange: (resolution: VideoResolution) => void;
  onDurationChange: (duration: number) => void;
  onGenerationCountChange: (count: VideoGenerationCount) => void;
  onGenerateAudioChange: (enabled: boolean) => void;
  onDrawerOpenChange: (open: boolean) => void;
  onGenerate: () => void;
}>;

const referenceAcceptByMediaType = {
  image: "image/jpeg,image/png",
  video: "video/mp4",
  audio: "audio/mpeg",
} as const satisfies Readonly<Record<VideoReferenceMediaType, string>>;

export function VideoCreationComposer({
  modelOptions,
  catalogModelId,
  onCatalogModelChange,
  mode,
  prompt,
  references,
  generationMode,
  modelId,
  providerLine,
  aspectRatio,
  resolution,
  durationSeconds,
  generationCount,
  generateAudio,
  drawerOpen,
  interfaceAvailability,
  isGenerating,
  onModeChange,
  onPromptChange,
  onReferenceFiles,
  onDropFiles,
  onOpenReferenceLibrary,
  onRemoveReference,
  onRetryReference,
  onGenerationModeChange,
  onModelChange,
  onProviderLineChange,
  onAspectRatioChange,
  onResolutionChange,
  onDurationChange,
  onGenerationCountChange,
  onGenerateAudioChange,
  onDrawerOpenChange,
  onGenerate,
}: VideoCreationComposerProps) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [materialCreationOpen, setMaterialCreationOpen] = useState(false);
  const [previewReferenceId, setPreviewReferenceId] = useState<string | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewReferenceIndex = references.findIndex((reference) => reference.id === previewReferenceId);
  const previewReference = references[previewReferenceIndex];
  const previewReferenceOrdinal = previewReference
    ? references.slice(0, previewReferenceIndex + 1).filter((reference) => reference.mediaType === previewReference.mediaType).length
    : 0;
  const activeModel = modelOptions?.find((model) => model.catalogId === (catalogModelId ?? modelId)) ?? getVideoGenerationModel(modelId);
  const referenceLimits = getVideoReferenceLimits(modelId, generationMode);
  const referenceCounts = {
    image: countVideoReferences(references, "image"),
    video: countVideoReferences(references, "video"),
    audio: countVideoReferences(references, "audio"),
  };
  const referenceTotalRemaining = Math.max(0, referenceLimits.totalLimit - references.length);
  const referenceRemaining = {
    image: Math.max(0, Math.min(referenceLimits.imageLimit - referenceCounts.image, referenceTotalRemaining)),
    video: Math.max(0, Math.min(referenceLimits.videoLimit - referenceCounts.video, referenceTotalRemaining)),
    audio: Math.max(0, Math.min(referenceLimits.audioLimit - referenceCounts.audio, referenceTotalRemaining)),
  };
  const referenceInputAccept = (Object.keys(referenceRemaining) as VideoReferenceMediaType[])
    .filter((mediaType) => referenceRemaining[mediaType] > 0)
    .map((mediaType) => referenceAcceptByMediaType[mediaType])
    .join(",");
  const canUploadReference = referenceInputAccept.length > 0;
  const activeRatio = VIDEO_RATIO_OPTIONS.find((item) => item.id === aspectRatio) ?? VIDEO_RATIO_OPTIONS[0];
  const ratioFrame = getRatioFrame(activeRatio.value ?? 16 / 9);
  const interfaceAvailable = interfaceAvailability === "available";
  const interfaceLabel = interfaceAvailability === "checking"
    ? "接口检查中"
    : interfaceAvailable
      ? "接口可用"
      : "接口待接入";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onReferenceFiles(files);
    event.target.value = "";
  };

  const composerRef = useParameterDrawerViewport(drawerOpen);
  const fileDrop = useComposerFileDrop(onDropFiles ?? onReferenceFiles);

  return (
    <section
      ref={composerRef}
      className={`composer video-composer ${drawerOpen ? "drawer-open" : ""} ${fileDrop.dragActive ? "is-file-drop-target" : ""}`}
      aria-label="视频生成区域"
      onDragEnter={fileDrop.onDragEnter}
      onDragOver={fileDrop.onDragOver}
      onDragLeave={fileDrop.onDragLeave}
      onDrop={fileDrop.onDrop}
    >

      <input
        ref={referenceInputRef}
        className="reference-input"
        type="file"
        accept={referenceInputAccept}
        multiple
        disabled={!canUploadReference}
        onChange={handleFileChange}
      />

      {references.length > 0 && (
        <div className="reference-tray video-reference-tray" aria-label="已添加的视频创作素材">
          <div className="reference-thumbnails">
            {references.map((reference, index) => {
              const ordinal = references
                .slice(0, index + 1)
                .filter((item) => item.mediaType === reference.mediaType).length;
              const mediaLabel = reference.mediaType === "image"
                ? `图片 ${ordinal}`
                : reference.mediaType === "video"
                  ? `视频 ${ordinal}`
                  : `音频 ${ordinal}`;
              const previewLabel = generationMode === "first_last_frame"
                ? videoReferenceRoleLabel(reference.role)
                : mediaLabel.replace(" ", "");
              return (
                <InputAttachment key={reference.id} media={reference.mediaType} name={reference.name} description={previewLabel}
                  url={reference.url} state={reference.status} error={reference.errorMessage}
                  onPreview={(trigger) => { previewTriggerRef.current = trigger; setPreviewReferenceId(reference.id); }}
                  onRetry={onRetryReference ? () => onRetryReference(reference) : undefined}
                  onRemove={() => onRemoveReference(reference)} />
              );
            })}
          </div>
        </div>
      )}

      {references.some((reference) => reference.status === "failed") && (
        <div className="reference-upload-errors" role="alert">
          {references.filter((reference) => reference.status === "failed").map((reference) => (
            <p key={reference.id}>{reference.name}：{reference.errorMessage ?? "上传失败，请重试。"}</p>
          ))}
        </div>
      )}

      <div className="prompt-row">
        <div className="reference-control">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="reference-button"
                aria-label={`管理视频创作素材，当前模式还可添加 ${referenceTotalRemaining} 个`}
                disabled={referenceTotalRemaining <= 0 && references.length === 0}
              >
                <ImagePlus size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="reference-source-menu" align="start" sideOffset={7}>
              <DropdownMenuItem
                disabled={!canUploadReference}
                onSelect={() => referenceInputRef.current?.click()}
              >
                <Upload size={15} />上传素材
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={referenceTotalRemaining <= 0}
                onSelect={onOpenReferenceLibrary}
              >
                <Images size={15} />从资产选择
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={references.length === 0}
                onSelect={() => setMaterialCreationOpen(true)}
              >
                <Film size={15} />创建素材
                <span className="reference-source-limit">主动选择</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CreationPromptTextarea
          label="视频描述"
          value={prompt}
          placeholder="描述画面、动作、镜头和声音…"
          onValueChange={onPromptChange}
        />
        <div className="prompt-actions">
          <span
            className="composer-price video-interface-state"
            aria-label={interfaceAvailable ? "本地视频实测接口可用" : interfaceLabel}
            title={interfaceAvailable ? "本地实测模式，不计入资产" : "视频接口与计价将在下一阶段接入"}
          >
            {interfaceLabel}
          </span>
          <button
            className={`prompt-action settings-toggle ${drawerOpen ? "active" : ""}`}
            aria-label="展开视频生成参数"
            aria-expanded={drawerOpen}
            onClick={() => onDrawerOpenChange(!drawerOpen)}
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            className={`send-button ${isGenerating ? "generating" : ""}`}
            aria-label={isGenerating ? "继续生成视频" : "生成视频"}
            disabled={!interfaceAvailable}
            onClick={onGenerate}
          >
            <ArrowUp className="send-arrow" size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <CreationModeSwitch value={mode} onChange={onModeChange} />

      <div className="parameter-drawer" aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <div className="drawer-overflow">
          <div className="drawer-content video-drawer-content">
            <div className="parameter-group ratio-group">
              <label>画面比例</label>
              <div className="ratio-control video-ratio-control">
                <svg className="ratio-preview" viewBox="0 0 120 112" role="img" aria-label={`当前画面比例 ${activeRatio.label}`}>
                  {aspectRatio === "adaptive" && (
                    <rect x="13" y="19" width="94" height="74" rx="8" fill="none" stroke="#d6d6dc" strokeWidth="1" strokeDasharray="4 4" />
                  )}
                  <rect x={ratioFrame.x} y={ratioFrame.y} width={ratioFrame.width} height={ratioFrame.height} rx="6" fill="none" stroke="#50505a" strokeWidth="1.25" />
                  <text x="60" y="59" textAnchor="middle" fill="#3c3c45" fontSize="10">{activeRatio.label}</text>
                </svg>
                <ParameterChoiceGroup
                  label="视频画面比例"
                  className="video-ratio-options"
                  value={aspectRatio}
                  options={VIDEO_RATIO_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
                  onValueChange={onAspectRatioChange}
                />
              </div>
            </div>

            <div className="parameter-group model-group">
              <label>生成模型</label>
              <div className="model-selector">
                <button
                  className={`model-trigger ${modelMenuOpen ? "open" : ""}`}
                  aria-expanded={modelMenuOpen}
                  aria-controls="video-model-options-drawer"
                  onClick={() => setModelMenuOpen((value) => !value)}
                >
                  <SeedanceModelIcon />
                  <span className="model-copy">
                    <strong>{activeModel.name}</strong>
                    <small>{activeModel.description}</small>
                  </span>
                  {activeModel.recommended && <span className="recommended">推荐</span>}
                  <ChevronDown className="model-chevron" size={15} />
                </button>
                <div
                  id="video-model-options-drawer"
                  className={`model-select-drawer ${modelMenuOpen ? "open" : ""}`}
                  aria-hidden={!modelMenuOpen}
                >
                  <div className="model-select-overflow">
                    <div className="model-options">
                      {(modelOptions ?? VIDEO_GENERATION_MODEL_CATALOG.map((model) => ({ ...model, catalogId: model.id }))).map((model) => (
                        <button
                          key={model.catalogId}
                          className={`model-option ${(catalogModelId ?? modelId) === model.catalogId ? "selected" : ""}`}
                          aria-pressed={(catalogModelId ?? modelId) === model.catalogId}
                          onClick={() => {
                            if (onCatalogModelChange) onCatalogModelChange(model.catalogId, model.id);
                            else onModelChange(model.id);
                            setModelMenuOpen(false);
                          }}
                        >
                          <SeedanceModelIcon />
                          <span className="model-copy">
                            <strong>{model.name}</strong>
                            <small>{model.description}</small>
                          </span>
                          {model.recommended && <span className="recommended">推荐</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="video-model-note">
                <span>最长 {activeModel.capabilities.duration.max} 秒</span>
                <span>
                  {generationMode === "multimodal"
                    ? "支持图片、视频、音频参考"
                    : "仅支持 1–2 张首尾帧图片"}
                </span>
              </div>
              <div className="video-generation-mode-control">
                <label>线路</label>
                <ParameterChoiceGroup
                  label="视频生成线路"
                  className="choice-row compact video-generation-mode-options"
                  value={providerLine}
                  options={VIDEO_PROVIDER_LINE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
                  onValueChange={onProviderLineChange}
                />
              </div>
              <div className="video-generation-mode-control">
                <label>生成模式</label>
                <ParameterChoiceGroup
                  label="视频生成模式"
                  className="choice-row compact video-generation-mode-options"
                  value={generationMode}
                  options={VIDEO_GENERATION_MODE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
                  onValueChange={onGenerationModeChange}
                />
                <small>{VIDEO_GENERATION_MODE_OPTIONS.find((option) => option.id === generationMode)?.description}</small>
              </div>
            </div>

            <div className="parameter-group output-group video-output-group">
              <div className="output-section">
                <label>清晰度</label>
                <ParameterChoiceGroup
                  label="清晰度"
                  className={`resolution-options video-resolution-options columns-${activeModel.capabilities.resolutions.length}`}
                  value={resolution}
                  options={activeModel.capabilities.resolutions.map((option) => ({ value: option, label: option }))}
                  onValueChange={onResolutionChange}
                />
              </div>
              <div className="output-section video-duration-section">
                <label>时长 <strong>{durationSeconds} 秒</strong></label>
                <Slider
                  min={activeModel.capabilities.duration.min}
                  max={activeModel.capabilities.duration.max}
                  step={1}
                  value={[durationSeconds]}
                  onValueChange={(value) => onDurationChange(value[0] ?? durationSeconds)}
                  aria-label="视频时长"
                />
                <div className="video-duration-range">
                  <span>{activeModel.capabilities.duration.min} 秒</span>
                  <span>{activeModel.capabilities.duration.max} 秒</span>
                </div>
              </div>
              <div className="output-section">
                <label>声音</label>
                <ParameterChoiceGroup
                  label="生成声音"
                  className="choice-row compact video-audio-options"
                  value={generateAudio}
                  options={[
                    { value: true, label: <><Volume2 size={13} />有声</> },
                    { value: false, label: <><X size={13} />静音</> },
                  ]}
                  onValueChange={onGenerateAudioChange}
                />
              </div>
              <div className="output-section">
                <label>生成数量</label>
                <ParameterChoiceGroup
                  label="视频生成数量"
                  className="choice-row compact video-count-options"
                  value={generationCount}
                  options={VIDEO_GENERATION_COUNTS.map((count) => ({ value: count, label: count }))}
                  onValueChange={onGenerationCountChange}
                />
              </div>
              <div className="video-interface-note">
                <Upload size={12} />
                {interfaceAvailable
                  ? "本地实测接口已启用，结果不会写入资产"
                  : "当前仅保存于本次页面会话，接口接入后再上传"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewReference && (
        <VideoReferencePreviewDialog
          key={`${previewReference.id}:${previewReference.url}`}
          reference={previewReference}
          label={generationMode === "first_last_frame"
            ? videoReferenceRoleLabel(previewReference.role)
            : `${previewReference.mediaType === "image" ? "图片" : previewReference.mediaType === "video" ? "视频" : "音频"}${previewReferenceOrdinal}`}
          onClose={() => setPreviewReferenceId(null)}
          onReturnFocus={() => previewTriggerRef.current?.focus()}
        />
      )}

      {materialCreationOpen && (
        <VideoMaterialCreationDialog
          open
          references={references}
          creationAvailable={false}
          onOpenChange={setMaterialCreationOpen}
          onCreate={() => undefined}
        />
      )}
    </section>
  );
}
