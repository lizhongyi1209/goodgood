import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { findOwnerAsset } from "../generation/repository.mjs";
import { findReferenceAsset } from "../references/repository.mjs";
import { readPrivateObject } from "../generation/storage.mjs";
import { cloudReferenceReadClient } from "../generation/local-cloud-reference.mjs";
import { readMp4Metadata } from "./mp4.mjs";
import { VideoGenerationError } from "./errors.mjs";
import { seedanceVideoCapabilities } from "../../shared/contracts/seedance-video-generation.mjs";
import { readAudioMetadata } from "../audio-materials/metadata.mjs";
const unavailable = () => new VideoGenerationError("VIDEO_MATERIAL_UNAVAILABLE", "素材暂不可用，请重新选择或连接。", 409);
export async function readVideoInputs(resources, { input, ownerId, workspaceId, provider = false }) {
  const result = [];
  const cap = seedanceVideoCapabilities(input.modelId); const bridgeKeys = [];
  const publicUrl = async (asset, bytes, mimeType, extension, permitBase64 = false) => {
    if (!provider) return {};
    let client = cloudReferenceReadClient(resources.publicStorage, asset.object_key) ?? resources.publicStorage;
    let bucket = client === resources.publicStorage ? resources.config.objectStorage.bucket : resources.publicStorage.cloudReferenceBucketEndpoint;
    let key = asset.object_key;
    let url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 6 * 60 * 60 });
    if (new URL(url).protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) return { url };
    if (permitBase64) return { url: `data:${mimeType};base64,${bytes.toString("base64")}` };
    client = resources.publicStorage.cloudReferenceClient; bucket = resources.publicStorage.cloudReferenceBucketEndpoint;
    if (!client || !bucket) throw new VideoGenerationError("VIDEO_PUBLIC_INPUT_UNAVAILABLE", "参考素材需要配置可供生成服务读取的私有云存储。", 503);
    key = `local-dev/references/video-generation-bridge/${input.requestId}/${asset.id}.${extension}`;
    bridgeKeys.push(key);
    await resources.pool.query("UPDATE video_generation_jobs SET bridge_keys=$2::jsonb WHERE id=$1 AND owner_id=$3 AND workspace_id=$4 AND state='queued'", [input.requestId, JSON.stringify(bridgeKeys), ownerId, workspaceId]);
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: mimeType }));
    url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 6 * 60 * 60 });
    return { url, bridgeKey: key };
  };
  for (const item of input.media) {
    const asset = item.kind === "audio" ? (await resources.pool.query("SELECT * FROM audio_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'", [item.assetId, ownerId, workspaceId])).rows[0]
      : item.kind === "video" ? (await resources.pool.query("SELECT * FROM video_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'", [item.assetId, ownerId, workspaceId])).rows[0]
      : item.assetKind === "generated" ? await findOwnerAsset(resources.pool, { assetId: item.assetId, ownerId, workspaceId }) : await findReferenceAsset(resources.pool, { referenceId: item.assetId, ownerId, workspaceId });
    if (!asset || item.assetKind === "reference" && (asset.upload_state !== "ready" || asset.moderation_state !== "accepted" || asset.object_deleted_at)) throw unavailable();
    const limit = item.kind === "audio" ? 15 * 1024 * 1024 : item.kind === "image" ? (cap ? 30 : 50) * 1024 * 1024 : input.type === "motion_control" ? 100 * 1024 * 1024 : 200 * 1024 * 1024;
    let object;
    try { object = await readPrivateObject({ bucket: resources.config.objectStorage.bucket, key: asset.object_key, storage: resources.storage, maxBytes: limit }); }
    catch { throw unavailable(); }
    if (cap && item.kind === "image" && object.bytes.length >= limit) throw new VideoGenerationError("VIDEO_IMAGE_INVALID", "参考图片需要小于 30 MB。", 409);
    if (item.kind === "audio") {
      if (!cap) throw unavailable();
      const metadata = readAudioMetadata(object.bytes);
      if (metadata.durationSeconds < 2 || metadata.durationSeconds > cap.maxReferenceDuration) throw new VideoGenerationError("VIDEO_AUDIO_INVALID", `参考音频单段需要为 2–${cap.maxReferenceDuration} 秒。`, 409);
      result.push({ ...item, ...metadata, ...await publicUrl(asset, object.bytes, metadata.mimeType, metadata.mimeType === "audio/wav" ? "wav" : "mp3") });
      continue;
    }
    if (item.kind === "image") {
      let metadata; try { metadata = await sharp(object.bytes, { limitInputPixels: 100_000_000 }).metadata(); } catch { throw unavailable(); }
      const { width, height, format } = metadata; const ratio = width / height;
      if (!(cap ? ["jpeg", "png", "webp", "tiff", "gif", "heif"] : ["jpeg", "png"]).includes(format) || !width || !height || width < 300 || height < 300 || cap && (width > 6000 || height > 6000) || ratio < 0.4 || ratio > 2.5) throw new VideoGenerationError("VIDEO_IMAGE_INVALID", cap ? "图片边长需要为 300–6000 像素，比例为 0.4–2.5。" : "图片需要为 JPG 或 PNG，宽高至少 300 像素，比例为 0.4–2.5。", 409);
      const mimeType = object.contentType ?? `image/${format === "jpeg" ? "jpeg" : format}`;
      result.push({ ...item, pixelWidth: width, pixelHeight: height, ...await publicUrl(asset, object.bytes, mimeType, format, !cap) });
      continue;
    }
    const metadata = readMp4Metadata(object.bytes, { allowMov: Boolean(cap) });
    const maxDuration = cap?.maxReferenceDuration ?? (input.type === "motion_control" ? input.characterOrientation === "image" ? 10 : 30 : 15.5);
    const minDuration = cap ? input.type === "video_edit" ? 4 : 2 : 3;
    if (metadata.durationSeconds < minDuration || metadata.durationSeconds > maxDuration) throw new VideoGenerationError("VIDEO_DURATION_INVALID", `该用途的视频时长需要为 ${minDuration}–${maxDuration} 秒。`, 409);
    if (cap && (metadata.pixelWidth < 300 || metadata.pixelHeight < 300 || metadata.pixelWidth > 6000 || metadata.pixelHeight > 6000 || metadata.pixelWidth / metadata.pixelHeight < 0.4 || metadata.pixelWidth / metadata.pixelHeight > 2.5 || metadata.pixelWidth * metadata.pixelHeight < 407696 || metadata.pixelWidth * metadata.pixelHeight > 8295044)) throw new VideoGenerationError("VIDEO_DIMENSIONS_INVALID", "参考视频尺寸不符合要求，请使用 480p–4K 的有效视频。", 409);
    if (cap && (!Number.isFinite(metadata.frameRate) || metadata.frameRate < 24 || metadata.frameRate > 60)) throw new VideoGenerationError("VIDEO_FRAME_RATE_INVALID", "参考视频帧率需要为 24–60 fps。", 409);
    if (input.type === "motion_control" && (Math.min(metadata.pixelWidth, metadata.pixelHeight) < 340 || Math.max(metadata.pixelWidth, metadata.pixelHeight) > 3850)) throw new VideoGenerationError("VIDEO_DIMENSIONS_INVALID", "动作视频的宽高需要为 340–3850 像素。", 409);
    const mimeType = asset.declared_mime_type === "video/quicktime" ? "video/quicktime" : "video/mp4";
    result.push({ ...item, ...metadata, ...await publicUrl(asset, object.bytes, mimeType, mimeType === "video/quicktime" ? "mov" : "mp4") });
  }
  if (cap) for (const kind of ["video", "audio"]) {
    const duration = result.filter((item) => item.kind === kind).reduce((sum, item) => sum + item.durationSeconds, 0);
    if (duration > cap.maxReferenceDuration) throw new VideoGenerationError("VIDEO_REFERENCE_DURATION_INVALID", `参考${kind === "video" ? "视频" : "音频"}总时长不能超过 ${cap.maxReferenceDuration} 秒。`, 409);
  }
  return result;
}
