"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";
import { ReferenceQuickEditor } from "@/features/references/reference-quick-editor";
import { CreationModeSwitch } from "@/features/creation/creation-mode-switch";
import { CreationPromptTextarea } from "@/features/creation/creation-prompt-textarea";
import { getGenerationPromptStatus } from "@/shared/contracts/generation-prompt-limits.mjs";
import promptStatusStyles from "./creation-prompt-status.module.css";
import { ParameterChoiceGroup } from "@/features/creation/parameter-choice-group";
import { useParameterDrawerViewport } from "@/features/creation/use-parameter-drawer-viewport";
import { useComposerFileDrop } from "@/features/creation/use-composer-file-drop";
import type { CreationMode } from "@/features/creation/video-generation-options";
import {
  DEFAULT_GPT_IMAGE_OUTPUT_FORMAT,
  GENERATION_RATIO_MODES,
  GENERATION_RESOLUTION_OPTIONS,
  GPT_IMAGE_BACKGROUND_OPTIONS,
  GPT_IMAGE_OUTPUT_FORMAT_OPTIONS,
  getGptImageQualityOptions,
  formatPixelDimensions,
  getDefaultGenerationRatioForModelMode,
  isGenerationCountSupported,
  getGenerationModelRatioIndex,
  getGenerationPixelDimensions,
  getGenerationRatio,
  getGenerationRatioOptions,
  getRatioFrame,
} from "@/features/creation/generation-options";
import {
  GENERATION_MODEL_CATALOG,
  getGenerationModel,
  type GenerationModelIcon,
} from "@/features/models/catalog";
import {
  GENERATION_COUNTS,
  isGptImageModelId,
  MAX_GENERATION_REFERENCES,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationModelId,
  type GenerationReference,
  type GenerationResolution,
  type GptImageBackground,
  type GptImageOutputFormat,
  type GptImageQuality,
} from "@/shared/contracts/generation";
import {
  ArrowUp,
  CircleAlert,
  ChevronDown,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { ManagedImageOption } from "@/shared/contracts/model-management";
import { modelSpecificationPrices } from "@/shared/contracts/banana-lines.mjs";
import type { ManagedModel } from "@/shared/contracts/model-management";
import type { BananaLine } from "@/shared/contracts/generation";
import { supportsImageLines } from "@/shared/contracts/banana-lines.mjs";
import { BananaLineSelector } from "./banana-line-selector";

export type CreationComposerProps = Readonly<{
  showModeSwitch?: boolean;
  promptLabel?: string;
  promptPlaceholder?: string;
  managedModel?: ManagedModel;
  imageLine?: BananaLine;
  onImageLineChange?: (line: BananaLine) => void;
  modelOptions?: readonly ManagedImageOption[];
  catalogModelId?: string;
  onCatalogModelChange?: (id: string, adapterId: GenerationModelId) => void;
  mode: CreationMode;
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  googleSearch?: boolean;
  quality?: GptImageQuality;
  background?: GptImageBackground;
  outputFormat?: GptImageOutputFormat;
  drawerOpen: boolean;
  isGenerating: boolean;
  billingLabel: string;
  billingDescription: string;
  onPromptChange: (prompt: string) => void;
  onModeChange: (mode: CreationMode) => void;
  onReferenceFiles: (files: readonly File[]) => void;
  onDropFiles?: (files: readonly File[]) => void;
  onOpenReferenceLibrary?: () => void;
  onRemoveReference: (reference: GenerationReference) => void;
  onRetryReference?: (reference: GenerationReference) => void;
  onReorderReference?: (sourceId: string, targetId: string) => void;
  referenceEditorMaterials?: readonly ReferenceMaterial[];
  onSaveReferenceEdit?: (source: GenerationReference, file: File) => Promise<void>;
  onModelChange: (modelId: GenerationModelId) => void;
  onAspectRatioChange: (ratio: GenerationAspectRatio) => void;
  onResolutionChange: (resolution: GenerationResolution) => void;
  onCountChange: (count: GenerationCount) => void;
  onGoogleSearchChange?: (enabled: boolean) => void;
  onQualityChange?: (quality: GptImageQuality) => void;
  onBackgroundChange?: (background: GptImageBackground) => void;
  onOutputFormatChange?: (outputFormat: GptImageOutputFormat) => void;
  onDrawerOpenChange: (open: boolean) => void;
  onGenerate: () => void;
}>;

function ModelIcon({ icon }: { icon: GenerationModelIcon }) {
  const isNanoBanana = icon === "nano";

  return (
    <span className={`model-icon ${icon}`}>
      <Image
        src={isNanoBanana ? "/model-icons/nanobanana-color.svg"
          : icon === "bytedance" ? "/model-icons/bytedance-color.svg" : "/model-icons/openai.svg"}
        alt=""
        width={isNanoBanana ? 26 : 25}
        height={isNanoBanana ? 26 : 25}
        unoptimized
      />
    </span>
  );
}

export function CreationComposer({
  showModeSwitch = true,
  promptLabel = '画面描述',
  promptPlaceholder = '描述你想创作的画面…',
  managedModel,
  imageLine = "special",
  onImageLineChange = () => {},
  modelOptions,
  catalogModelId,
  onCatalogModelChange,
  mode,
  prompt,
  references,
  modelId,
  aspectRatio,
  resolution,
  count,
  googleSearch = false,
  quality = "auto",
  background = "auto",
  outputFormat = isGptImageModelId(modelId)
    ? DEFAULT_GPT_IMAGE_OUTPUT_FORMAT
    : "png",
  drawerOpen,
  isGenerating,
  billingLabel,
  billingDescription,
  onPromptChange,
  onModeChange,
  onReferenceFiles,
  onDropFiles,
  onOpenReferenceLibrary = () => {},
  onRemoveReference,
  onRetryReference,
  onReorderReference,
  referenceEditorMaterials = [],
  onSaveReferenceEdit,
  onModelChange,
  onAspectRatioChange,
  onResolutionChange,
  onCountChange,
  onGoogleSearchChange = () => {},
  onQualityChange = () => {},
  onBackgroundChange = () => {},
  onOutputFormatChange = () => {},
  onDrawerOpenChange,
  onGenerate,
}: CreationComposerProps) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [draggedReferenceId, setDraggedReferenceId] = useState<string | null>(null);
  const [dragTargetReferenceId, setDragTargetReferenceId] = useState<string | null>(null);
  const [previewReferenceId, setPreviewReferenceId] = useState<string | null>(null);
  const suppressReferencePreviewRef = useRef(false);
  const canReorderReferences = references.length > 1 && onReorderReference !== undefined;
  const previewReferenceIndex = references.findIndex(
    (reference) => reference.id === previewReferenceId,
  );
  const previewReference = previewReferenceIndex >= 0
    ? references[previewReferenceIndex]
    : null;
  const activeModel = modelOptions?.find((model) => model.catalogId === (catalogModelId ?? modelId)) ?? getGenerationModel(modelId);
  const promptStatus = getGenerationPromptStatus(modelId, prompt);
  const activeRatio = getGenerationRatio(aspectRatio);
  const ratioOptions = getGenerationRatioOptions(modelId);
  const ratioIndex = getGenerationModelRatioIndex(modelId, aspectRatio);
  const pixelDimensions = getGenerationPixelDimensions(
    modelId,
    aspectRatio,
    resolution,
  );
  const ratioFrame = getRatioFrame(activeRatio.value);

  const handleReferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onReferenceFiles(files);
    event.target.value = "";
  };

  const openFilePicker = () => {
    if (references.length >= MAX_GENERATION_REFERENCES) {
      toast.info(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图`);
      return;
    }
    referenceInputRef.current?.click();
  };

  const composerRef = useParameterDrawerViewport(drawerOpen);
  const fileDrop = useComposerFileDrop(onDropFiles ?? onReferenceFiles);

  return (
    <section
      ref={composerRef}
      className={`composer ${drawerOpen ? "drawer-open" : ""} ${isGenerating ? "is-generating" : ""} ${fileDrop.dragActive ? "is-file-drop-target" : ""}`}
      aria-label="图像生成区域"
      onDragEnter={fileDrop.onDragEnter}
      onDragOver={fileDrop.onDragOver}
      onDragLeave={fileDrop.onDragLeave}
      onDrop={fileDrop.onDrop}
    >
      {references.length > 0 && (
        <div className="reference-tray" aria-label="已添加的参考图片">
          <div className="reference-thumbnails">
            {references.map((image, index) => (
              <div
                className={`reference-thumbnail ${image.status} ${canReorderReferences ? "is-reorderable" : ""} ${draggedReferenceId === image.id ? "is-dragging" : ""} ${dragTargetReferenceId === image.id ? "is-drag-target" : ""}`}
                key={image.id}
                role="group"
                tabIndex={image.status === "ready" || canReorderReferences ? 0 : -1}
                draggable={canReorderReferences}
                aria-haspopup={image.status === "ready" ? "dialog" : undefined}
                aria-label={`图 ${index + 1}，${image.name}${image.status === "ready" ? "，点击查看大图" : ""}${canReorderReferences ? "，可拖拽排序" : ""}`}
                aria-keyshortcuts={
                  image.status === "ready"
                    ? canReorderReferences
                      ? "Enter Space Alt+ArrowLeft Alt+ArrowRight"
                      : "Enter Space"
                    : canReorderReferences
                      ? "Alt+ArrowLeft Alt+ArrowRight"
                      : undefined
                }
                title={`${image.errorMessage ?? image.name}${image.status === "ready" ? " · 点击查看大图" : ""}${canReorderReferences ? " · 拖拽排序" : ""}`}
                onClick={() => {
                  if (image.status !== "ready" || suppressReferencePreviewRef.current) return;
                  setPreviewReferenceId(image.id);
                }}
                onDragStart={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest(".reference-thumbnail-remove, .reference-thumbnail-retry")
                  ) {
                    event.preventDefault();
                    return;
                  }
                  suppressReferencePreviewRef.current = true;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", image.id);
                  setDraggedReferenceId(image.id);
                }}
                onDragEnter={() => {
                  if (draggedReferenceId && draggedReferenceId !== image.id) {
                    setDragTargetReferenceId(image.id);
                  }
                }}
                onDragOver={(event) => {
                  if (!draggedReferenceId || draggedReferenceId === image.id) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  if (Array.from(event.dataTransfer.types).includes("Files")) return;
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData("text/plain") || draggedReferenceId;
                  if (sourceId && sourceId !== image.id) onReorderReference?.(sourceId, image.id);
                  setDraggedReferenceId(null);
                  setDragTargetReferenceId(null);
                }}
                onDragEnd={() => {
                  setDraggedReferenceId(null);
                  setDragTargetReferenceId(null);
                  window.setTimeout(() => {
                    suppressReferencePreviewRef.current = false;
                  }, 0);
                }}
                onKeyDown={(event) => {
                  if (event.currentTarget !== event.target) return;
                  if (
                    event.altKey &&
                    (event.key === "ArrowLeft" || event.key === "ArrowRight")
                  ) {
                    const targetIndex = event.key === "ArrowLeft" ? index - 1 : index + 1;
                    const target = references[targetIndex];
                    if (!target) return;
                    event.preventDefault();
                    onReorderReference?.(image.id, target.id);
                    return;
                  }
                  if (
                    image.status === "ready" &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    setPreviewReferenceId(image.id);
                  }
                }}
              >
                <PrivateObjectImage src={image.url} alt={`参考图 ${index + 1}`} loading="eager" />
                <span className="reference-thumbnail-ordinal">图 {index + 1}</span>
                {image.status !== "ready" && (
                  <span
                    className="reference-thumbnail-status"
                    aria-label={
                      image.status === "uploading"
                        ? `参考图 ${index + 1} 正在上传`
                        : `参考图 ${index + 1} 上传失败`
                    }
                  >
                    {image.status === "uploading" ? (
                      <LoaderCircle size={15} />
                    ) : (
                      <CircleAlert size={15} />
                    )}
                  </span>
                )}
                {image.status === "failed" && onRetryReference && (
                  <button
                    className="reference-thumbnail-retry"
                    aria-label={`重试上传参考图 ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRetryReference(image);
                    }}
                  >重试</button>
                )}
                <button
                  className="reference-thumbnail-remove"
                  aria-label={`移除参考图 ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveReference(image);
                  }}
                >
                  <X size={8} strokeWidth={2.2} />
                </button>
              </div>
            ))}
            {references.length < MAX_GENERATION_REFERENCES && (
              <button
                className="reference-add-more"
                aria-label="从资产继续添加参考图片"
                onClick={onOpenReferenceLibrary}
              >
                <Plus size={15} />
                <span>素材库</span>
              </button>
            )}
          </div>
        </div>
      )}

      {references.some((image) => image.status === "failed") && (
        <div className="reference-upload-errors" role="alert">
          {references.filter((image) => image.status === "failed").map((image) => (
            <p key={image.id}>{image.name}：{image.errorMessage ?? "上传失败，请重试。"}</p>
          ))}
        </div>
      )}

      <div className="prompt-row">
        <div className="reference-control">
          <input
            ref={referenceInputRef}
            className="reference-input"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            disabled={references.length >= MAX_GENERATION_REFERENCES}
            onChange={handleReferenceChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="reference-button"
                aria-label={references.length >= MAX_GENERATION_REFERENCES ? "参考图片已达到上限" : "添加参考图片，最多 10 张"}
                disabled={references.length >= MAX_GENERATION_REFERENCES}
              >
                <ImagePlus size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="reference-source-menu" align="start" sideOffset={7}>
              <DropdownMenuItem onSelect={openFilePicker}>
                <Upload size={15} />
                上传本地图片
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenReferenceLibrary}>
                <Images size={15} />
                从资产选择
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CreationPromptTextarea
          label={promptLabel}
          value={prompt}
          onValueChange={onPromptChange}
          placeholder={promptPlaceholder}
        />
        <div className="prompt-actions">
          <span
            className="composer-price"
            aria-label={billingDescription}
            title={billingDescription}
          >
            {billingLabel}
          </span>
          <button
            className={`prompt-action settings-toggle ${drawerOpen ? "active" : ""}`}
            aria-label="展开生成参数"
            aria-expanded={drawerOpen}
            onClick={() => onDrawerOpenChange(!drawerOpen)}
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            className={`send-button ${isGenerating ? "generating" : ""}`}
            aria-label={isGenerating ? "继续生成图片" : "生成图片"}
            disabled={promptStatus.tooLong}
            onClick={onGenerate}
          >
            <ArrowUp className="send-arrow" size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {promptStatus.length > 0 && <div className={promptStatusStyles.status}>
        {promptStatus.errorMessage && <p className={`${promptStatusStyles.message} ${promptStatusStyles.error}`} role="alert">{promptStatus.errorMessage}</p>}
        {promptStatus.advice && <p className={promptStatusStyles.message}>{promptStatus.advice}</p>}
        <span className={promptStatusStyles.count} aria-label={`提示词 ${promptStatus.length} / ${promptStatus.maxLength} 个字符`}>
          {promptStatus.length.toLocaleString("zh-CN")} / {promptStatus.maxLength.toLocaleString("zh-CN")}
        </span>
      </div>}

      {showModeSwitch && <CreationModeSwitch value={mode} onChange={onModeChange} />}

      <div className="parameter-drawer" aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <div className="drawer-overflow">
          <div className="drawer-content">
            <div className="parameter-group ratio-group">
              <label>画面比例</label>
              <div className="ratio-control">
                <svg className="ratio-preview" viewBox="0 0 120 112" role="img" aria-label={`当前画面比例 ${activeRatio.label}`}>
                  <rect x={ratioFrame.guideX} y={ratioFrame.guideY} width={ratioFrame.guideWidth} height={ratioFrame.guideHeight} rx="6" fill="none" stroke="#d6d6dc" strokeWidth="1" strokeDasharray="4 4" />
                  <rect x={ratioFrame.x} y={ratioFrame.y} width={ratioFrame.width} height={ratioFrame.height} rx="6" fill="none" stroke="#50505a" strokeWidth="1.25" />
                  <text x="60" y="59" textAnchor="middle" fill="#3c3c45" fontSize="10">{activeRatio.label}</text>
                </svg>
                <div className="ratio-editor">
                  <ParameterChoiceGroup
                    label="画面方向"
                    className="ratio-modes"
                    value={activeRatio.mode}
                    options={GENERATION_RATIO_MODES.map(([value, label]) => ({ value, label }))}
                    onValueChange={(mode) => onAspectRatioChange(getDefaultGenerationRatioForModelMode(modelId, mode))}
                  />
                  <Slider
                    className="ratio-slider"
                    min={0}
                    max={ratioOptions.length - 1}
                    step={1}
                    value={[ratioIndex]}
                    onValueChange={(value) => {
                      const option = ratioOptions[value[0]];
                      if (option) onAspectRatioChange(option.id);
                    }}
                    aria-label="调整画面比例"
                  />
                  <div className="ratio-readout">
                    <small>{formatPixelDimensions(pixelDimensions)}</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="parameter-group model-group">
              <label>生成模型</label>
              <div className="model-selector">
                <button
                  className={`model-trigger ${modelMenuOpen ? "open" : ""}`}
                  aria-expanded={modelMenuOpen}
                  aria-controls="model-options-drawer"
                  onClick={() => setModelMenuOpen((value) => !value)}
                >
                  <ModelIcon icon={activeModel.icon} />
                  <span className="model-copy">
                    <strong>{activeModel.name}</strong>
                    <small>{activeModel.description}</small>
                  </span>
                  {activeModel.recommended && <span className="recommended">推荐</span>}
                  <ChevronDown className="model-chevron" size={15} />
                </button>
                <div
                  id="model-options-drawer"
                  className={`model-select-drawer ${modelMenuOpen ? "open" : ""}`}
                  aria-hidden={!modelMenuOpen}
                >
                  <div className="model-select-overflow">
                    <div className="model-options">
                      {(modelOptions ?? GENERATION_MODEL_CATALOG.map((model) => ({ ...model, catalogId: model.id }))).map((model) => (
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
                          <ModelIcon icon={model.icon} />
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
              {supportsImageLines(modelId) && <BananaLineSelector modelId={modelId} model={managedModel} resolution={resolution} value={imageLine} onChange={onImageLineChange} />}
              {modelId === "nano-banana-2" && (
                <div className="banana-model-options">
                  <div className="google-search-option">
                    <span>
                      <strong>谷歌搜索</strong>
                      <small>使用 Google Search 辅助生成</small>
                    </span>
                    <ParameterChoiceGroup
                      label="谷歌搜索"
                      className="google-search-options"
                      value={googleSearch}
                      options={[{ value: false, label: "关闭" }, { value: true, label: "开启" }]}
                      onValueChange={onGoogleSearchChange}
                    />
                  </div>
                </div>
              )}
              {isGptImageModelId(modelId) && (
                <div className="gpt-image-model-options">
                  <div className="gpt-image-option-section">
                    <label>质量</label>
                    {managedModel && modelSpecificationPrices(managedModel, imageLine)[resolution]?.qualities && <p className="text-xs text-zinc-500">自动质量按最高档计价；手动选择档位可降低费用。</p>}
                    <ParameterChoiceGroup
                      label="质量"
                      className={`gpt-image-option-options quality ${getGptImageQualityOptions(modelId).length > 4 ? "extended" : ""}`}
                      value={quality}
                      options={getGptImageQualityOptions(modelId)}
                      onValueChange={onQualityChange}
                    />
                  </div>
                  <div className="gpt-image-option-section">
                    <label>背景</label>
                    <ParameterChoiceGroup
                      label="背景"
                      className="gpt-image-option-options background"
                      value={background}
                      options={GPT_IMAGE_BACKGROUND_OPTIONS}
                      onValueChange={onBackgroundChange}
                    />
                  </div>
                  <div className="gpt-image-option-section">
                    <label>输出格式</label>
                    <ParameterChoiceGroup
                      label="输出格式"
                      className="gpt-image-option-options format"
                      value={outputFormat}
                      options={GPT_IMAGE_OUTPUT_FORMAT_OPTIONS.map((option) => ({
                        ...option,
                        disabled: background === "transparent" && option.value === "jpeg",
                        title: background === "transparent" && option.value === "jpeg" ? "透明背景仅支持 PNG 或 WebP" : undefined,
                      }))}
                      onValueChange={onOutputFormatChange}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="parameter-group output-group">
              <div className="output-section">
                <label>分辨率</label>
                <ParameterChoiceGroup
                  label="分辨率"
                  className="resolution-options"
                  value={resolution}
                  options={GENERATION_RESOLUTION_OPTIONS}
                  onValueChange={onResolutionChange}
                />
              </div>
              <div className="output-section">
                <label>生成数量</label>
                <ParameterChoiceGroup
                  label="生成数量"
                  className="choice-row compact"
                  value={count}
                  options={GENERATION_COUNTS.map((generationCount) => ({
                    value: generationCount,
                    label: generationCount,
                    disabled: !isGenerationCountSupported(modelId, generationCount),
                    title: isGenerationCountSupported(modelId, generationCount)
                      ? `生成 ${generationCount} 张` : "当前模型仅支持生成 1 张",
                  }))}
                  onValueChange={onCountChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewReference?.status === "ready" && (
        <ReferenceQuickEditor
          key={previewReference.id}
          reference={previewReference}
          ordinal={previewReferenceIndex + 1}
          materials={referenceEditorMaterials}
          onClose={() => setPreviewReferenceId(null)}
          onInsertPrompt={(text) => {
            const separator = prompt.trim().length > 0 ? "\n" : "";
            onPromptChange(`${prompt.trimEnd()}${separator}${text}`);
          }}
          onSave={onSaveReferenceEdit ?? (async () => {
            throw new Error("当前预览环境不支持保存编辑后的素材。");
          })}
        />
      )}
    </section>
  );
}
