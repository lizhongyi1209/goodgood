import { VIDEO_GENERATION_TYPES, videoModelForType, videoRolesForType } from "../../shared/contracts/video-generation.mjs";

const typeRules = {
  text_to_video: "仅使用提示词，不接入图片或视频",
  image_to_video: "仅 1 张图片，作为视频首帧",
  first_last_frame: "需要首帧，尾帧可选；不支持仅尾帧",
  reference_to_video: "参考内容，不固定首帧；1–7 张图，或 1 个视频＋0–4 张图",
  video_edit: "需要 1 个原视频，可添加最多 4 张参考图",
  motion_control: "需要 1 张角色图和 1 个动作视频",
};

/** Count the connected/selected media, including uploads that are not ready yet. */
export function canvasVideoTypeAvailability(inputs) {
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
  return VIDEO_GENERATION_TYPES.map((item) => {
    const reason = overflow || requirements[item.id];
    return { ...item, enabled: !reason, reason, rule: typeRules[item.id] };
  });
}

/** Reassign incompatible roles, preserving valid explicit first/last choices. */
export function canvasVideoDraftForType(draft, type, inputs) {
  const modelId = videoModelForType(type);
  if (!modelId || !canvasVideoTypeAvailability(inputs).some((item) => item.id === type && item.enabled)) return draft;
  const images = inputs.filter((item) => item.kind === "image");
  const previousRole = (item) => draft.roles[item.key] ?? item.role;
  const first = images.find((item) => previousRole(item) === "first_frame") ?? images[0];
  const last = images.find((item) => item !== first && previousRole(item) === "last_frame") ?? images.find((item) => item !== first);
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

/** Keep a compatible choice; otherwise prefer the current model, then Omni. */
export function canvasVideoDraftForMaterials(draft, inputs) {
  const available = canvasVideoTypeAvailability(inputs);
  const type = available.find((item) => item.id === draft.type && item.enabled)
    ?? available.find((item) => item.modelId === draft.modelId && item.enabled)
    ?? available.find((item) => item.enabled);
  return type ? canvasVideoDraftForType(draft, type.id, inputs) : draft;
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
