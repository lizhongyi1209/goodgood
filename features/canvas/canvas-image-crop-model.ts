export type CanvasCropSize = Readonly<{ width: number; height: number }>;
export type CanvasCropRect = CanvasCropSize & Readonly<{ x: number; y: number }>;
export type CanvasCropPoint = Readonly<{ x: number; y: number }>;
export type CanvasCropCorner = "nw" | "ne" | "se" | "sw";

type CropPreset = Readonly<{ id: string; label: string; width: number; height: number; dimensions?: boolean }>;
type CropPresetGroup = Readonly<{ id: string; label: string; presets: readonly CropPreset[] }>;

export const CANVAS_CROP_PRESET_GROUPS: readonly CropPresetGroup[] = [
  { id: "general", label: "通用", presets: [
    ...[[1, 1], [3, 4], [2, 3], [9, 16], [4, 3], [3, 2], [16, 9]].map(([width, height]) => ({ id: `ratio-${width}-${height}`, label: `${width}:${height}`, width, height })),
  ] },
  { id: "xiaohongshu", label: "小红书", presets: [
    { id: "xiaohongshu-portrait", label: "竖版", width: 1080, height: 1440, dimensions: true },
    { id: "xiaohongshu-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
    { id: "xiaohongshu-landscape", label: "横版", width: 1440, height: 1080, dimensions: true },
  ] },
  { id: "douyin", label: "抖音", presets: [
    { id: "douyin-portrait", label: "竖版", width: 1080, height: 1920, dimensions: true },
    { id: "douyin-landscape", label: "横版", width: 1920, height: 1080, dimensions: true },
    { id: "douyin-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
  ] },
  { id: "taobao", label: "淘宝", presets: [
    { id: "taobao-main", label: "方形主图", width: 800, height: 800, dimensions: true },
    { id: "taobao-portrait", label: "竖版主图", width: 800, height: 1200, dimensions: true },
    { id: "taobao-banner", label: "横幅", width: 1500, height: 750, dimensions: true },
  ] },
  { id: "pinduoduo", label: "拼多多", presets: [
    { id: "pinduoduo-main", label: "方形主图", width: 800, height: 800, dimensions: true },
    { id: "pinduoduo-portrait", label: "竖版", width: 800, height: 1200, dimensions: true },
  ] },
  { id: "amazon", label: "亚马逊", presets: [
    { id: "amazon-main", label: "方形主图", width: 2000, height: 2000, dimensions: true },
    { id: "amazon-landscape", label: "横版", width: 2000, height: 1500, dimensions: true },
    { id: "amazon-portrait", label: "竖版", width: 1500, height: 2000, dimensions: true },
  ] },
  { id: "instagram", label: "Instagram", presets: [
    { id: "instagram-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
    { id: "instagram-story", label: "快拍", width: 1080, height: 1920, dimensions: true },
    { id: "instagram-portrait", label: "竖版", width: 1080, height: 1350, dimensions: true },
    { id: "instagram-landscape", label: "横版", width: 1080, height: 566, dimensions: true },
    { id: "instagram-avatar", label: "头像", width: 320, height: 320, dimensions: true },
  ] },
  { id: "facebook", label: "Facebook", presets: [
    { id: "facebook-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
    { id: "facebook-landscape", label: "横版", width: 1200, height: 630, dimensions: true },
    { id: "facebook-story", label: "快拍", width: 1080, height: 1920, dimensions: true },
  ] },
  { id: "tiktok", label: "TikTok", presets: [
    { id: "tiktok-portrait", label: "竖版", width: 1080, height: 1920, dimensions: true },
    { id: "tiktok-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
  ] },
  { id: "youtube", label: "YouTube", presets: [
    { id: "youtube-cover", label: "封面", width: 1280, height: 720, dimensions: true },
    { id: "youtube-shorts", label: "Shorts", width: 1080, height: 1920, dimensions: true },
  ] },
  { id: "twitter", label: "Twitter", presets: [
    { id: "twitter-landscape", label: "横版", width: 1600, height: 900, dimensions: true },
    { id: "twitter-square", label: "正方形", width: 1080, height: 1080, dimensions: true },
    { id: "twitter-header", label: "主页横幅", width: 1500, height: 500, dimensions: true },
  ] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ratioSize(width: number, ratio: number, bounds: CanvasCropSize): CanvasCropSize {
  const fittedWidth = clamp(width, Math.max(1, ratio), Math.min(bounds.width, bounds.height * ratio));
  return { width: clamp(Math.round(fittedWidth), 1, bounds.width), height: clamp(Math.round(fittedWidth / ratio), 1, bounds.height) };
}

export function centeredCanvasCrop(bounds: CanvasCropSize, ratio: number | null, targetWidth = bounds.width): CanvasCropRect {
  const size = ratio ? ratioSize(targetWidth, ratio, bounds) : bounds;
  return { ...size, x: Math.round((bounds.width - size.width) / 2), y: Math.round((bounds.height - size.height) / 2) };
}

export function moveCanvasCrop(crop: CanvasCropRect, delta: CanvasCropPoint, bounds: CanvasCropSize): CanvasCropRect {
  return { ...crop, x: clamp(Math.round(crop.x + delta.x), 0, bounds.width - crop.width), y: clamp(Math.round(crop.y + delta.y), 0, bounds.height - crop.height) };
}

export function setCanvasCropDimension(crop: CanvasCropRect, dimension: "width" | "height", value: number, ratio: number | null, bounds: CanvasCropSize): CanvasCropRect {
  if (!Number.isFinite(value) || value <= 0) return crop;
  const size = ratio ? ratioSize(dimension === "width" ? value : value * ratio, ratio, bounds)
    : { ...crop, [dimension]: clamp(Math.round(value), 1, bounds[dimension]) };
  return { width: size.width, height: size.height,
    x: clamp(Math.round(crop.x + (crop.width - size.width) / 2), 0, bounds.width - size.width),
    y: clamp(Math.round(crop.y + (crop.height - size.height) / 2), 0, bounds.height - size.height) };
}

export function resizeCanvasCrop(crop: CanvasCropRect, corner: CanvasCropCorner, point: CanvasCropPoint, ratio: number | null, bounds: CanvasCropSize): CanvasCropRect {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  const anchor = { x: west ? crop.x + crop.width : crop.x, y: north ? crop.y + crop.height : crop.y };
  const available = { width: west ? anchor.x : bounds.width - anchor.x, height: north ? anchor.y : bounds.height - anchor.y };
  const width = clamp((point.x - anchor.x) * (west ? -1 : 1), 1, available.width);
  const height = clamp((point.y - anchor.y) * (north ? -1 : 1), 1, available.height);
  const size = ratio ? ratioSize((width + height * ratio) / 2, ratio, available)
    : { width: Math.round(width), height: Math.round(height) };
  return { ...size, x: west ? anchor.x - size.width : anchor.x, y: north ? anchor.y - size.height : anchor.y };
}
