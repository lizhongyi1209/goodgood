import sharp from "sharp";
import { findOwnerAsset } from "../generation/repository.mjs";
import { findReferenceAsset } from "../references/repository.mjs";
import { readPrivateObject } from "../generation/storage.mjs";
import { TextGenerationError } from "./errors.mjs";

export async function resolveTextMedia(resources, { media, ownerId, workspaceId, signal }) {
  const content = [];
  for (const item of media) {
    signal.throwIfAborted();
    if (item.kind === "video") {
      const result = await resources.pool.query(`SELECT id FROM video_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'`,
        [item.assetId, ownerId, workspaceId]);
      if (!result.rowCount) throw new TextGenerationError("TEXT_INPUT_NOT_AVAILABLE", "输入视频暂不可用，请重新连接素材。", 409);
      content.push({ type: "text", text: `以下为视频的 ${item.frames.length} 张顺序代表画面（不含音频）：` },
        ...item.frames.map((url) => ({ type: "image_url", image_url: { url, detail: "auto" } })));
      continue;
    }
    const asset = item.assetKind === "generated"
      ? await findOwnerAsset(resources.pool, { assetId: item.assetId, ownerId, workspaceId })
      : await findReferenceAsset(resources.pool, { referenceId: item.assetId, ownerId, workspaceId });
    if (!asset || item.assetKind === "reference" && (asset.upload_state !== "ready" || asset.moderation_state !== "accepted" || asset.object_deleted_at)) {
      throw new TextGenerationError("TEXT_INPUT_NOT_AVAILABLE", "输入图片暂不可用，请重新连接素材。", 409);
    }
    try {
      const object = await readPrivateObject({ bucket: resources.config.objectStorage.bucket, key: asset.object_key,
        storage: resources.storage, maxBytes: 20 * 1024 * 1024 });
      const image = await sharp(object.bytes, { limitInputPixels: 100_000_000 }).rotate()
        .resize(1536, 1536, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#fff" }).jpeg({ quality: 85 }).toBuffer();
      content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image.toString("base64")}`, detail: "auto" } });
    } catch {
      throw new TextGenerationError("TEXT_INPUT_NOT_AVAILABLE", "输入图片暂时无法读取，请稍后重试。", 409);
    }
  }
  signal.throwIfAborted();
  return content;
}
