"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { CreationModeSwitch } from "@/features/creation/creation-mode-switch";
import { getRatioFrame } from "@/features/creation/generation-options";
import {
  VIDEO_GENERATION_MODEL_CATALOG,
  VIDEO_RATIO_OPTIONS,
  VIDEO_REFERENCE_ROLE_OPTIONS,
  getVideoGenerationModel,
  videoReferenceRoleLabel,
  type CreationMode,
  type VideoAspectRatio,
  type VideoGenerationModelId,
  type VideoReference,
  type VideoReferenceMediaType,
  type VideoReferenceRole,
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
  Video,
  Volume2,
  X,
} from "lucide-react";

export type VideoCreationComposerProps = Readonly<{
  mode: CreationMode;
  prompt: string;
  references: readonly VideoReference[];
  modelId: VideoGenerationModelId;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  durationSeconds: number;
  generateAudio: boolean;
  drawerOpen: boolean;
  onModeChange: (mode: CreationMode) => void;
  onPromptChange: (prompt: string) => void;
  onReferenceFiles: (
    mediaType: VideoReferenceMediaType,
    files: readonly File[],
  ) => void;
  onOpenReferenceLibrary: () => void;
  onRemoveReference: (reference: VideoReference) => void;
  onReferenceRoleChange: (
    referenceId: string,
    role: Extract<VideoReferenceRole, "first_frame" | "last_frame" | "reference_image">,
  ) => void;
  onModelChange: (modelId: VideoGenerationModelId) => void;
  onAspectRatioChange: (ratio: VideoAspectRatio) => void;
  onResolutionChange: (resolution: VideoResolution) => void;
  onDurationChange: (duration: number) => void;
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

function fileInputAccept(mediaType: VideoReferenceMediaType) {
  if (mediaType === "image") return "image/jpeg,image/png,image/webp,image/heic,image/heif";
  if (mediaType === "video") return "video/mp4,video/quicktime";
  return "audio/wav,audio/x-wav,audio/mpeg";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function VideoCreationComposer({
  mode,
  prompt,
  references,
  modelId,
  aspectRatio,
  resolution,
  durationSeconds,
  generateAudio,
  drawerOpen,
  onModeChange,
  onPromptChange,
  onReferenceFiles,
  onOpenReferenceLibrary,
  onRemoveReference,
  onReferenceRoleChange,
  onModelChange,
  onAspectRatioChange,
  onResolutionChange,
  onDurationChange,
  onGenerateAudioChange,
  onDrawerOpenChange,
  onGenerate,
}: VideoCreationComposerProps) {
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const activeModel = getVideoGenerationModel(modelId);
  const activeRatio = VIDEO_RATIO_OPTIONS.find((item) => item.id === aspectRatio) ?? VIDEO_RATIO_OPTIONS[0];
  const ratioFrame = getRatioFrame(activeRatio.value ?? 16 / 9);

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

  const handleFileChange = (
    mediaType: VideoReferenceMediaType,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onReferenceFiles(mediaType, files);
    event.target.value = "";
  };

  const inputs = [
    ["image", imageInputRef],
    ["video", videoInputRef],
    ["audio", audioInputRef],
  ] as const;

  return (
    <section
      className={`composer video-composer ${drawerOpen ? "drawer-open" : ""}`}
      aria-label="视频生成区域"
    >
      <CreationModeSwitch value={mode} onChange={onModeChange} />

      {inputs.map(([mediaType, inputRef]) => (
        <input
          key={mediaType}
          ref={inputRef}
          className="reference-input"
          type="file"
          accept={fileInputAccept(mediaType)}
          multiple
          onChange={(event) => handleFileChange(mediaType, event)}
        />
      ))}

      <div className="prompt-row">
        <div className="reference-control">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="reference-button" aria-label="添加视频创作素材">
                <ImagePlus size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="reference-source-menu" align="start" sideOffset={7}>
              <DropdownMenuItem onSelect={() => imageInputRef.current?.click()}>
                <ImagePlus size={15} />上传图片
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenReferenceLibrary}>
                <Images size={15} />从资产库选择
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => videoInputRef.current?.click()}>
                <Video size={15} />上传视频
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => audioInputRef.current?.click()}>
                <AudioLines size={15} />上传音频
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
            aria-label="视频接口接入后显示预计积分"
            title="视频接口与计价将在下一阶段接入"
          >
            接口待接入
          </span>
          <button
            className={`prompt-action settings-toggle ${drawerOpen ? "active" : ""}`}
            aria-label="展开视频生成参数"
            aria-expanded={drawerOpen}
            onClick={() => onDrawerOpenChange(!drawerOpen)}
          >
            <SlidersHorizontal size={18} />
          </button>
          <button className="send-button" aria-label="生成视频" onClick={onGenerate}>
            <span className="feihong-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      {references.length > 0 && (
        <div className="reference-tray video-reference-tray" aria-label="已添加的视频创作素材">
          <div className="reference-thumbnails">
            {references.map((reference, index) => {
              const ordinal = references
                .slice(0, index + 1)
                .filter((item) => item.mediaType === reference.mediaType).length;
              const mediaLabel = reference.mediaType === "image"
                ? `图 ${ordinal}`
                : reference.mediaType === "video"
                  ? `视频 ${ordinal}`
                  : `音频 ${ordinal}`;
              return (
                <div
                  className={`reference-thumbnail video-reference-thumbnail ${reference.mediaType}`}
                  key={reference.id}
                  role="group"
                  aria-label={`${mediaLabel}，${reference.name}，${videoReferenceRoleLabel(reference.role)}`}
                  title={`${reference.name} · ${formatFileSize(reference.size)}`}
                >
                  {reference.mediaType === "image" ? (
                    <PrivateObjectImage src={reference.url} alt={mediaLabel} />
                  ) : reference.mediaType === "video" ? (
                    <video src={reference.url} muted preload="metadata" aria-label={mediaLabel} />
                  ) : (
                    <span className="video-reference-placeholder"><AudioLines size={22} /></span>
                  )}
                  <span className="reference-thumbnail-ordinal">{mediaLabel}</span>
                  {reference.mediaType === "image" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="video-reference-role" aria-label={`设置${mediaLabel}用途`}>
                          {videoReferenceRoleLabel(reference.role)}
                          <ChevronDown size={9} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="reference-source-menu" align="start" sideOffset={5}>
                        {VIDEO_REFERENCE_ROLE_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => onReferenceRoleChange(reference.id, option.value)}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="video-reference-role is-static">
                      {videoReferenceRoleLabel(reference.role)}
                    </span>
                  )}
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
                  <span className="model-icon seedance"><Film size={19} /></span>
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
                          <span className="model-icon seedance"><Film size={19} /></span>
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
                <span>支持图片、视频、音频参考</span>
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
              <div className="video-interface-note">
                <Upload size={12} />当前仅保存于本次页面会话，接口接入后再上传
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
