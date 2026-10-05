import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { findOwnerAsset } from "../generation/repository.mjs";
import { findReferenceAsset } from "../references/repository.mjs";
import { readPrivateObject } from "../generation/storage.mjs";
import { cloudReferenceReadClient } from "../generation/local-cloud-reference.mjs";
import { readMp4Metadata } from "./mp4.mjs";
import { VideoGenerationError } from "./errors.mjs";
const unavailable = () => new VideoGenerationError("VIDEO_MATERIAL_UNAVAILABLE", "素材暂不可用，请重新选择或连接。", 409);
export async function readVideoInputs(resources, { input, ownerId, workspaceId, provider = false }) {
  const result = [];
  for (const item of input.media) {
    const asset = item.kind === "video" ? (await resources.pool.query("SELECT * FROM video_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'", [item.assetId, ownerId, workspaceId])).rows[0]
      : item.assetKind === "generated" ? await findOwnerAsset(resources.pool, { assetId: item.assetId, ownerId, workspaceId }) : await findReferenceAsset(resources.pool, { referenceId: item.assetId, ownerId, workspaceId });
    if (!asset || item.assetKind === "reference" && (asset.upload_state !== "ready" || asset.moderation_state !== "accepted" || asset.object_deleted_at)) throw unavailable();
    const limit = item.kind === "image" ? 50 * 1024 * 1024 : input.type === "motion_control" ? 100 * 1024 * 1024 : 200 * 1024 * 1024;
    let object;
    try { object = await readPrivateObject({ bucket: resources.config.objectStorage.bucket, key: asset.object_key, storage: resources.storage, maxBytes: limit }); }
    catch { throw unavailable(); }
    if (item.kind === "image") {
      let metadata; try { metadata = await sharp(object.bytes, { limitInputPixels: 100_000_000 }).metadata(); } catch { throw unavailable(); }
      const { width, height, format } = metadata; const ratio = width / height;
      if (!["jpeg", "png"].includes(format) || !width || !height || width < 300 || height < 300 || ratio < 0.4 || ratio > 2.5) throw new VideoGenerationError("VIDEO_IMAGE_INVALID", "图片需要为 JPG 或 PNG，宽高至少 300 像素，比例为 0.4–2.5。", 409);
      let url;
      if (provider) {
        const cloud = cloudReferenceReadClient(resources.publicStorage, asset.object_key);
        const signed = await getSignedUrl(cloud ?? resources.publicStorage, new GetObjectCommand({ Bucket: cloud ? resources.publicStorage.cloudReferenceBucketEndpoint : resources.config.objectStorage.bucket, Key: asset.object_key }), { expiresIn: 6 * 60 * 60 });
        const endpoint = new URL(signed);
        url = endpoint.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname) ? signed : `data:image/${format === "jpeg" ? "jpeg" : "png"};base64,${object.bytes.toString("base64")}`;
      }
      result.push({ ...item, pixelWidth: width, pixelHeight: height, ...(url ? { url } : {}) });
      continue;
    }
    const metadata = readMp4Metadata(object.bytes);
    const maxDuration = input.type === "motion_control" ? input.characterOrientation === "image" ? 10 : 30 : 15.5;
    if (metadata.durationSeconds < 3 || metadata.durationSeconds > maxDuration) throw new VideoGenerationError("VIDEO_DURATION_INVALID", `该用途的视频时长需要为 3–${maxDuration} 秒。`, 409);
    if (input.type === "motion_control" && (Math.min(metadata.pixelWidth, metadata.pixelHeight) < 340 || Math.max(metadata.pixelWidth, metadata.pixelHeight) > 3850)) throw new VideoGenerationError("VIDEO_DIMENSIONS_INVALID", "动作视频的宽高需要为 340–3850 像素。", 409);
    let url; let bridgeKey;
    if (provider) {
      let client = cloudReferenceReadClient(resources.publicStorage, asset.object_key) ?? resources.publicStorage;
      let bucket = client === resources.publicStorage ? resources.config.objectStorage.bucket : resources.publicStorage.cloudReferenceBucketEndpoint;
      let key = asset.object_key;
      url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 6 * 60 * 60 });
      // Local object URLs cannot be read by Kling. Bridge only this task's video to the configured private cloud bucket.
      if (new URL(url).protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
        client = resources.publicStorage.cloudReferenceClient; bucket = resources.publicStorage.cloudReferenceBucketEndpoint;
        if (!client || !bucket) throw new VideoGenerationError("VIDEO_PUBLIC_INPUT_UNAVAILABLE", "视频素材需要配置可供生成服务读取的私有云存储。", 503);
        key = `local-dev/references/video-generation-bridge/${input.requestId}/${item.assetId}.mp4`; bridgeKey = key;
        // Record cleanup ownership before the upload, including preparation failures.
        await resources.pool.query("UPDATE video_generation_jobs SET bridge_keys=$2::jsonb WHERE id=$1 AND owner_id=$3 AND workspace_id=$4 AND state='queued'", [input.requestId, JSON.stringify([key]), ownerId, workspaceId]);
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: object.bytes, ContentType: "video/mp4" }));
        url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 6 * 60 * 60 });
      }
    }
    result.push({ ...item, ...metadata, ...(url ? { url } : {}), ...(bridgeKey ? { bridgeKey } : {}) });
  }
  return result;
}
