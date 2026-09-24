import { createHash, randomUUID } from "node:crypto";
import {frozenPresetForJob} from '../inspiration/preset.mjs';
import { NormalizedProviderError } from "./provider.mjs";
import {
  createGenerationProvider,
  generationProviderRouteForModel,
} from "./provider-router.mjs";
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
import {
  discardGeneratedAsset,
  storeGeneratedAsset,
} from "./storage.mjs";
import { newObjectKey } from "./object-storage-routing.mjs";

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
  objectStorage = { providerKind: "r2" },
}) {
  if (!Array.isArray(outputs) || outputs.length !== job.requested_count) {
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
      const objectKey = newObjectKey(
        `generated/${storageScope}/${job.id}-${ordinal}.${generatedObjectExtension(downloaded.contentType)}`,
        objectStorage,
      );
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
    attemptRouteForModel: (modelId, imageLine) =>
      generationProviderRouteForModel(config.provider.kind, modelId, imageLine),
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

  const { attempt, job } = claim;
  const provider = createGenerationProvider({
    config,
    publicStorage,
    route: claim.route,
    storage,
  });
  let stage = "attempt-validation";
  let taskId = attempt.provider_task_id;
  let providerStartedAt = null;
  let privatePreset = null;
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
    privatePreset=await frozenPresetForJob(pool,job.id);
    if(privatePreset) job.prompt=privatePreset.effective_prompt;
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
      const createdTaskId = await provider.createTask({
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
      if (createdTaskId !== persistedTaskId) {
        await persistTaskId(createdTaskId);
      }
      taskId = createdTaskId;
    }

    stage = "provider-poll";
    const outputs = await provider.pollTask({
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
      objectStorage: config.objectStorage,
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
        error: privatePreset?{...normalizedError(error),message:'预设效果生成未完成，请重试或联系站长。'}:normalizedError(error),
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
      message: privatePreset?'Preset generation deferred':error instanceof Error ? error.message : String(error),
      workerId,
    });
    return { ...resultContext(), outcome: "deferred", stage };
  }
}

export function createWorkerId() {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}
