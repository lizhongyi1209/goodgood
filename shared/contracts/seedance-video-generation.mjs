export const CANVAS_SEEDANCE_MODELS = Object.freeze([
  { id: "seedance-2-5", name: "Seedance 2.5", resolutions: ["480p", "720p", "1080p"] },
  { id: "seedance-2-0", name: "Seedance 2.0", resolutions: ["480p", "720p", "1080p", "4k"] },
  { id: "seedance-2-0-fast", name: "Seedance 2.0 Fast", resolutions: ["480p", "720p"] },
  { id: "seedance-2-0-mini", name: "Seedance 2.0 Mini", resolutions: ["480p", "720p"] },
]);
export const CANVAS_SEEDANCE_LINES = Object.freeze([
  { id: "standard", name: "Doubao MAX" }, { id: "backup", name: "Dreamina HC" },
]);
const providerModels = {
  standard: { "seedance-2-5": "doubao-seedance-2-5-260628-max", "seedance-2-0": "doubao-seedance-2-0-260128-max",
    "seedance-2-0-fast": "doubao-seedance-2-0-fast-260128-max", "seedance-2-0-mini": "doubao-seedance-2-0-mini-260615-max" },
  backup: { "seedance-2-5": "dreamina-seedance-2-5-hc", "seedance-2-0": "dreamina-seedance-2-0-hc",
    "seedance-2-0-fast": "dreamina-seedance-2-0-fast-hc", "seedance-2-0-mini": "dreamina-seedance-2-0-mini-hc" },
};
export function isSeedanceVideoModel(modelId) { return CANVAS_SEEDANCE_MODELS.some((model) => model.id === modelId); }
export function seedanceVideoCapabilities(modelId) {
  const model = CANVAS_SEEDANCE_MODELS.find((item) => item.id === modelId);
  if (!model) return null;
  const v25 = modelId === "seedance-2-5";
  return { ...model, minDuration: 4, maxDuration: v25 ? 30 : 15, maxImages: v25 ? 30 : 9,
    maxVideos: v25 ? 10 : 3, maxAudios: v25 ? 10 : 3, maxReferenceDuration: v25 ? 30 : 15,
    ratios: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"], soloAudio: v25 };
}
export function seedanceVideoProviderModel(modelId, line = "standard") { return providerModels[line]?.[modelId]; }
export function seedanceVideoTypes(modelId) {
  return ["text_to_video", "image_to_video", "reference_to_video", "first_last_frame",
    ...(modelId === "seedance-2-5" ? ["video_edit", "video_extend"] : [])];
}
export function seedanceInheritedRatio(input) {
  return input.modelId === "seedance-2-5" && ["image_to_video", "first_last_frame", "video_edit", "video_extend"].includes(input.type);
}
export function seedanceVideoProblem(input) {
  const cap = seedanceVideoCapabilities(input.modelId);
  if (!cap || !seedanceVideoProviderModel(input.modelId, input.seedanceLine ?? "standard")) return "请选择可用的 Seedance 模型和线路。";
  if (!seedanceVideoTypes(input.modelId).includes(input.type)) return "当前模型不支持该生成模式。";
  if (!cap.resolutions.includes(input.resolution)) return "当前模型不支持该清晰度。";
  if (!Number.isInteger(input.duration) || input.duration !== -1 && (input.duration < 4 || input.duration > cap.maxDuration)) return `时长请选择 4–${cap.maxDuration} 秒或自动。`;
  if (!cap.ratios.includes(input.aspectRatio)) return "请选择支持的画面比例。";
  if (seedanceInheritedRatio(input) && input.aspectRatio !== "adaptive") return "当前模式的比例需跟随素材。";
  if (input.type === "video_edit" && input.duration !== -1) return "视频编辑的时长需跟随原视频。";
  if (!["native", "off"].includes(input.audio)) return "请选择生成音频或静音。";
  if (input.shots?.length) return "Seedance 请将分镜描述写入提示词。";
  if (typeof input.prompt !== "string" || !input.prompt.trim()) return "请输入视频描述。";
  if (input.prompt.length > 16000) return "提示词最多 16000 个字符。";
  const media = input.media ?? [];
  const images = media.filter((item) => item.kind === "image");
  const videos = media.filter((item) => item.kind === "video");
  const audios = media.filter((item) => item.kind === "audio");
  if (images.length > cap.maxImages || videos.length > cap.maxVideos || audios.length > cap.maxAudios) return "参考素材数量超出当前模型限制。";
  const frame = ["image_to_video", "first_last_frame"].includes(input.type);
  if (input.type === "text_to_video" && media.length) return "文生视频仅使用提示词。";
  if (frame) {
    if (videos.length || audios.length || images.length < 1 || images.length > (input.type === "image_to_video" ? 1 : 2) ||
        images[0].role !== "first_frame" || images.length === 2 && images[1].role !== "last_frame") return "首帧和首尾帧仅支持按顺序连接一至两张图片。";
  } else if (media.some((item) => item.kind === "image" ? item.role !== "refer_image" : item.kind === "audio" ? item.role !== "reference_audio" : !["feature_video", "base_video"].includes(item.role))) return "参考素材用途与模式不匹配。";
  if (input.type === "reference_to_video" && !media.length) return "请添加参考素材。";
  if (["video_edit", "video_extend"].includes(input.type) && !videos.length) return "请连接原视频。";
  if (audios.length && !images.length && !videos.length && !cap.soloAudio) return "该模型的音频参考需搭配图片或视频。";
  return null;
}
export function seedanceVideoBody(input, media) {
  const model = seedanceVideoProviderModel(input.modelId, input.seedanceLine ?? "standard");
  if (!model) throw new Error("Unsupported Seedance route.");
  const content = [{ type: "text", text: input.prompt.trim() }, ...media.map((item) => {
    const field = `${item.kind}_url`;
    const role = item.kind === "audio" ? "reference_audio" : item.kind === "video" ? "reference_video"
      : ["first_frame", "last_frame"].includes(item.role) ? item.role : "reference_image";
    return { type: field, [field]: { url: item.url }, role };
  })];
  return { model, content, resolution: input.resolution,
    duration: input.type === "video_edit" ? -1 : input.duration,
    ratio: seedanceInheritedRatio(input) ? "adaptive" : input.aspectRatio,
    generate_audio: input.audio === "native", watermark: false,
    ...(input.modelId === "seedance-2-5" ? { output_format: "mp4",
      ...(["reference_to_video", "video_edit", "video_extend"].includes(input.type) ? { omni_reference_task_type:
        input.type === "video_edit" ? "edit" : input.type === "video_extend" ? "extend" : "reference" } : {}) } : {}) };
}
