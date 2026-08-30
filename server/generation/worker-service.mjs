import { createHash, randomUUID } from "node:crypto";
import {
  NormalizedProviderError,
  createProviderTask,
  downloadProviderOutput,
  pollProviderTask,
} from "./provider.mjs";
import {
  claimGenerationJob,
  completeGenerationJob,
  deferGenerationJob,
  failGenerationJob,
  markGenerationRefining,
  renewGenerationLease,
  saveProviderTask,
} from "./repository.mjs";
import { storeGeneratedAsset } from "./storage.mjs";

const INTERNAL_ERROR = Object.freeze({
  code: "INTERNAL_ERROR",
  message: "生成服务暂时不可用。输入内容已保留，请稍后重试。",
  retryable: true,
  title: "本次生成未完成",
});

function normalizedError(error) {
  if (error instanceof NormalizedProviderError) return error;
  return INTERNAL_ERROR;
}

export async function processGenerationJob(resources, { jobId, workerId }) {
  const { config, pool, storage } = resources;
  const claim = await claimGenerationJob(pool, {
    jobId,
    leaseMs: config.workerLeaseMs,
    workerId,
  });
  if (!claim.claimed) return { outcome: claim.reason };

  const { attempt, job } = claim;
  try {
    let taskId = attempt.provider_task_id;
    if (!taskId) {
      taskId = await createProviderTask({ attempt, config: config.provider, job });
      await saveProviderTask(pool, { attemptId: attempt.id, taskId });
    }

    const output = await pollProviderTask({
      config: config.provider,
      onRefining: async () => {
        await markGenerationRefining(pool, { jobId, workerId });
        await renewGenerationLease(pool, {
          jobId,
          leaseMs: config.workerLeaseMs,
          workerId,
        });
      },
      taskId,
    });
    const downloaded = await downloadProviderOutput(output);
    const checksum = createHash("sha256").update(downloaded.bytes).digest("hex");
    const assetId = randomUUID();
    const objectKey = `generated/${job.owner_id}/${job.id}.png`;
    await storeGeneratedAsset({
      bucket: config.objectStorage.bucket,
      bytes: downloaded.bytes,
      checksum,
      contentType: downloaded.contentType,
      key: objectKey,
      storage,
    });
    await completeGenerationJob(pool, {
      asset: {
        aspectRatio: job.aspect_ratio,
        batchId: job.batch_id,
        byteSize: downloaded.bytes.length,
        checksum,
        id: assetId,
        mimeType: downloaded.contentType,
        objectKey,
        ownerId: job.owner_id,
        pixelHeight: downloaded.height,
        pixelWidth: downloaded.width,
      },
      attemptId: attempt.id,
      jobId,
      resultHash: checksum,
      workerId,
    });
    return { outcome: "succeeded" };
  } catch (error) {
    if (error instanceof NormalizedProviderError) {
      await failGenerationJob(pool, {
        attemptId: attempt.id,
        error: normalizedError(error),
        jobId,
        workerId,
      });
      return { outcome: "failed" };
    }

    await deferGenerationJob(pool, {
      jobId,
      message: error instanceof Error ? error.message : String(error),
      workerId,
    });
    return { outcome: "deferred" };
  }
}

export function createWorkerId() {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}
