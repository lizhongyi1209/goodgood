import { createHash, randomUUID } from "node:crypto";
import { NormalizedProviderError } from "./provider.mjs";
import { sanitizeFailureDiagnostic } from "./failure-diagnostics.mjs";
import { isExpectedGenerationOutputCount } from "./capabilities.mjs";
import {
  createGenerationProvider,
  generationProviderRouteForModel,
  generationProviderFallbackRoute,
} from "./provider-router.mjs";
import {
  claimGenerationJob,
  createProviderFallbackAttempt,
  completeGenerationJob,
  deferGenerationJob,
  failGenerationJob,
  markProviderSubmissionStarted,
  markGenerationRefining,
  renewGenerationLease,
  saveProviderTask,
} from "./repository.mjs";
import {
  discardGeneratedAsset,
  storeGeneratedAsset,
} from "./storage.mjs";

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

class SupersededGenerationExecution extends Error {
  constructor() {
    super("Another execution already owns this generation attempt.");
    this.name = "SupersededGenerationExecution";
  }
}

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

export async function resolveStoredGenerationCompletion({
  completion,
  discard,
}) {
  if (completion.completed) return { outcome: "succeeded" };
  const discardStoredObject = ["cancelled", "failed", "missing"].includes(
    completion.reason,
  );
  if (!discardStoredObject) {
    return {
      completionReason: completion.reason,
      objectDiscarded: false,
      outcome: "superseded",
    };
  }
  try {
    await discard();
    return {
      completionReason: completion.reason,
      objectDiscarded: true,
      outcome: "superseded",
    };
  } catch {
    return {
      code: "OBJECT_DELETE_FAILED",
      completionReason: completion.reason,
      objectDiscarded: false,
      outcome: "orphaned",
    };
  }
}

export async function storeProviderOutputs({
  bucket,
  createAssetId = randomUUID,
  discard = discardGeneratedAsset,
  downloadOutput,
  job,
  outputs,
  storage,
  store = storeGeneratedAsset,
}) {
  if (!Array.isArray(outputs) || !isExpectedGenerationOutputCount({ modelId: job.model_id, requestedCount: job.requested_count, actualCount: outputs.length })) {
    throw new NormalizedProviderError({
      code: "INTERNAL_ERROR",
      message: "生成服务返回的图片数量与请求不一致。输入内容已保留，请重试。",
    });
  }
  const assets = [];
  const objectKeys = [];
  try {
    for (const [index, output] of outputs.entries()) {
      const ordinal = index + 1;
      const downloaded = await downloadOutput(output);
      const checksum = createHash("sha256").update(downloaded.bytes).digest("hex");
      const storageScope = job.workspace_id
        ? `${job.workspace_id}/${job.owner_id}`
        : job.owner_id;
      const objectKey = `generated/${storageScope}/${job.id}-${ordinal}.${generatedObjectExtension(downloaded.contentType)}`;
      objectKeys.push(objectKey);
      await store({
        bucket,
        bytes: downloaded.bytes,
        checksum,
        contentType: downloaded.contentType,
        key: objectKey,
        storage,
      });
      assets.push({
        aspectRatio: job.aspect_ratio,
        batchId: job.batch_id,
        byteSize: downloaded.bytes.length,
        checksum,
        id: createAssetId(),
        mimeType: downloaded.contentType,
        objectKey,
        ordinal,
        ownerId: job.owner_id,
        creatorOwnerId: job.creator_owner_id ?? job.owner_id,
        workspaceId: job.workspace_id ?? null,
        pixelHeight: downloaded.height,
        pixelWidth: downloaded.width,
      });
    }
    return { assets, objectKeys };
  } catch (error) {
    await Promise.allSettled(objectKeys.map((key) =>
      discard({ bucket, key, storage })
    ));
    throw error;
  }
}

export async function processGenerationJob(resources, { jobId, workerId }) {
  const startedAt = Date.now();
  const { config, pool, publicStorage, storage } = resources;
  const claim = await claimGenerationJob(pool, {
    attemptRouteForModel: (modelId, imageLine, job, attempt) =>
      generationProviderRouteForModel(config.provider.kind, modelId, imageLine, job, attempt),
    jobId,
    leaseMs: config.workerLeaseMs,
    workerId,
  });
  if (!claim.claimed) {
    return {
      durationMs: Date.now() - startedAt,
      outcome: claim.reason,
      provider: claim.route?.provider ?? config.provider.kind,
      routeVersion: claim.route?.routeVersion,
    };
  }

  const { job } = claim;
  let attempt = claim.attempt;
  let provider = createGenerationProvider({
    config,
    publicStorage,
    route: claim.route,
    storage,
  });
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
    if (!provider.isTaskSubmissionComplete({ job, taskId })) {
      if (
        !taskId &&
        provider.submissionPolicy === "task-id-required" &&
        attempt.state !== "created"
      ) {
        throw new NormalizedProviderError(SUBMISSION_UNKNOWN);
      }
      stage = "provider-submission";
      let persistedTaskId = taskId ?? null;
      const persistTaskId = async (
        nextTaskId,
        { submissionAccepted = true } = {},
      ) => {
        let saved;
        try {
          saved = await saveProviderTask(pool, {
            attemptId: attempt.id,
            previousTaskId: persistedTaskId,
            taskId: nextTaskId,
          });
        } catch (error) {
          if (
            provider.submissionPolicy === "task-id-required" &&
            submissionAccepted
          ) {
            throw new NormalizedProviderError(SUBMISSION_UNKNOWN);
          }
          throw error;
        }
        if (!saved) throw new SupersededGenerationExecution();
        persistedTaskId = nextTaskId;
        taskId = nextTaskId;
      };
      const submit = () => provider.createTask({
        attempt,
        job,
        onTaskCreated: persistTaskId,
        onSubmissionStart:
          provider.submissionPolicy === "task-id-required"
            ? async (submissionToken = null) => {
                if (submissionToken) {
                  await persistTaskId(submissionToken, {
                    submissionAccepted: false,
                  });
                  return;
                }
                const started = await markProviderSubmissionStarted(pool, {
                  attemptId: attempt.id,
                });
                if (!started) {
                  throw new SupersededGenerationExecution();
                }
              }
            : undefined,
        taskId,
      });
      let createdTaskId;
      try { createdTaskId = await submit(); }
      catch (error) {
        const backup = generationProviderFallbackRoute(config.provider.kind, provider.route, job);
        if (!error.channelUnavailable || persistedTaskId || !backup) throw error;
        const nextAttempt = await createProviderFallbackAttempt(pool, {
          jobId, workerId, attemptId: attempt.id, fromRoute: provider.route, toRoute: backup,
          diagnostics: sanitizeFailureDiagnostic({ ...error.diagnostics, stage, code: error.code,
            attemptId: attempt.id, ordinal: attempt.ordinal, provider: attempt.provider,
            providerModel: attempt.provider_model, routeVersion: attempt.route_version }, { secrets: [job.prompt] }),
        });
        if (!nextAttempt) throw new SupersededGenerationExecution();
        attempt = nextAttempt;
        provider = createGenerationProvider({ config, publicStorage, storage, route: backup });
        provider.assertAttempt(attempt);
        createdTaskId = await submit();
      }
      if (createdTaskId !== persistedTaskId) {
        await persistTaskId(createdTaskId);
      }
      taskId = createdTaskId;
    }

    stage = "provider-poll";
    const outputs = await provider.pollTask({
      job,
      expectedOutputCount: job.requested_count,
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
    stage = "output-storage";
    const { assets, objectKeys } = await storeProviderOutputs({
      bucket: config.objectStorage.bucket,
      downloadOutput: (output) => provider.downloadOutput(output),
      job,
      outputs,
      storage,
    });
    stage = "generation-completion";
    const completion = await completeGenerationJob(pool, {
      assets,
      attemptId: attempt.id,
      jobId,
      resultHash: createHash("sha256")
        .update(JSON.stringify(assets.map((asset) => asset.checksum)))
        .digest("hex"),
      workerId,
    });
    const resolution = await resolveStoredGenerationCompletion({
      completion,
      discard: () =>
        Promise.all(objectKeys.map((key) =>
          discardGeneratedAsset({
            bucket: config.objectStorage.bucket,
            key,
            storage,
          })
        )),
    });
    return { ...resultContext(), ...resolution, stage };
  } catch (error) {
    if (error instanceof SupersededGenerationExecution) {
      return { ...resultContext(), outcome: "superseded", stage };
    }
    if (error instanceof NormalizedProviderError) {
      await failGenerationJob(pool, {
        attemptId: attempt.id,
        error: normalizedError(error),
        diagnostics: sanitizeFailureDiagnostic({ ...error.diagnostics, stage, code: error.code,
          attemptId: attempt.id, ordinal: attempt.ordinal, provider: attempt.provider,
          providerModel: attempt.provider_model, routeVersion: attempt.route_version }, { secrets: [job.prompt] }),
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
      message:error instanceof Error ? error.message : String(error),
      workerId,
    });
    return { ...resultContext(), outcome: "deferred", stage };
  }
}

export function createWorkerId() {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}
