import { createHash, randomUUID } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storeGeneratedAsset } from "../generation/storage.mjs";
import { sanitizeFailureDiagnostic } from "../generation/failure-diagnostics.mjs";
import { claimVideoJob, markVideoSubmitting, persistVideoReceipt, updateVideoJob, closeVideoJob } from "./repository.mjs";
import { readVideoInputs } from "./media.mjs";
import { createVideoProviderTask, queryVideoProviderTask } from "./provider.mjs";
import { downloadVideo } from "./download.mjs";
import { readMp4Metadata } from "./mp4.mjs";
async function discardBridges(resources, job) {
  for (const key of job.bridge_keys ?? []) {
    if (typeof key !== "string" || !key.startsWith(`local-dev/references/video-generation-bridge/${job.id}/`)) continue;
    try { await resources.storage.send(new DeleteObjectCommand({ Bucket: resources.config.objectStorage.bucket, Key: key })); } catch { /* Cleanup never changes a paid result. */ }
  }
}
export async function processVideoGeneration(resources, job, leaseOwner, dependencies = {}) {
  const provider = resources.config.provider; const diagnostics = (error) => sanitizeFailureDiagnostic(error?.diagnostics);
  const heartbeat = setInterval(() => { void resources.pool.query("UPDATE video_generation_jobs SET lease_expires_at=now()+interval '3 minutes' WHERE id=$1 AND lease_owner=$2", [job.id, leaseOwner]).catch(() => {}); }, 30_000);
  heartbeat.unref();
  let posted = false; let receipt = null;
  try {
    if (job.state === "queued") {
      const media = await (dependencies.readInputs ?? readVideoInputs)(resources, { input: job.input_snapshot, ownerId: job.owner_id, workspaceId: job.workspace_id, provider: true });
      if (!await markVideoSubmitting(resources.pool, job.id, leaseOwner, media.flatMap((item) => item.bridgeKey ? [item.bridgeKey] : []))) return;
      posted = true;
      const task = receipt = await (dependencies.createTask ?? createVideoProviderTask)(provider, job.input_snapshot, media);
      if (!await persistVideoReceipt(resources.pool, job.id, leaseOwner, task)) return;
      if (task.state === "failed") {
        const closed = await closeVideoJob(resources.pool, { jobId: job.id, leaseOwner, succeeded: false, errorCode: "VIDEO_PROVIDER_FAILED", diagnostics: task.diagnostics });
        if (closed) await discardBridges(resources, closed);
        return;
      }
      await updateVideoJob(resources.pool, job.id, leaseOwner, { provider_task_id: task.taskId, state: task.state === "succeeded" ? "saving" : "running", provider_result_url: task.videoUrl,
        provider_cost: task.providerCost, progress: task.progress, error_code: null });
    } else if (job.state === "running") {
      const task = await (dependencies.queryTask ?? queryVideoProviderTask)(provider, job.input_snapshot, job.provider_task_id);
      if (task.state === "failed") {
        const closed = await closeVideoJob(resources.pool, { jobId: job.id, leaseOwner, succeeded: false, errorCode: "VIDEO_PROVIDER_FAILED", diagnostics: task.diagnostics });
        if (closed) await discardBridges(resources, job);
      } else await updateVideoJob(resources.pool, job.id, leaseOwner, { state: task.state === "succeeded" ? "saving" : "running", provider_result_url: task.videoUrl,
        provider_cost: task.providerCost, progress: task.progress, error_code: null, failure_diagnostics: null });
    } else if (job.state === "saving") {
      const bytes = await (dependencies.download ?? downloadVideo)(job.provider_result_url); const metadata = readMp4Metadata(bytes);
      const key = `video-materials/${job.workspace_id}/${job.owner_id}/${job.id}/original`;
      await storeGeneratedAsset({ bucket: resources.config.objectStorage.bucket, bytes, checksum: createHash("sha256").update(bytes).digest("hex"), contentType: "video/mp4", key, storage: resources.storage });
      const closed = await closeVideoJob(resources.pool, { jobId: job.id, leaseOwner, succeeded: true, output: { key, byteSize: bytes.length, name: `Kling_${job.id.slice(0, 8)}.mp4`, ...metadata } });
      if (closed) await discardBridges(resources, job);
    }
  } catch (error) {
    if (job.state === "saving") await updateVideoJob(resources.pool, job.id, leaseOwner, { state: "save_failed", error_code: "VIDEO_SAVE_FAILED", failure_diagnostics: diagnostics(error) });
    else if (job.state === "running") await updateVideoJob(resources.pool, job.id, leaseOwner, { state: "running", error_code: "VIDEO_POLL_UNAVAILABLE", failure_diagnostics: diagnostics(error) });
    else if (receipt) await updateVideoJob(resources.pool, job.id, leaseOwner, { state: receipt.state === "succeeded" ? "saving" : "running", provider_task_id: receipt.taskId, provider_result_url: receipt.videoUrl, error_code: "VIDEO_POLL_UNAVAILABLE", failure_diagnostics: diagnostics(error) });
    else if (posted && error?.code !== "VIDEO_SUBMISSION_REJECTED") await updateVideoJob(resources.pool, job.id, leaseOwner, { state: "submission_unknown", error_code: "VIDEO_SUBMISSION_UNKNOWN", failure_diagnostics: diagnostics(error) });
    else {
      const closed = await closeVideoJob(resources.pool, { jobId: job.id, leaseOwner, succeeded: false, errorCode: error?.code ?? "VIDEO_MATERIAL_UNAVAILABLE", diagnostics: diagnostics(error) });
      if (closed) await discardBridges(resources, closed);
    }
  } finally { clearInterval(heartbeat); }
}
export function startVideoGenerationWorker(resources, workerId) {
  let stopping = false; let unavailable = false; const active = new Set();
  const loop = (async () => {
    while (!stopping && !unavailable) {
      try {
        if (active.size < 2) {
          const leaseOwner = `${workerId}:video:${randomUUID()}`; const job = await claimVideoJob(resources.pool, leaseOwner);
          if (job) {
            const work = processVideoGeneration(resources, job, leaseOwner).catch(() => console.error(JSON.stringify({ event: "video_generation.worker_failed", jobId: job.id }))).finally(() => active.delete(work));
            active.add(work); continue;
          }
        }
      } catch (error) {
        if (error?.code === "42P01") unavailable = true;
        console.error(JSON.stringify({ event: unavailable ? "video_generation.migration_required" : "video_generation.queue_unavailable" }));
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  })();
  return { stop: async () => { stopping = true; await loop; await Promise.allSettled([...active]); } };
}
