import { sessionExpiredError } from "../auth/errors.mjs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cloudReferenceReadClient } from "../generation/local-cloud-reference.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { resolveWorkspaceAccess } from "../organizations/workspace-access.mjs";
import { defaultVideoGenerationDraft, videoModelForType, VIDEO_GENERATION_MODELS, VIDEO_GENERATION_COUNTS } from "../../shared/contracts/video-generation.mjs";
import { validateVideoGeneration, validateVideoDraft, videoGenerationId } from "./validation.mjs";
import { readVideoInputs } from "./media.mjs";
import { quoteVideoCredits } from "./pricing.mjs";
import { beginVideoJob, findVideoJob, videoInputHash } from "./repository.mjs";
import { videoProviderEndpoint } from "./provider.mjs";
import { VideoGenerationError } from "./errors.mjs";
import { sanitizeFailureDiagnostic } from "../generation/failure-diagnostics.mjs";
function owner(context) { if (!context?.ownerId) throw sessionExpiredError(); return context.ownerId; }
const messages = {
  VIDEO_SUBMISSION_UNKNOWN: "提交结果待确认，请勿重复生成。任务标识可用于排查。",
  VIDEO_SAVE_FAILED: "视频已生成，保存暂未完成。点击重试保存，无需重新生成。",
  VIDEO_SUBMISSION_REJECTED: "视频请求未被接收，预留积分已退回。请检查参数后重试。",
  VIDEO_PROVIDER_FAILED: "视频生成失败，预留积分已退回。可重试本次输入。",
};
async function publicJob(resources, job) {
  let output = null;
  if (job.output_asset_id) {
    const row = (await resources.pool.query("SELECT * FROM video_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'", [job.output_asset_id, job.owner_id, job.workspace_id])).rows[0];
    if (row) output = { id: row.id, name: row.original_file_name, url: await signAssetRead({ bucket: resources.config.objectStorage.bucket, key: row.object_key, publicStorage: resources.publicStorage }), ...job.output_metadata };
  }
  return { requestId: job.id, state: job.state, progress: job.progress, reservedCredits: Number(job.reserved_credit_amount), chargedCredits: Number(job.charged_credit_amount), output,
    error: job.error_code ? { code: job.error_code, message: messages[job.error_code] ?? (job.state === "failed" ? "视频未完成，预留积分已退回。请调整素材后重试。" : "视频状态暂不可用，正在继续查询。"),
      diagnostics: sanitizeFailureDiagnostic(job.failure_diagnostics) } : null };
}
export async function quoteVideoGeneration({ ownerContext, workspaceId, input: raw }) {
  const ownerId = owner(ownerContext); const resources = await getGenerationResources();
  if (!raw || Object.keys(raw).some((key) => !["modelId", "type", "resolution", "duration", "characterOrientation", "videoAssetId"].includes(key))) throw new VideoGenerationError("VIDEO_INPUT_INVALID", "视频价格参数无效。");
  const { videoAssetId, ...fields } = raw;
  const draft = validateVideoDraft({ ...defaultVideoGenerationDraft(), ...fields });
  if (videoModelForType(draft.type) !== draft.modelId) throw new VideoGenerationError("VIDEO_INPUT_INVALID", "模型与生成类型不匹配。");
  if (!VIDEO_GENERATION_MODELS.find((model) => model.id === draft.modelId)?.resolutions.includes(draft.resolution)) throw new VideoGenerationError("VIDEO_INPUT_INVALID", "当前模型不支持该分辨率。");
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId });
  const media = draft.type === "motion_control" ? [{ kind: "video", assetKind: "video", assetId: videoGenerationId(videoAssetId), name: "动作视频", role: "video" }] : [];
  const metadata = media.length ? await readVideoInputs(resources, { input: { ...draft, media }, ownerId, workspaceId: workspace.id }) : [];
  return quoteVideoCredits(draft, metadata);
}
export async function getVideoGenerationCapabilities({ ownerContext, workspaceId }) {
  const resources = await getGenerationResources();
  await resolveWorkspaceAccess(resources.pool, { ownerId: owner(ownerContext), workspaceId });
  const ready = (await resources.pool.query("SELECT to_regclass('public.video_generation_jobs') IS NOT NULL AS ready")).rows[0]?.ready;
  return { enabled: Boolean(ready), counts: VIDEO_GENERATION_COUNTS, models: VIDEO_GENERATION_MODELS.map((model) => ({ id: model.id, name: model.name, resolutions: model.resolutions })) };
}
export async function submitVideoGeneration({ ownerContext, workspaceId, input: raw }) {
  const ownerId = owner(ownerContext); const input = validateVideoGeneration(raw); const resources = await getGenerationResources();
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const existing = await findVideoJob(resources.pool, { requestId: input.requestId, ownerId, workspaceId: workspace.id });
  if (existing) {
    if (existing.input_hash !== videoInputHash(input)) throw new VideoGenerationError("VIDEO_IDEMPOTENCY_CONFLICT", "该任务输入已固定，请新建一次生成。", 409);
    return publicJob(resources, existing);
  }
  videoProviderEndpoint(resources.config.provider, input.modelId);
  const metadata = await readVideoInputs(resources, { input, ownerId, workspaceId: workspace.id });
  const quote = quoteVideoCredits(input, metadata);
  return publicJob(resources, await beginVideoJob(resources.pool, { input, quote, ownerId, workspaceId: workspace.id }));
}
export async function getVideoGeneration({ ownerContext, workspaceId, requestId }) {
  const resources = await getGenerationResources(); const job = await findVideoJob(resources.pool, { requestId: videoGenerationId(requestId), ownerId: owner(ownerContext), workspaceId });
  if (!job) throw new VideoGenerationError("VIDEO_NOT_FOUND", "未找到这次视频生成。", 404);
  return publicJob(resources, job);
}
export async function getVideoGenerationDownload({ ownerContext, workspaceId, requestId }) {
  const resources = await getGenerationResources(); const job = await findVideoJob(resources.pool, { requestId: videoGenerationId(requestId), ownerId: owner(ownerContext), workspaceId });
  if (!job || job.state !== "succeeded" || !job.output_asset_id) throw new VideoGenerationError("VIDEO_NOT_FOUND", "视频结果尚未就绪。", 404);
  const asset = (await resources.pool.query("SELECT * FROM video_materials WHERE id=$1 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready'", [job.output_asset_id, job.owner_id, job.workspace_id])).rows[0];
  if (!asset) throw new VideoGenerationError("VIDEO_NOT_FOUND", "该视频已移除。", 404);
  const cloud = cloudReferenceReadClient(resources.publicStorage, asset.object_key);
  return { url: await getSignedUrl(cloud ?? resources.publicStorage, new GetObjectCommand({ Bucket: cloud ? resources.publicStorage.cloudReferenceBucketEndpoint : resources.config.objectStorage.bucket,
    Key: asset.object_key, ResponseContentDisposition: `attachment; filename="Kling_${job.id.slice(0, 8)}.mp4"`, ResponseContentType: "video/mp4" }), { expiresIn: 15 * 60 }) };
}
export async function retryVideoSave({ ownerContext, workspaceId, requestId }) {
  const resources = await getGenerationResources(); const ownerId = owner(ownerContext);
  const workspace = await resolveWorkspaceAccess(resources.pool, { ownerId, workspaceId, write: true });
  const job = await findVideoJob(resources.pool, { requestId: videoGenerationId(requestId), ownerId, workspaceId: workspace.id });
  if (!job) throw new VideoGenerationError("VIDEO_NOT_FOUND", "未找到这次视频生成。", 404);
  if (job.state === "save_failed" && job.provider_result_url) await resources.pool.query("UPDATE video_generation_jobs SET state='saving',error_code=NULL,next_poll_at=now(),updated_at=now() WHERE id=$1 AND owner_id=$2 AND state='save_failed'", [job.id, ownerId]);
  return getVideoGeneration({ ownerContext, workspaceId, requestId });
}
export async function retryVideoGeneration({ ownerContext, workspaceId, requestId, input }) {
  const resources = await getGenerationResources(); const ownerId = owner(ownerContext);
  const job = await findVideoJob(resources.pool, { requestId: videoGenerationId(requestId), ownerId, workspaceId });
  if (!job || job.state !== "failed") throw new VideoGenerationError("VIDEO_RETRY_NOT_READY", "这次任务还不能重新生成，请先确认任务状态。", 409);
  if (!input || Object.keys(input).some((key) => !["requestId", "quotedCredits"].includes(key))) throw new VideoGenerationError("VIDEO_INPUT_INVALID", "重试参数无效。");
  return submitVideoGeneration({ ownerContext, workspaceId, input: { ...job.input_snapshot, requestId: videoGenerationId(input.requestId), quotedCredits: input.quotedCredits } });
}
