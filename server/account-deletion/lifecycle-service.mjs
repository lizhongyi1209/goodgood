import { randomUUID } from "node:crypto";
import {
  claimAccountDeletionWaitStep,
  inspectAccountDeletionLifecycle,
  resolveAccountDeletionWaitStep,
} from "./lifecycle-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  claimAccountDeletionWaitStep,
  inspectAccountDeletionLifecycle,
  resolveAccountDeletionWaitStep,
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

export function previewAccountDeletionLifecycle(
  pool,
  { now = new Date(), repository = DEFAULT_REPOSITORY, requestId = null } = {},
) {
  return repository.inspectAccountDeletionLifecycle(pool, { now, requestId });
}

export async function runAccountDeletionWaitPass(
  pool,
  {
    batchSize = 50,
    leaseMilliseconds = 30_000,
    logger = console,
    now = new Date(),
    repository = DEFAULT_REPOSITORY,
    requestId = null,
    retryMilliseconds = 60_000,
    workerId = `account-deletion-wait-${randomUUID()}`,
  } = {},
) {
  requirePositiveInteger(batchSize, "batchSize", 500);
  requirePositiveInteger(leaseMilliseconds, "leaseMilliseconds", 300_000);
  requirePositiveInteger(retryMilliseconds, "retryMilliseconds", 86_400_000);
  requireWorkerId(workerId);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid Date");
  }

  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const retryAt = new Date(now.getTime() + retryMilliseconds);
  const result = {
    claimed: 0,
    completed: 0,
    deferred: 0,
    failed: 0,
    lostLease: 0,
  };

  for (let index = 0; index < batchSize; index += 1) {
    const claim = await repository.claimAccountDeletionWaitStep(pool, {
      leaseExpiresAt,
      now,
      requestId,
      workerId,
    });
    if (!claim) break;
    result.claimed += 1;
    try {
      const resolution = await repository.resolveAccountDeletionWaitStep(pool, {
        now,
        requestId: claim.requestId,
        retryAt,
        workerId,
      });
      if (!resolution.resolved) result.lostLease += 1;
      else if (resolution.state === "completed") result.completed += 1;
      else result.deferred += 1;
    } catch {
      result.failed += 1;
      logger.error(
        JSON.stringify({
          errorCode: "DELETION_WAIT_STEP_FAILED",
          event: "account_deletion.wait_step_failed",
        }),
      );
    }
  }

  return result;
}
