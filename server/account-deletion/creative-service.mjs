import { randomUUID } from "node:crypto";
import {
  claimAccountDeletionCreativeStep,
  deferAccountDeletionCreativeStep,
  deleteAccountDeletionCreativeRecords,
} from "./creative-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  claimAccountDeletionCreativeStep,
  deferAccountDeletionCreativeStep,
  deleteAccountDeletionCreativeRecords,
});

function requirePositiveInteger(value, name, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
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

function safeLog(logger) {
  logger.error(
    JSON.stringify({
      errorCode: "CREATIVE_DELETE_FAILED",
      event: "account_deletion.creative_records_failed",
    }),
  );
}

export async function runAccountDeletionCreativePass(
  pool,
  {
    batchSize = 10,
    clock = () => new Date(),
    leaseMilliseconds = 60_000,
    logger = console,
    now = null,
    repository = DEFAULT_REPOSITORY,
    requestId = null,
    retryMilliseconds = 60_000,
    workerId = `account-deletion-creative-${randomUUID()}`,
  } = {},
) {
  requirePositiveInteger(batchSize, "batchSize", 100);
  requirePositiveInteger(leaseMilliseconds, "leaseMilliseconds", 300_000);
  requirePositiveInteger(retryMilliseconds, "retryMilliseconds", 86_400_000);
  requireWorkerId(workerId);
  const startedAt = now ?? clock();
  if (!(startedAt instanceof Date) || Number.isNaN(startedAt.getTime())) {
    throw new Error("now must be a valid Date");
  }

  const result = {
    claimed: 0,
    completed: 0,
    deferred: 0,
    deletedRecords: 0,
    failed: 0,
    lostLease: 0,
  };

  for (let index = 0; index < batchSize; index += 1) {
    const claimNow = now ?? clock();
    const claim = await repository.claimAccountDeletionCreativeStep(pool, {
      leaseExpiresAt: new Date(claimNow.getTime() + leaseMilliseconds),
      now: claimNow,
      requestId,
      workerId,
    });
    if (!claim) break;
    result.claimed += 1;

    try {
      const operationNow = now ?? clock();
      const deletion = await repository.deleteAccountDeletionCreativeRecords(
        pool,
        {
          inventorySha256: claim.inventorySha256,
          now: operationNow,
          requestId: claim.requestId,
          workerId,
        },
      );
      if (!deletion.completed) {
        result.lostLease += 1;
        continue;
      }
      result.completed += 1;
      result.deletedRecords += deletion.deletedRecordCount;
    } catch {
      result.failed += 1;
      safeLog(logger);
      const failureNow = now ?? clock();
      const deferred = await repository.deferAccountDeletionCreativeStep(
        pool,
        {
          failedRecordCount: claim.targetRecordCount,
          now: failureNow,
          requestId: claim.requestId,
          retryAt: new Date(failureNow.getTime() + retryMilliseconds),
          workerId,
        },
      );
      if (deferred) result.deferred += 1;
      else result.lostLease += 1;
    }
  }
  return result;
}
