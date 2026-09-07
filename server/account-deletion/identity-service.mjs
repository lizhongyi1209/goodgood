import { randomUUID } from "node:crypto";
import {
  externalIdentityTarget,
  requireIdentityDeletionAdapter,
} from "./identity-adapter.mjs";
import {
  claimAccountDeletionIdentityStep,
  markAccountDeletionIdentityDeleted,
  markAccountDeletionIdentityDisabled,
  resolveAccountDeletionIdentityStep,
} from "./identity-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  claimAccountDeletionIdentityStep,
  markAccountDeletionIdentityDeleted,
  markAccountDeletionIdentityDisabled,
  resolveAccountDeletionIdentityStep,
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

function safeLog(logger, errorCode) {
  logger.error(
    JSON.stringify({
      errorCode,
      event: "account_deletion.external_identity_failed",
    }),
  );
}

export async function runAccountDeletionIdentityPass(
  pool,
  {
    batchSize = 10,
    clock = () => new Date(),
    identityAdapter,
    identityBatchSize = 100,
    leaseMilliseconds = 60_000,
    logger = console,
    now = null,
    repository = DEFAULT_REPOSITORY,
    requestId = null,
    retryMilliseconds = 60_000,
    workerId = `account-deletion-identities-${randomUUID()}`,
  } = {},
) {
  requirePositiveInteger(batchSize, "batchSize", 100);
  requirePositiveInteger(identityBatchSize, "identityBatchSize", 100);
  requirePositiveInteger(leaseMilliseconds, "leaseMilliseconds", 300_000);
  requirePositiveInteger(retryMilliseconds, "retryMilliseconds", 86_400_000);
  requireWorkerId(workerId);
  requireIdentityDeletionAdapter(identityAdapter);
  const startedAt = now ?? clock();
  if (!(startedAt instanceof Date) || Number.isNaN(startedAt.getTime())) {
    throw new Error("now must be a valid Date");
  }

  const result = {
    claimed: 0,
    completed: 0,
    deferred: 0,
    deleted: 0,
    disabled: 0,
    failed: 0,
    identitiesClaimed: 0,
    lostLease: 0,
  };

  for (let index = 0; index < batchSize; index += 1) {
    const claimNow = now ?? clock();
    const claim = await repository.claimAccountDeletionIdentityStep(pool, {
      identityLimit: identityBatchSize,
      leaseExpiresAt: new Date(claimNow.getTime() + leaseMilliseconds),
      now: claimNow,
      requestId,
      workerId,
    });
    if (!claim) break;
    result.claimed += 1;
    result.identitiesClaimed += claim.identities.length;
    let failedIdentityCount = 0;
    let leaseLost = false;

    for (const identity of claim.identities) {
      let target;
      try {
        target = externalIdentityTarget(identity);
      } catch {
        failedIdentityCount += 1;
        result.failed += 1;
        safeLog(logger, "IDENTITY_TARGET_INVALID");
        continue;
      }
      let disabled = identity.disabled;
      if (!disabled) {
        try {
          await identityAdapter.disableIdentity(target);
        } catch {
          failedIdentityCount += 1;
          result.failed += 1;
          safeLog(logger, "IDENTITY_DISABLE_FAILED");
          continue;
        }
        try {
          const operationNow = now ?? clock();
          const recorded = await repository.markAccountDeletionIdentityDisabled(
            pool,
            {
              identityId: identity.id,
              now: operationNow,
              requestId: claim.requestId,
              workerId,
            },
          );
          if (!recorded.recorded) {
            result.lostLease += 1;
            leaseLost = true;
            break;
          }
          if (recorded.newlyRecorded) result.disabled += 1;
          disabled = true;
        } catch {
          result.failed += 1;
          leaseLost = true;
          safeLog(logger, "IDENTITY_DISABLE_EVIDENCE_FAILED");
          break;
        }
      }

      if (!disabled) continue;
      try {
        await identityAdapter.deleteIdentity(target);
      } catch {
        failedIdentityCount += 1;
        result.failed += 1;
        safeLog(logger, "IDENTITY_DELETE_FAILED");
        continue;
      }
      try {
        const operationNow = now ?? clock();
        const recorded = await repository.markAccountDeletionIdentityDeleted(
          pool,
          {
            identityId: identity.id,
            now: operationNow,
            requestId: claim.requestId,
            workerId,
          },
        );
        if (!recorded.recorded) {
          result.lostLease += 1;
          leaseLost = true;
          break;
        }
        if (recorded.newlyRecorded) result.deleted += 1;
      } catch {
        result.failed += 1;
        leaseLost = true;
        safeLog(logger, "IDENTITY_DELETE_EVIDENCE_FAILED");
        break;
      }
    }

    if (leaseLost) continue;
    try {
      const resolutionNow = now ?? clock();
      const resolution = await repository.resolveAccountDeletionIdentityStep(
        pool,
        {
          failedIdentityCount,
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
      safeLog(logger, "IDENTITY_DELETE_RESOLUTION_FAILED");
    }
  }
  return result;
}
