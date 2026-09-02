"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { PrivateObjectImage } from "@/components/ui/private-object-image";

import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_GENERATION_RATIO_BY_MODE,
  GENERATION_RATIO_MODES,
  GENERATION_RATIO_OPTIONS,
  GENERATION_RESOLUTION_OPTIONS,
  formatPixelDimensions,
  getGenerationRatio,
  getGenerationRatioIndex,
  getRatioFrame,
} from "@/features/creation/generation-options";
import {
  GENERATION_MODEL_CATALOG,
  getGenerationModel,
  type GenerationModelIcon,
} from "@/features/models/catalog";
import {
  GENERATION_COUNTS,
  MAX_GENERATION_REFERENCES,
  type GenerationAspectRatio,
  type GenerationCount,
  type GenerationModelId,
  type GenerationReference,
  type GenerationResolution,
} from "@/shared/contracts/generation";
import nanoBananaIcon from "@lobehub/icons-static-svg/icons/nanobanana-color.svg";
import openAiIcon from "@lobehub/icons-static-svg/icons/openai.svg";
import {
  CircleAlert,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

export type CreationComposerProps = Readonly<{
  prompt: string;
  references: readonly GenerationReference[];
  modelId: GenerationModelId;
  aspectRatio: GenerationAspectRatio;
  resolution: GenerationResolution;
  count: GenerationCount;
  drawerOpen: boolean;
  isGenerating: boolean;
  billingLabel: string;
  billingDescription: string;
  onPromptChange: (prompt: string) => void;
  onReferenceFiles: (files: readonly File[]) => void;
  onRemoveReference: (reference: GenerationReference) => void;
  onModelChange: (modelId: GenerationModelId) => void;
  onAspectRatioChange: (ratio: GenerationAspectRatio) => void;
  onResolutionChange: (resolution: GenerationResolution) => void;
  onCountChange: (count: GenerationCount) => void;
  onDrawerOpenChange: (open: boolean) => void;
  onGenerate: () => void;
}>;

function ModelIcon({ icon }: { icon: GenerationModelIcon }) {
  const isNanoBanana = icon === "nano";

  return (
    <span className={`model-icon ${icon}`}>
      <Image
        src={isNanoBanana ? nanoBananaIcon : openAiIcon}
        alt=""
        width={isNanoBanana ? 26 : 25}
        height={isNanoBanana ? 26 : 25}
      />
    </span>
  );
}

function resizePromptTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const verticalPadding =
    Number.parseFloat(styles.paddingTop) +
    Number.parseFloat(styles.paddingBottom);
  const maxHeight = lineHeight * 8 + verticalPadding;
  const nextHeight = Math.min(element.scrollHeight, maxHeight);
  const hasOverflow = element.scrollHeight > maxHeight;
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = hasOverflow ? "auto" : "hidden";
  element.classList.toggle("has-overflow", hasOverflow);
}

export function CreationComposer({
  prompt,
  references,
  modelId,
  aspectRatio,
  resolution,
  count,
  drawerOpen,
  isGenerating,
  billingLabel,
  billingDescription,
  onPromptChange,
  onReferenceFiles,
  onRemoveReference,
  onModelChange,
  onAspectRatioChange,
  onResolutionChange,
  onCountChange,
  onDrawerOpenChange,
  onGenerate,
}: CreationComposerProps) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const activeModel = getGenerationModel(modelId);
  const activeRatio = getGenerationRatio(aspectRatio);
  const ratioIndex = getGenerationRatioIndex(aspectRatio);
  const ratioFrame = getRatioFrame(activeRatio.value);

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

  const handleReferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onReferenceFiles(files);
    event.target.value = "";
  };

  const openReferencePicker = () => {
    if (references.length >= MAX_GENERATION_REFERENCES) {
      toast.info(`最多可添加 ${MAX_GENERATION_REFERENCES} 张参考图`);
      return;
    }
    referenceInputRef.current?.click();
  };

  return (
    <section
      className={`composer ${drawerOpen ? "drawer-open" : ""} ${isGenerating ? "is-generating" : ""}`}
      aria-label="图像生成区域"
    >
      <div className="prompt-row">
        <div className="reference-control">
          <input
            ref={referenceInputRef}
            className="reference-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={references.length >= MAX_GENERATION_REFERENCES}
            onChange={handleReferenceChange}
          />
          <button
            className="reference-button"
            aria-label={references.length >= MAX_GENERATION_REFERENCES ? "参考图片已达到上限" : "上传参考图片，最多 10 张"}
            disabled={references.length >= MAX_GENERATION_REFERENCES}
            onClick={openReferencePicker}
          >
            <ImagePlus size={18} />
          </button>
        </div>
        <textarea
          ref={promptInputRef}
          aria-label="画面描述"
          value={prompt}
          rows={1}
          placeholder="描述你想创作的画面…"
          onChange={(event) => {
            onPromptChange(event.target.value);
            resizePromptTextarea(event.currentTarget);
          }}
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
            aria-label={isGenerating ? "正在生成图片" : "生成图片"}
            disabled={isGenerating}
            onClick={onGenerate}
          >
            <span className="feihong-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      {references.length > 0 && (
        <div className="reference-tray" aria-label="已添加的参考图片">
          <div className="reference-thumbnails">
            {references.map((image, index) => (
              <div
                className={`reference-thumbnail ${image.status}`}
                key={image.id}
                title={image.errorMessage ?? image.name}
              >
                <PrivateObjectImage src={image.url} alt={`参考图 ${index + 1}`} />
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
                <button
                  className="reference-thumbnail-remove"
                  aria-label={`移除参考图 ${index + 1}`}
                  onClick={() => onRemoveReference(image)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {references.length < MAX_GENERATION_REFERENCES && (
              <button
                className="reference-add-more"
                aria-label="继续添加参考图片"
                onClick={openReferencePicker}
              >
                <Plus size={15} />
                <span>添加</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="parameter-drawer" aria-hidden={!drawerOpen}>
        <div className="drawer-overflow">
          <div className="drawer-content">
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
                      {GENERATION_MODEL_CATALOG.map((model) => (
                        <button
                          key={model.id}
                          className={`model-option ${modelId === model.id ? "selected" : ""}`}
                          aria-pressed={modelId === model.id}
                          onClick={() => {
                            onModelChange(model.id);
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
            </div>
            <div className="parameter-group ratio-group">
              <label>画面比例</label>
              <div className="ratio-control">
                <svg className="ratio-preview" viewBox="0 0 120 112" role="img" aria-label={`当前画面比例 ${activeRatio.label}`}>
                  <rect x={ratioFrame.guideX} y={ratioFrame.guideY} width={ratioFrame.guideWidth} height={ratioFrame.guideHeight} rx="6" fill="none" stroke="#d6d6dc" strokeWidth="1" strokeDasharray="4 4" />
                  <rect x={ratioFrame.x} y={ratioFrame.y} width={ratioFrame.width} height={ratioFrame.height} rx="6" fill="none" stroke="#50505a" strokeWidth="1.25" />
                  <text x="60" y="59" textAnchor="middle" fill="#3c3c45" fontSize="10">{activeRatio.label}</text>
                </svg>
                <div className="ratio-editor">
                  <div className="ratio-modes" aria-label="画面方向">
                    {GENERATION_RATIO_MODES.map(([mode, label]) => (
                      <button
                        key={mode}
                        className={activeRatio.mode === mode ? "selected" : ""}
                        onClick={() => onAspectRatioChange(DEFAULT_GENERATION_RATIO_BY_MODE[mode])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Slider
                    className="ratio-slider"
                    min={0}
                    max={GENERATION_RATIO_OPTIONS.length - 1}
                    step={1}
                    value={[ratioIndex]}
                    onValueChange={(value) => {
                      const option = GENERATION_RATIO_OPTIONS[value[0]];
                      if (option) onAspectRatioChange(option.id);
                    }}
                    aria-label="调整画面比例"
                  />
                  <div className="ratio-readout">
                    <small>{formatPixelDimensions(activeRatio.dimensions[resolution])}</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="parameter-group output-group">
              <div className="output-section">
                <label>分辨率</label>
                <div className="resolution-options">
                  {GENERATION_RESOLUTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={resolution === option.value ? "selected" : ""}
                      onClick={() => onResolutionChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="output-section">
                <label>生成数量</label>
                <div className="choice-row compact">
                  {GENERATION_COUNTS.map((generationCount) => (
                    <button
                      key={generationCount}
                      className={count === generationCount ? "selected" : ""}
                      aria-pressed={count === generationCount}
                      onClick={() => onCountChange(generationCount)}
                    >
                      {generationCount}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
