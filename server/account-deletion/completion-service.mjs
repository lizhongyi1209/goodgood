import { randomUUID } from "node:crypto";
import {
  claimAccountDeletionCompletionStep,
  completeAccountDeletionLocally,
  deferAccountDeletionCompletionStep,
} from "./completion-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  claimAccountDeletionCompletionStep,
  completeAccountDeletionLocally,
  deferAccountDeletionCompletionStep,
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
      errorCode: "LOCAL_ANONYMIZATION_FAILED",
      event: "account_deletion.local_anonymization_failed",
    }),
  );
}

export async function runAccountDeletionCompletionPass(
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
    workerId = `account-deletion-completion-${randomUUID()}`,
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
    deletedIdentities: 0,
    deletedSessions: 0,
    expiredCredits: "0",
    failed: 0,
    lostLease: 0,
  };
  let expiredCredits = 0n;

  for (let index = 0; index < batchSize; index += 1) {
    const claimNow = now ?? clock();
    const claim = await repository.claimAccountDeletionCompletionStep(pool, {
      leaseExpiresAt: new Date(claimNow.getTime() + leaseMilliseconds),
      now: claimNow,
      requestId,
      workerId,
    });
    if (!claim) break;
    result.claimed += 1;
    try {
      const operationNow = now ?? clock();
      const completion = await repository.completeAccountDeletionLocally(pool, {
        now: operationNow,
        requestId: claim.requestId,
        workerId,
      });
      if (!completion.completed) {
        result.lostLease += 1;
        continue;
      }
      result.completed += 1;
      result.deletedIdentities += completion.deletedIdentityCount;
      result.deletedSessions += completion.deletedSessionCount;
      expiredCredits += BigInt(completion.expiredCreditAmount);
    } catch {
      result.failed += 1;
      safeLog(logger);
      const failureNow = now ?? clock();
      const deferred = await repository.deferAccountDeletionCompletionStep(
        pool,
        {
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
  result.expiredCredits = expiredCredits.toString();
  return result;
}
