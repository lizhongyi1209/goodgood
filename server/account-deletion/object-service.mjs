import { randomUUID } from "node:crypto";
import {
  claimAccountDeletionObjectStep,
  markAccountDeletionObjectSucceeded,
  resolveAccountDeletionObjectStep,
} from "./object-repository.mjs";
import { deletePrivateObject } from "./object-storage.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  claimAccountDeletionObjectStep,
  markAccountDeletionObjectSucceeded,
  resolveAccountDeletionObjectStep,
});

function requirePositiveInteger(value, name, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function safeLog(logger, errorCode) {
  logger.error(
    JSON.stringify({
      errorCode,
      event: "account_deletion.private_object_failed",
    }),
  );
}

function requireWorkerId(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("workerId must contain 8 to 200 safe characters");
  }
  return value;
}

export async function runAccountDeletionObjectPass(
  resources,
  {
    batchSize = 10,
    clock = () => new Date(),
    deleteObject = deletePrivateObject,
    leaseMilliseconds = 60_000,
    logger = console,
    now = null,
    objectBatchSize = 100,
    repository = DEFAULT_REPOSITORY,
    requestId = null,
    retryMilliseconds = 60_000,
    workerId = `account-deletion-objects-${randomUUID()}`,
  } = {},
) {
  requirePositiveInteger(batchSize, "batchSize", 100);
  requirePositiveInteger(leaseMilliseconds, "leaseMilliseconds", 300_000);
  requirePositiveInteger(objectBatchSize, "objectBatchSize", 100);
  requirePositiveInteger(retryMilliseconds, "retryMilliseconds", 86_400_000);
  requireWorkerId(workerId);
  const startedAt = now ?? clock();
  if (!(startedAt instanceof Date) || Number.isNaN(startedAt.getTime())) {
    throw new Error("now must be a valid Date");
  }
  if (!resources?.config?.objectStorage?.bucket) {
    throw new Error("Private object storage bucket is required.");
  }

  const result = {
    claimed: 0,
    completed: 0,
    deferred: 0,
    deleted: 0,
    failed: 0,
    lostLease: 0,
    objectsClaimed: 0,
  };

  for (let index = 0; index < batchSize; index += 1) {
    const claimNow = now ?? clock();
    const claim = await repository.claimAccountDeletionObjectStep(
      resources.pool,
      {
        leaseExpiresAt: new Date(claimNow.getTime() + leaseMilliseconds),
        now: claimNow,
        objectLimit: objectBatchSize,
        requestId,
        workerId,
      },
    );
    if (!claim) break;
    result.claimed += 1;
    result.objectsClaimed += claim.objects.length;
    let failedObjectCount = 0;
    let leaseLost = false;

    for (const object of claim.objects) {
      try {
        await deleteObject({
          bucket: resources.config.objectStorage.bucket,
          key: object.objectKey,
          storage: resources.storage,
        });
      } catch {
        failedObjectCount += 1;
        result.failed += 1;
        safeLog(logger, "OBJECT_DELETE_FAILED");
        continue;
      }

      try {
        const operationNow = now ?? clock();
        const recorded = await repository.markAccountDeletionObjectSucceeded(
          resources.pool,
          {
            now: operationNow,
            object,
            requestId: claim.requestId,
            workerId,
          },
        );
        if (!recorded) {
          leaseLost = true;
          result.lostLease += 1;
          break;
        }
        result.deleted += 1;
      } catch {
        result.failed += 1;
        leaseLost = true;
        safeLog(logger, "OBJECT_DELETE_EVIDENCE_FAILED");
        break;
      }
    }

    if (leaseLost) continue;
    try {
      const resolutionNow = now ?? clock();
      const resolution = await repository.resolveAccountDeletionObjectStep(
        resources.pool,
        {
          failedObjectCount,
          now: resolutionNow,
          requestId: claim.requestId,
          retryAt: new Date(
            resolutionNow.getTime() + retryMilliseconds,
          ),
          workerId,
        },
      );
      if (!resolution.resolved) result.lostLease += 1;
      else if (resolution.state === "completed") result.completed += 1;
      else result.deferred += 1;
    } catch {
      result.failed += 1;
      safeLog(logger, "OBJECT_DELETE_RESOLUTION_FAILED");
    }
  }
  return result;
}
