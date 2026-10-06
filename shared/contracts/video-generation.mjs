export const VIDEO_GENERATION_MODELS = Object.freeze([
  { id: "kling-3.0-omni", name: "Kling O3", resolutions: ["720p", "1080p", "4k"] },
  { id: "kling-3.0", name: "Kling 3.0", resolutions: ["720p", "1080p"] },
]);
export const VIDEO_GENERATION_TYPES = Object.freeze([
  { id: "text_to_video", name: "文生视频", modelId: "kling-3.0-omni", hint: "描述画面、动作和镜头变化" },
  { id: "image_to_video", name: "图生视频", modelId: "kling-3.0-omni", hint: "描述这张首帧图片如何动起来" },
  { id: "reference_to_video", name: "全能参考", modelId: "kling-3.0-omni", hint: "添加参考图或参考视频" },
  { id: "first_last_frame", name: "首尾帧", modelId: "kling-3.0-omni", hint: "描述首帧后的画面变化" },
  { id: "video_edit", name: "视频编辑", modelId: "kling-3.0-omni", hint: "选择原视频，可添加参考图" },
  { id: "motion_control", name: "动作模仿", modelId: "kling-3.0", hint: "选择角色图片和动作视频" },
]);
export const VIDEO_IMAGE_ROLES = Object.freeze(["first_frame", "last_frame", "refer_image", "image"]);
export const VIDEO_VIDEO_ROLES = Object.freeze(["feature_video", "base_video", "video"]);
export const VIDEO_ROLE_LABELS = Object.freeze({ first_frame: "首帧", last_frame: "尾帧", refer_image: "参考图", image: "角色", feature_video: "参考视频", base_video: "原视频", video: "动作视频" });
export const VIDEO_ACTIVE_STATES = Object.freeze(["queued", "submitting", "running", "saving"]);
export const VIDEO_GENERATION_COUNTS = Object.freeze([1, 2, 4]);
export function defaultVideoGenerationDraft() {
  return { modelId: "kling-3.0-omni", type: "text_to_video", prompt: "", resolution: "720p", duration: 5,
    aspectRatio: "16:9", audio: "off", multiShot: false, characterOrientation: "video", shots: [], materials: [], roles: {} };
}
export function videoModelForType(type) { return VIDEO_GENERATION_TYPES.find((item) => item.id === type)?.modelId; }
export function videoRolesForType(type, kind) {
  if (kind === "video") return type === "motion_control" ? ["video"] : type === "video_edit" ? ["base_video"] : type === "reference_to_video" ? ["feature_video"] : [];
  if (type === "motion_control") return ["image"];
  if (type === "first_last_frame") return ["first_frame", "last_frame", "refer_image"];
  if (type === "image_to_video") return ["first_frame", "refer_image"];
  return type === "reference_to_video" || type === "video_edit" ? ["refer_image"] : [];
}
export function defaultVideoRole(type, kind, index = 0) {
  const roles = videoRolesForType(type, kind);
  return type === "first_last_frame" ? roles[Math.min(index, 2)] : type === "image_to_video" ? roles[index ? 1 : 0] : roles[0];
}
/** Shared guidance; backend repeats this against authorized, decoded media. */
export function videoGenerationProblem(input) {
  if (videoModelForType(input.type) !== input.modelId) return "模型与生成类型不匹配。";
  const model = VIDEO_GENERATION_MODELS.find((item) => item.id === input.modelId);
  if (!model?.resolutions.includes(input.resolution)) return "当前模型不支持该分辨率。";
  const media = input.media ?? [];
  if (new Set(media.map((item) => `${item.assetKind}:${item.assetId}`)).size !== media.length) return "同一素材无需重复添加。";
  if (media.some((item) => !videoRolesForType(input.type, item.kind).includes(item.role))) return "素材用途与生成类型不匹配，请调整用途或移除素材。";
  const count = (role) => media.filter((item) => item.role === role).length;
  if (["first_frame", "last_frame", "image", "video", "feature_video", "base_video"].some((role) => count(role) > 1)) return "同一用途只能选择一份素材。";
  if (["image_to_video", "first_last_frame"].includes(input.type) && !count("first_frame")) return "请选择首帧。";
  if (input.type === "reference_to_video" && !media.length) return "请添加参考图片或视频。";
  if (input.type === "video_edit" && !count("base_video")) return "请选择需要编辑的原视频。";
  if (input.type === "motion_control" && (count("image") !== 1 || count("video") !== 1 || media.length !== 2)) return "动作模仿需要一张角色图片和一个动作视频。";
  const videos = media.filter((item) => item.kind === "video");
  const images = media.filter((item) => item.kind === "image");
  if (videos.length > 1 || images.length > (videos.length ? 4 : 7)) return videos.length > 1 ? "一次最多接收一个视频。" : "参考图片数量超出限制。";
  const limit = input.modelId === "kling-3.0" ? 2500 : 3072;
  if (typeof input.prompt !== "string" || input.prompt.length > limit) return `提示词最多 ${limit} 个字符。`;
  if (input.type !== "motion_control") {
    if (!Number.isInteger(input.duration) || input.duration < 3 || input.duration > 15) return "视频时长为 3–15 秒。";
    if (!["16:9", "9:16", "1:1"].includes(input.aspectRatio)) return "请选择支持的画面比例。";
    if (!["native", "original", "off"].includes(input.audio)) return "音频选项无效。";
    if (input.audio === "original" && !count("base_video")) return "保留原声需要原视频。";
    if (input.type === "video_edit" && (input.multiShot || !["original", "off"].includes(input.audio))) return "视频编辑仅支持单镜头和原声或静音。";
    if (count("feature_video") && (!input.multiShot || input.audio !== "off")) return "参考视频需要多镜头并关闭音频。";
    if (!input.prompt.trim() && !input.shots?.length) return "请输入视频描述。";
    if (input.shots?.length) {
      if (!input.multiShot || input.shots.length > 6 || input.shots.some((shot) => !Number.isInteger(shot.seconds) || shot.seconds < 1 || !shot.text?.trim() || shot.text.length > 512)) return "分镜需要 1–6 个镜头，每镜头至少 1 秒且有描述。";
      if (input.shots.reduce((sum, shot) => sum + shot.seconds, 0) !== input.duration) return "分镜时长之和需要等于视频时长。";
      if (input.prompt.trim()) return "使用手动分镜时，请将描述写入各镜头。";
      if (input.shots.map((shot, i) => `shot ${i + 1}, ${shot.seconds}s, ${shot.text.trim()}`).join("; ").length > limit) return "分镜总描述过长，请精简后重试。";
    }
  } else if (!["video", "image"].includes(input.characterOrientation) || !["original", "off"].includes(input.audio)) return "请选择动作朝向与原声或静音。";
  return null;
}
export function videoProviderBody(input, media) {
  const prompt = input.shots?.length ? input.shots.map((shot, i) => `shot ${i + 1}, ${shot.seconds}s, ${shot.text.trim()}`).join("; ") : input.prompt.trim();
  const contents = [...(prompt ? [{ type: "prompt", text: prompt }] : []), ...media.map((item, index) => ({ type: item.role, url: item.url, ...(input.type !== "motion_control" ? { id: `input${index + 1}` } : {}) }))];
  const settings = input.type === "motion_control"
    ? { resolution: input.resolution, character_orientation: input.characterOrientation, audio: input.audio }
    : { resolution: input.resolution, duration: input.duration, multi_shot: input.multiShot, audio: input.audio,
      ...(!media.some((item) => ["first_frame", "feature_video", "base_video"].includes(item.role)) ? { aspect_ratio: input.aspectRatio } : {}) };
  return { contents, settings, options: { external_task_id: input.requestId, watermark_info: { enabled: false } } };
}
