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
  const startedAt = Date.now();
  const { config, pool, publicStorage, storage } = resources;
  const provider = createGenerationProvider({ config, publicStorage, storage });
  const claim = await claimGenerationJob(pool, {
    attemptRoute: provider.route,
    jobId,
    leaseMs: config.workerLeaseMs,
    workerId,
  });
  if (!claim.claimed) {
    return {
      durationMs: Date.now() - startedAt,
      outcome: claim.reason,
      provider: provider.route.provider,
      routeVersion: provider.route.routeVersion,
    };
  }

  const { attempt, job } = claim;
  let stage = "attempt-validation";
  let taskId = attempt.provider_task_id;
  let providerStartedAt = null;
  const resultContext = () => ({
    customerCreditAmount:
      job.quoted_credit_amount === null || job.quoted_credit_amount === undefined
        ? undefined
        : String(job.quoted_credit_amount),
    customerCreditUnit: job.quoted_credit_unit ?? undefined,
    durationMs: Date.now() - startedAt,
    ownerId: job.owner_id,
    provider: provider.route.provider,
    providerLatencyMs:
      providerStartedAt === null ? undefined : Date.now() - providerStartedAt,
    providerTaskId: taskId ?? undefined,
    routeVersion: provider.route.routeVersion,
  });
  try {
    provider.assertAttempt(attempt);
    providerStartedAt = Date.now();
    if (!taskId) {
      if (
        provider.submissionPolicy === "task-id-required" &&
        attempt.state !== "created"
      ) {
        throw new NormalizedProviderError(SUBMISSION_UNKNOWN);
      }
      stage = "provider-submission";
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

    stage = "provider-poll";
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
    stage = "output-download";
    const downloaded = await provider.downloadOutput(output);
    const checksum = createHash("sha256").update(downloaded.bytes).digest("hex");
    const assetId = randomUUID();
    const objectKey = `generated/${job.owner_id}/${job.id}.${generatedObjectExtension(downloaded.contentType)}`;
    stage = "asset-store";
    await storeGeneratedAsset({
      bucket: config.objectStorage.bucket,
      bytes: downloaded.bytes,
      checksum,
      contentType: downloaded.contentType,
      key: objectKey,
      storage,
    });
    stage = "generation-completion";
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
    return { ...resultContext(), outcome: "succeeded", stage };
  } catch (error) {
    if (error instanceof NormalizedProviderError) {
      await failGenerationJob(pool, {
        attemptId: attempt.id,
        error: normalizedError(error),
        jobId,
        workerId,
      });
      return {
        ...resultContext(),
        code: error.code,
        outcome: "failed",
        stage,
      };
    }

    await deferGenerationJob(pool, {
      jobId,
      message: error instanceof Error ? error.message : String(error),
      workerId,
    });
    return { ...resultContext(), outcome: "deferred", stage };
  }
}

export function createWorkerId() {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}
