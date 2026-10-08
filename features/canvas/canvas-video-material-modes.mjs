import { seedanceVideoCapabilities, seedanceVideoTypes, seedanceInheritedRatio } from "../../shared/contracts/seedance-video-generation.mjs";
import { VIDEO_GENERATION_MODELS, VIDEO_GENERATION_TYPES, videoModelForType, videoRolesForType } from "../../shared/contracts/video-generation.mjs";

const typeRules = {
  text_to_video: "仅提示词，不接入图片或视频",
  image_to_video: "1 张图片，作为首帧",
  first_last_frame: "首帧必需，尾帧可选",
  reference_to_video: "1–7 张图片\n或 1 个视频＋最多 4 张图片",
  video_edit: "1 个原视频，可配最多 4 张图",
  motion_control: "1 张角色图＋1 个动作视频",
};

// Display order must not change the mode selected when added media invalidate a draft.
const automaticTypeOrder = ["text_to_video", "image_to_video", "first_last_frame", "reference_to_video", "video_edit", "motion_control", "video_extend"];

/** Show only controls accepted as user choices by the configured provider contract. */
export function canvasVideoParameterVisibility(type, inputs, modelId) {
  if (seedanceVideoCapabilities(modelId)) return { aspectRatio: !seedanceInheritedRatio({ modelId, type }), duration: type !== "video_edit", audio: true, storyboard: false };
  const motion = type === "motion_control";
  const referenceVideo = inputs.some((item) => item.role === "feature_video");
  const inheritedRatio = inputs.some((item) => ["first_frame", "feature_video", "base_video"].includes(item.role));
  return { aspectRatio: !motion && !inheritedRatio, duration: !motion,
    audio: !referenceVideo, storyboard: !motion && type !== "video_edit" && !referenceVideo };
}

/** Count the connected/selected media, including uploads that are not ready yet. */
export function canvasVideoTypeAvailability(inputs, modelId) {
  const cap = seedanceVideoCapabilities(modelId);
  if (cap) return seedanceTypeAvailability(inputs, cap);
  const images = inputs.filter((item) => item.kind === "image").length;
  const videos = inputs.filter((item) => item.kind === "video").length;
  const overflow = videos > 1 ? "最多一个视频" : images > (videos ? 4 : 7) ? "请移除多余图片" : "";
  const requirements = {
    text_to_video: images || videos ? "移除图片和视频后可用" : "",
    image_to_video: videos ? "仅支持图片素材" : images !== 1 ? "需要且仅支持一张首帧图片" : "",
    first_last_frame: videos ? "仅支持图片素材" : !images ? "需要图片" : "",
    reference_to_video: !images && !videos ? "需要图片或视频" : "",
    video_edit: !videos ? "需要原视频" : "",
    motion_control: images !== 1 || videos !== 1 ? "需要一张图片和一个视频" : "",
  };
  return VIDEO_GENERATION_TYPES.filter((item) => !item.id.startsWith("video_extend")).map((item) => {
    const reason = inputs.some((item) => item.kind === "audio") ? "该模型不支持音频素材" : overflow || requirements[item.id];
    return { ...item, enabled: !reason, reason, rule: typeRules[item.id] };
  });
}

/** Normalize even incomplete drafts; readiness is a separate submission check. */
function draftForType(draft, type, inputs) {
  if (seedanceVideoCapabilities(draft.modelId)) return seedanceDraftForType(draft, type, inputs);
  const modelId = videoModelForType(type);
  const images = inputs.filter((item) => item.kind === "image");
  const [first, last] = images;
  const roles = Object.fromEntries(inputs.filter((item) => item.kind !== "text").map((item) => {
    const role = item.kind === "video"
      ? type === "motion_control" ? "video" : type === "video_edit" ? "base_video" : "feature_video"
      : type === "motion_control" ? "image" : ["image_to_video", "first_last_frame"].includes(type) && item === first ? "first_frame"
        : type === "first_last_frame" && item === last ? "last_frame" : "refer_image";
    return [item.key, role];
  }));
  const motion = type === "motion_control";
  const editing = type === "video_edit";
  const featureVideo = type === "reference_to_video" && inputs.some((item) => item.kind === "video");
  const next = { ...draft, type, modelId, roles,
    resolution: motion && draft.resolution === "4k" ? "1080p" : draft.resolution,
    audio: featureVideo ? "off" : motion && draft.type !== type ? "original"
      : ((!motion && !editing && draft.audio === "original") || (editing && draft.audio === "native")) ? "off" : draft.audio,
    multiShot: motion || editing ? false : featureVideo || draft.multiShot,
    shots: motion || editing || featureVideo ? [] : draft.shots,
  };
  return next.type === draft.type && next.modelId === draft.modelId && next.resolution === draft.resolution &&
    next.audio === draft.audio && next.multiShot === draft.multiShot && next.shots.length === draft.shots.length &&
    Object.keys(roles).length === Object.keys(draft.roles).length && Object.entries(roles).every(([key, role]) => draft.roles[key] === role)
    ? draft : next;
}

/** The selected mode owns roles; frame positions follow the visible image order. */
export function canvasVideoDraftForType(draft, type, inputs) {
  return canvasVideoTypeAvailability(inputs, draft.modelId).some((item) => item.id === type && item.enabled)
    ? draftForType(draft, type, inputs) : draft;
}

/** Reconcile within the chosen model; missing inputs must never change it. */
export function canvasVideoDraftForMaterials(draft, inputs) {
  const available = canvasVideoTypeAvailability(inputs, draft.modelId).filter((item) => item.modelId === draft.modelId);
  const preferred = [...available].sort((a, b) => automaticTypeOrder.indexOf(a.id) - automaticTypeOrder.indexOf(b.id));
  const type = available.find((item) => item.id === draft.type && item.enabled)
    ?? preferred.find((item) => item.enabled)
    ?? available.find((item) => item.id === draft.type)
    ?? preferred[0];
  return type ? draftForType(draft, type.id, inputs) : draft;
}

/** Plan one explicit model switch without mutating media, edges or frozen inputs. */
export function canvasVideoDraftForModel(draft, modelId, inputs) {
  if (modelId === draft.modelId || !VIDEO_GENERATION_MODELS.some((item) => item.id === modelId)) return { draft, removedKeys: [] };
  const motion = modelId === "kling-3.0";
  const cap = seedanceVideoCapabilities(modelId);
  const imageLimit = cap?.maxImages ?? (motion ? 1 : inputs.some((item) => item.kind === "video") ? 4 : 7);
  const limits = { image: imageLimit, video: cap?.maxVideos ?? 1, audio: cap?.maxAudios ?? 0 };
  const counts = { image: 0, video: 0, audio: 0 };
  const retained = inputs.filter((item) => item.kind === "text" || ++counts[item.kind] <= limits[item.kind]);
  const keys = new Set(retained.map((item) => item.key));
  const next = { ...draft, modelId,
    materials: draft.materials.filter((item) => keys.has(`direct:${item.assetKind}:${item.assetId}`)),
    ...(cap ? { seedanceLine: draft.seedanceLine ?? "standard", multiShot: false, shots: [] } : { seedanceLine: undefined, duration: draft.duration === -1 ? 5 : Math.min(15, Math.max(3, draft.duration)), aspectRatio: ["16:9", "9:16", "1:1"].includes(draft.aspectRatio) ? draft.aspectRatio : "16:9", ...(!motion ? { multiShot: true } : {}) }),
    resolution: VIDEO_GENERATION_MODELS.find((item) => item.id === modelId).resolutions.includes(draft.resolution) ? draft.resolution : motion && draft.resolution === "4k" ? "1080p" : "720p",
  };
  return { draft: canvasVideoDraftForMaterials(next, retained), removedKeys: inputs.filter((item) => !keys.has(item.key)).map((item) => item.key) };
}

/** A first-frame-only composition uses the existing compatible single-frame request. */
export function canvasVideoSubmissionType(type, media) {
  return type === "first_last_frame" && !media.some((item) => item.role === "last_frame") ? "image_to_video" : type;
}

/** Restrict the editable single-image entry without invalidating historical provider inputs. */
export function canvasVideoUiRolesForType(type, kind) {
  if (type === "image_to_video") return kind === "image" ? ["first_frame"] : [];
  return videoRolesForType(type, kind);
}

function seedanceTypeAvailability(inputs, cap) {
  const images = inputs.filter((item) => item.kind === "image").length;
  const videos = inputs.filter((item) => item.kind === "video").length;
  const audios = inputs.filter((item) => item.kind === "audio").length;
  const overflow = images > cap.maxImages || videos > cap.maxVideos || audios > cap.maxAudios ? "请移除多余素材" : "";
  const soloAudio = audios > 0 && !images && !videos && !cap.soloAudio;
  const requirements = {
    text_to_video: images || videos || audios ? "移除素材后可用" : "",
    image_to_video: images !== 1 || videos || audios ? "需要一张首帧图片" : "",
    first_last_frame: images < 1 || images > 2 || videos || audios ? "需要一至两张图片" : "",
    reference_to_video: !images && !videos && !audios ? "需要参考素材" : soloAudio ? "音频需搭配图片或视频" : "",
    video_edit: !videos ? "需要原视频" : "", video_extend: !videos ? "需要原视频" : "",
  };
  const referenceRule = cap.soloAudio ? "图片、视频或音频参考" : "图片或视频，可搭配音频";
  const rules = { text_to_video: "仅提示词", image_to_video: "1 张图片，作为首帧", first_last_frame: "首帧必需，尾帧可选",
    reference_to_video: referenceRule, video_edit: "原视频，时长和比例跟随素材", video_extend: "原视频，描述后续变化" };
  return seedanceVideoTypes(cap.id).map((id) => ({ ...VIDEO_GENERATION_TYPES.find((item) => item.id === id), modelId: cap.id,
    enabled: !(overflow || requirements[id]), reason: overflow || requirements[id], rule: rules[id] }));
}
function seedanceDraftForType(draft, type, inputs) {
  const cap = seedanceVideoCapabilities(draft.modelId);
  const frames = ["image_to_video", "first_last_frame"].includes(type);
  let image = 0; let video = 0;
  const roles = Object.fromEntries(inputs.filter((item) => item.kind !== "text").map((item) => [item.key,
    item.kind === "audio" ? "reference_audio" : item.kind === "video" ? ["video_edit", "video_extend"].includes(type) && video++ === 0 ? "base_video" : "feature_video"
      : frames ? image++ === 0 ? "first_frame" : "last_frame" : "refer_image"]));
  const next = { ...draft, type, roles, seedanceLine: draft.seedanceLine ?? "standard",
    resolution: cap.resolutions.includes(draft.resolution) ? draft.resolution : "720p",
    duration: type === "video_edit" ? -1 : draft.duration === -1 ? -1 : Math.max(4, Math.min(cap.maxDuration, draft.duration)),
    aspectRatio: seedanceInheritedRatio({ modelId: draft.modelId, type }) ? "adaptive" : cap.ratios.includes(draft.aspectRatio) ? draft.aspectRatio : "adaptive",
    audio: draft.audio === "original" ? "off" : draft.audio, multiShot: false, shots: [] };
  return JSON.stringify(next) === JSON.stringify(draft) ? draft : next;
}
