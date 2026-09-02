import { randomUUID } from "node:crypto";
import {
  inspectReferenceCleanup,
  markReferenceCleanupFailed,
  markReferenceCleanupSucceeded,
  stageAndClaimReferenceCleanup,
} from "./cleanup-repository.mjs";
import {
  loadReferenceRetentionPolicy,
  referenceRetentionWindow,
} from "./retention.mjs";
import { deleteReferenceObject } from "./storage.mjs";

const defaultRepository = Object.freeze({
  inspectReferenceCleanup,
  markReferenceCleanupFailed,
  markReferenceCleanupSucceeded,
  stageAndClaimReferenceCleanup,
});

export async function previewReferenceCleanup(
  resources,
  {
    now = new Date(),
    ownerId = null,
    policy = loadReferenceRetentionPolicy(),
    repository = defaultRepository,
  } = {},
) {
  const window = referenceRetentionWindow(policy, now);
  return repository.inspectReferenceCleanup(resources.pool, {
    now: window.now,
    orphanedBefore: window.orphanedBefore,
    ownerId,
  });
}

export async function cleanupReferenceAssets(
  resources,
  {
    deleteObject = deleteReferenceObject,
    logger = console,
    now = new Date(),
    ownerId = null,
    policy = loadReferenceRetentionPolicy(),
    repository = defaultRepository,
  } = {},
) {
  const cleanupRunId = `reference-cleanup-${randomUUID()}`;
  const window = referenceRetentionWindow(policy, now);
  const staged = await repository.stageAndClaimReferenceCleanup(resources.pool, {
    cleanupEligibleAt: window.cleanupEligibleAt,
    cleanupRunId,
    leaseExpiresAt: window.leaseExpiresAt,
    limit: policy.batchSize,
    now: window.now,
    orphanedBefore: window.orphanedBefore,
    ownerId,
  });
  let deleted = 0;
  let failed = 0;
  let lostLease = 0;

  for (const candidate of staged.candidates) {
    try {
      await deleteObject({
        bucket: resources.config.objectStorage.bucket,
        key: candidate.object_key,
        storage: resources.storage,
      });
      const recorded = await repository.markReferenceCleanupSucceeded(
        resources.pool,
        {
          cleanupRunId,
          now: window.now,
          referenceId: candidate.id,
        },
      );
      if (recorded) deleted += 1;
      else lostLease += 1;
    } catch (error) {
      failed += 1;
      await repository.markReferenceCleanupFailed(resources.pool, {
        cleanupRunId,
        errorCode: "OBJECT_DELETE_FAILED",
        now: window.now,
        referenceId: candidate.id,
      });
      logger.error(
        JSON.stringify({
          event: "reference.cleanup_delete_failed",
          message: error instanceof Error ? error.message : String(error),
          referenceId: candidate.id,
        }),
      );
    }
  }

  return {
    claimed: staged.candidates.length,
    deleted,
    expired: staged.expired,
    failed,
    lostLease,
    rescued: staged.rescued,
    staged: staged.staged,
  };
}
