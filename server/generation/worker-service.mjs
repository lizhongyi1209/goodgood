import { createHash, randomUUID } from "node:crypto";
import { NormalizedProviderError } from "./provider.mjs";
import { createGenerationProvider } from "./provider-router.mjs";
import {
  claimGenerationJob,
  completeGenerationJob,
  deferGenerationJob,
  failGenerationJob,
  markProviderSubmissionStarted,
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

const SUBMISSION_UNKNOWN = Object.freeze({
  code: "SUBMISSION_UNKNOWN",
  message: "生成请求可能已被上游受理。系统不会自动重复提交；再次生成会创建新的计费任务。",
  retryable: true,
  title: "提交结果暂时无法确认",
});

function normalizedError(error) {
  if (error instanceof NormalizedProviderError) return error;
  return INTERNAL_ERROR;
}

function generatedObjectExtension(contentType) {
  const extension = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  })[contentType];
  if (!extension) throw new Error("Unsupported decoded generated image type.");
  return extension;
}

export async function processGenerationJob(resources, { jobId, workerId }) {
  const { config, pool, publicStorage, storage } = resources;
  const provider = createGenerationProvider({ config, publicStorage, storage });
  const claim = await claimGenerationJob(pool, {
    attemptRoute: provider.route,
    jobId,
    leaseMs: config.workerLeaseMs,
    workerId,
  });
  if (!claim.claimed) return { outcome: claim.reason };

  const { attempt, job } = claim;
  try {
    provider.assertAttempt(attempt);
    let taskId = attempt.provider_task_id;
    if (!taskId) {
      if (
        provider.submissionPolicy === "task-id-required" &&
        attempt.state !== "created"
      ) {
        throw new NormalizedProviderError(SUBMISSION_UNKNOWN);
      }
      taskId = await provider.createTask({
        attempt,
        job,
        onSubmissionStart:
          provider.submissionPolicy === "task-id-required"
            ? async () => {
                const started = await markProviderSubmissionStarted(pool, {
                  attemptId: attempt.id,
                });
                if (!started) {
                  throw new NormalizedProviderError(SUBMISSION_UNKNOWN);
                }
              }
            : undefined,
      });
      await saveProviderTask(pool, { attemptId: attempt.id, taskId });
    }

    const output = await provider.pollTask({
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
    const downloaded = await provider.downloadOutput(output);
    const checksum = createHash("sha256").update(downloaded.bytes).digest("hex");
    const assetId = randomUUID();
    const objectKey = `generated/${job.owner_id}/${job.id}.${generatedObjectExtension(downloaded.contentType)}`;
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
