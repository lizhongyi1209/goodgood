"use client";

import { PromptBatchSummary } from "@/features/creation/prompt-batch-summary";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { CreationModeSwitch } from "@/features/creation/creation-mode-switch";
import { SeedanceModelIcon } from "@/features/models/seedance-model-icon";
import { getRatioFrame } from "@/features/creation/generation-options";
import { VideoMaterialCreationDialog } from "@/features/creation/video-material-creation-dialog";
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
  AudioLines,
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
  onOpenReferenceLibrary: () => void;
  onRemoveReference: (reference: VideoReference) => void;
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

function resizePromptTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const verticalPadding =
    Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const maxHeight = lineHeight * 8 + verticalPadding;
  element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  const hasOverflow = element.scrollHeight > maxHeight;
  element.style.overflowY = hasOverflow ? "auto" : "hidden";
  element.classList.toggle("has-overflow", hasOverflow);
}

const referenceAcceptByMediaType = {
  image: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  video: "video/mp4,video/quicktime",
  audio: "audio/wav,audio/x-wav,audio/mpeg",
} as const satisfies Readonly<Record<VideoReferenceMediaType, string>>;

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function VideoCreationComposer({
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
  onOpenReferenceLibrary,
  onRemoveReference,
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
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [materialCreationOpen, setMaterialCreationOpen] = useState(false);
  const activeModel = getVideoGenerationModel(modelId);
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

  useEffect(() => {
    const element = promptInputRef.current;
    if (!element) return;
    const handleResize = () => resizePromptTextarea(element);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (promptInputRef.current) resizePromptTextarea(promptInputRef.current);
  }, [prompt]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onReferenceFiles(files);
    event.target.value = "";
  };

  return (
    <section
      className={`composer video-composer ${drawerOpen ? "drawer-open" : ""}`}
      aria-label="视频生成区域"
    >
      <CreationModeSwitch value={mode} onChange={onModeChange} />

      <input
        ref={referenceInputRef}
        className="reference-input"
        type="file"
        accept={referenceInputAccept}
        multiple
        disabled={!canUploadReference}
        onChange={handleFileChange}
      />

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
                <Images size={15} />从资产库选择
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
        <textarea
          ref={promptInputRef}
          aria-label="视频描述"
          value={prompt}
          rows={1}
          placeholder="描述画面、动作、镜头和声音…"
          onChange={(event) => {
            onPromptChange(event.target.value);
            resizePromptTextarea(event.currentTarget);
          }}
        />
        <div className="prompt-actions">
          <span
            className="composer-price video-interface-state"
            aria-label={interfaceAvailable ? "本地视频实测接口可用" : interfaceLabel}
            title={interfaceAvailable ? "本地实测模式，不计入资产库" : "视频接口与计价将在下一阶段接入"}
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
            className="send-button"
            aria-label={isGenerating ? "继续生成视频" : "生成视频"}
            disabled={!interfaceAvailable}
            onClick={onGenerate}
          >
            <span className="feihong-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      <PromptBatchSummary prompt={prompt} count={generationCount} media="video" />
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
                <div
                  className={`reference-thumbnail video-reference-thumbnail ${reference.mediaType}`}
                  key={reference.id}
                  role="group"
                  aria-label={`${mediaLabel}，${reference.name}，${videoReferenceRoleLabel(reference.role)}`}
                  title={reference.size > 0
                    ? `${reference.name} · ${formatFileSize(reference.size)}`
                    : reference.name}
                >
                  {reference.mediaType === "image" ? (
                    <PrivateObjectImage src={reference.url} alt={mediaLabel} />
                  ) : reference.mediaType === "video" ? (
                    <video src={reference.url} muted preload="metadata" aria-label={mediaLabel} />
                  ) : (
                    <span className="video-reference-placeholder"><AudioLines size={22} /></span>
                  )}
                  <span className="reference-thumbnail-ordinal">{previewLabel}</span>
                  <button
                    className="reference-thumbnail-remove"
                    aria-label={`移除${mediaLabel}`}
                    onClick={() => onRemoveReference(reference)}
                  >
                    <X size={8} strokeWidth={2.2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="parameter-drawer" aria-hidden={!drawerOpen}>
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
                <div className="video-ratio-options" aria-label="视频画面比例">
                  {VIDEO_RATIO_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={aspectRatio === option.id ? "selected" : ""}
                      aria-pressed={aspectRatio === option.id}
                      onClick={() => onAspectRatioChange(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
                      {VIDEO_GENERATION_MODEL_CATALOG.map((model) => (
                        <button
                          key={model.id}
                          className={`model-option ${modelId === model.id ? "selected" : ""}`}
                          aria-pressed={modelId === model.id}
                          onClick={() => {
                            onModelChange(model.id);
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
                <div className="choice-row compact video-generation-mode-options" aria-label="视频生成线路">
                  {VIDEO_PROVIDER_LINE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={providerLine === option.id ? "selected" : ""}
                      aria-pressed={providerLine === option.id}
                      onClick={() => onProviderLineChange(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="video-generation-mode-control">
                <label>生成模式</label>
                <div className="choice-row compact video-generation-mode-options" aria-label="视频生成模式">
                  {VIDEO_GENERATION_MODE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={generationMode === option.id ? "selected" : ""}
                      aria-pressed={generationMode === option.id}
                      onClick={() => onGenerationModeChange(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <small>{VIDEO_GENERATION_MODE_OPTIONS.find((option) => option.id === generationMode)?.description}</small>
              </div>
            </div>

            <div className="parameter-group output-group video-output-group">
              <div className="output-section">
                <label>清晰度</label>
                <div className={`resolution-options video-resolution-options columns-${activeModel.capabilities.resolutions.length}`}>
                  {activeModel.capabilities.resolutions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={resolution === option ? "selected" : ""}
                      aria-pressed={resolution === option}
                      onClick={() => onResolutionChange(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
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
                <div className="choice-row compact video-audio-options" aria-label="生成声音">
                  {[true, false].map((enabled) => (
                    <button
                      type="button"
                      key={String(enabled)}
                      className={generateAudio === enabled ? "selected" : ""}
                      aria-pressed={generateAudio === enabled}
                      onClick={() => onGenerateAudioChange(enabled)}
                    >
                      {enabled ? <Volume2 size={13} /> : <X size={13} />}
                      {enabled ? "有声" : "静音"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="output-section">
                <label>生成数量</label>
                <div className="choice-row compact video-count-options" aria-label="视频生成数量">
                  {VIDEO_GENERATION_COUNTS.map((count) => (
                    <button type="button" key={count} className={generationCount === count ? "selected" : ""} aria-pressed={generationCount === count} onClick={() => onGenerationCountChange(count)}>{count}</button>
                  ))}
                </div>
              </div>
              <div className="video-interface-note">
                <Upload size={12} />
                {interfaceAvailable
                  ? "本地实测接口已启用，结果不会写入资产库"
                  : "当前仅保存于本次页面会话，接口接入后再上传"}
              </div>
            </div>
          </div>
        </div>
      </div>

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
