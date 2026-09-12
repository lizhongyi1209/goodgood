export type CreationMode = "image" | "video";

export const VIDEO_GENERATION_MODEL_IDS = [
  "seedance-2-5",
  "seedance-2-0",
  "seedance-2-0-fast",
  "seedance-2-0-mini",
] as const;

export type VideoGenerationModelId =
  (typeof VIDEO_GENERATION_MODEL_IDS)[number];

export const VIDEO_ASPECT_RATIOS = [
  "adaptive",
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
  "21:9",
] as const;

export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];

export const VIDEO_RESOLUTIONS = ["480p", "720p", "1080p", "4K"] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export type VideoReferenceMediaType = "image" | "video" | "audio";
export type VideoReferenceRole =
  | "first_frame"
  | "last_frame"
  | "reference_image"
  | "reference_video"
  | "reference_audio";

export type VideoReference = Readonly<{
  id: string;
  mediaType: VideoReferenceMediaType;
  name: string;
  role: VideoReferenceRole;
  size: number;
  url: string;
}>;

type VideoModelCapabilities = Readonly<{
  duration: Readonly<{ min: number; max: number }>;
  imageLimit: number;
  videoLimit: number;
  audioLimit: number;
  totalLimit: number;
  resolutions: readonly VideoResolution[];
}>;

export type VideoModelPresentation = Readonly<{
  id: VideoGenerationModelId;
  name: string;
  description: string;
  recommended: boolean;
  capabilities: VideoModelCapabilities;
}>;

const STANDARD_CAPABILITIES: VideoModelCapabilities = Object.freeze({
  duration: Object.freeze({ min: 4, max: 15 }),
  imageLimit: 9,
  videoLimit: 3,
  audioLimit: 3,
  totalLimit: 15,
  resolutions: ["480p", "720p", "1080p", "4K"] as const,
});

const COMPACT_CAPABILITIES: VideoModelCapabilities = Object.freeze({
  ...STANDARD_CAPABILITIES,
  resolutions: ["480p", "720p"] as const,
});

export const VIDEO_GENERATION_MODEL_CATALOG = [
  {
    id: "seedance-2-5",
    name: "Seedance 2.5",
    description: "长叙事，多模态参考",
    recommended: true,
    capabilities: Object.freeze({
      duration: Object.freeze({ min: 4, max: 30 }),
      imageLimit: 30,
      videoLimit: 10,
      audioLimit: 10,
      totalLimit: 50,
      resolutions: ["480p", "720p"] as const,
    }),
  },
  {
    id: "seedance-2-0",
    name: "Seedance 2.0",
    description: "高画质，最高 4K",
    recommended: false,
    capabilities: STANDARD_CAPABILITIES,
  },
  {
    id: "seedance-2-0-fast",
    name: "Seedance 2.0 Fast",
    description: "快速生成",
    recommended: false,
    capabilities: COMPACT_CAPABILITIES,
  },
  {
    id: "seedance-2-0-mini",
    name: "Seedance 2.0 Mini",
    description: "轻量快速",
    recommended: false,
    capabilities: COMPACT_CAPABILITIES,
  },
] as const satisfies readonly VideoModelPresentation[];

export const DEFAULT_VIDEO_MODEL_ID: VideoGenerationModelId = "seedance-2-5";
export const DEFAULT_VIDEO_RATIO: VideoAspectRatio = "adaptive";
export const DEFAULT_VIDEO_RESOLUTION: VideoResolution = "720p";
export const DEFAULT_VIDEO_DURATION_SECONDS = 5;

export const VIDEO_RATIO_OPTIONS = [
  { id: "adaptive", label: "自适应", value: null },
  { id: "16:9", label: "16 : 9", value: 16 / 9 },
  { id: "9:16", label: "9 : 16", value: 9 / 16 },
  { id: "1:1", label: "1 : 1", value: 1 },
  { id: "4:3", label: "4 : 3", value: 4 / 3 },
  { id: "3:4", label: "3 : 4", value: 3 / 4 },
  { id: "21:9", label: "21 : 9", value: 21 / 9 },
] as const satisfies readonly Readonly<{
  id: VideoAspectRatio;
  label: string;
  value: number | null;
}>[];

export const VIDEO_REFERENCE_ROLE_OPTIONS = [
  { value: "first_frame", label: "首帧" },
  { value: "last_frame", label: "尾帧" },
  { value: "reference_image", label: "参考图" },
] as const satisfies readonly Readonly<{
  value: Extract<VideoReferenceRole, "first_frame" | "last_frame" | "reference_image">;
  label: string;
}>[];

export function getVideoGenerationModel(
  modelId: VideoGenerationModelId,
): VideoModelPresentation {
  const model = VIDEO_GENERATION_MODEL_CATALOG.find((item) => item.id === modelId);
  if (!model) throw new Error(`Unknown video generation model: ${modelId}`);
  return model;
}

export function resolveVideoResolution(
  modelId: VideoGenerationModelId,
  resolution: VideoResolution,
): VideoResolution {
  const available = getVideoGenerationModel(modelId).capabilities.resolutions;
  return available.includes(resolution) ? resolution : "720p";
}

export function resolveVideoDuration(
  modelId: VideoGenerationModelId,
  duration: number,
): number {
  const range = getVideoGenerationModel(modelId).capabilities.duration;
  return Math.min(range.max, Math.max(range.min, Math.round(duration)));
}

export function videoReferenceRoleLabel(role: VideoReferenceRole): string {
  return VIDEO_REFERENCE_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    (role === "reference_video" ? "参考视频" : "参考音频");
}

export function countVideoReferences(
  references: readonly VideoReference[],
  mediaType: VideoReferenceMediaType,
): number {
  return references.filter((reference) => reference.mediaType === mediaType).length;
}

export function videoReferenceCapacityError(
  modelId: VideoGenerationModelId,
  references: readonly VideoReference[],
): string | null {
  const limits = getVideoGenerationModel(modelId).capabilities;
  if (references.length > limits.totalLimit) {
    return `${getVideoGenerationModel(modelId).name} 最多支持 ${limits.totalLimit} 个参考素材`;
  }
  const counts = {
    image: countVideoReferences(references, "image"),
    video: countVideoReferences(references, "video"),
    audio: countVideoReferences(references, "audio"),
  };
  if (counts.image > limits.imageLimit) return `当前模型最多支持 ${limits.imageLimit} 张图片`;
  if (counts.video > limits.videoLimit) return `当前模型最多支持 ${limits.videoLimit} 段视频`;
  if (counts.audio > limits.audioLimit) return `当前模型最多支持 ${limits.audioLimit} 段音频`;
  return null;
}

export function videoReferenceFileError(
  file: File,
  mediaType: VideoReferenceMediaType,
): string | null {
  const validType = mediaType === "image"
    ? ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)
    : mediaType === "video"
      ? ["video/mp4", "video/quicktime"].includes(file.type)
      : ["audio/wav", "audio/x-wav", "audio/mpeg"].includes(file.type);
  if (!validType) return `${file.name} 的文件格式不受支持`;
  const maximum = mediaType === "image" ? 30 : mediaType === "video" ? 200 : 15;
  if (file.size >= maximum * 1024 * 1024) return `${file.name} 必须小于 ${maximum} MB`;
  return null;
}
