import {
  createAccountDeletionRegisterExport,
  parseAccountDeletionRegisterExport,
} from "./register-export-contract.mjs";
import { readAccountDeletionRegisterForExport } from "./register-export-repository.mjs";
import { applyAccountDeletionRegisterReplay } from "./restore-replay-repository.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  applyAccountDeletionRegisterReplay,
  readAccountDeletionRegisterForExport,
});

export class AccountDeletionRegisterRecoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionRegisterRecoveryError";
    this.code = code;
  }
}

function validDate(value, label) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new AccountDeletionRegisterRecoveryError(
      "REGISTER_RECOVERY_INPUT_INVALID",
      `${label} must be a valid Date.`,
    );
  }
  return value;
}

function requireRepository(repository) {
  if (
    !repository ||
    typeof repository.readAccountDeletionRegisterForExport !== "function" ||
    typeof repository.applyAccountDeletionRegisterReplay !== "function"
  ) {
    throw new AccountDeletionRegisterRecoveryError(
      "REGISTER_RECOVERY_INPUT_INVALID",
      "The register recovery repository is incomplete.",
    );
  }
  return repository;
}

function requireLogger(logger) {
  if (!logger || typeof logger.error !== "function" || typeof logger.info !== "function") {
    throw new AccountDeletionRegisterRecoveryError(
      "REGISTER_RECOVERY_INPUT_INVALID",
      "logger must provide error and info functions.",
    );
  }
  return logger;
}

function aggregateCount(value, label) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new AccountDeletionRegisterRecoveryError(
      "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
      `${label} must be a non-negative safe integer.`,
    );
  }
  return count;
}

function creditCount(value) {
  const count = String(value);
  if (!/^\d+$/.test(count)) {
    throw new AccountDeletionRegisterRecoveryError(
      "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
      "expiredCredits must be a non-negative integer string.",
    );
  }
  return count;
}

export async function exportAccountDeletionRegister(
  pool,
  {
    exportedAt = new Date(),
    logger = console,
    repository = DEFAULT_REPOSITORY,
  } = {},
) {
  validDate(exportedAt, "exportedAt");
  requireLogger(logger);
  requireRepository(repository);
  let artifact;
  try {
    const records = await repository.readAccountDeletionRegisterForExport(pool, {
      exportedAt,
    });
    artifact = createAccountDeletionRegisterExport({
      exportedAt: exportedAt.toISOString(),
      records,
    });
  } catch {
    logger.error(
      JSON.stringify({
        errorCode: "ACCOUNT_DELETION_REGISTER_EXPORT_FAILED",
        event: "account_deletion.register_export_failed",
      }),
    );
    throw new AccountDeletionRegisterRecoveryError(
      "ACCOUNT_DELETION_REGISTER_EXPORT_FAILED",
      "The account-deletion register export failed.",
    );
  }
  logger.info(
    JSON.stringify({
      event: "account_deletion.register_exported",
      exportedAt: artifact.exportedAt,
      recordCount: artifact.recordCount,
      sha256: artifact.sha256,
    }),
  );
  return artifact;
}

export async function replayAccountDeletionRegister(
  pool,
  artifactInput,
  {
    expectedSha256,
    logger = console,
    replayedAt = new Date(),
    repository = DEFAULT_REPOSITORY,
  } = {},
) {
  validDate(replayedAt, "replayedAt");
  requireLogger(logger);
  requireRepository(repository);
  let artifact;
  let result;
  try {
    artifact = parseAccountDeletionRegisterExport(artifactInput);
    if (
      typeof expectedSha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(expectedSha256) ||
      artifact.sha256 !== expectedSha256
    ) {
      throw new Error("The register export is not bound to trusted evidence");
    }
    if (new Date(artifact.exportedAt) > replayedAt) {
      throw new Error("The register export is from the future");
    }
    result = await repository.applyAccountDeletionRegisterReplay(pool, {
      records: artifact.records,
      replayedAt,
      sha256: artifact.sha256,
    });
  } catch {
    logger.error(
      JSON.stringify({
        errorCode: "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
        event: "account_deletion.register_replay_failed",
      }),
    );
    throw new AccountDeletionRegisterRecoveryError(
      "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
      "The account-deletion register replay failed.",
    );
  }
  let publicResult;
  try {
    const processingBlocked = aggregateCount(
      result.processingBlocked,
      "processingBlocked",
    );
    const alreadyApplied = aggregateCount(
      result.alreadyApplied,
      "alreadyApplied",
    );
    const completedApplied = aggregateCount(
      result.completedApplied,
      "completedApplied",
    );
    const missingOwners = aggregateCount(result.missingOwners, "missingOwners");
    if (
      alreadyApplied + completedApplied + missingOwners + processingBlocked !==
      artifact.recordCount
    ) {
      throw new Error("Replay totals do not match the artifact");
    }
    publicResult = Object.freeze({
      alreadyApplied,
      artifactSha256: artifact.sha256,
      completedApplied,
      deletedCreativeRecords: aggregateCount(
        result.deletedCreativeRecords,
        "deletedCreativeRecords",
      ),
      deletedIdentities: aggregateCount(
        result.deletedIdentities,
        "deletedIdentities",
      ),
      deletedSessions: aggregateCount(result.deletedSessions, "deletedSessions"),
      expiredCredits: creditCount(result.expiredCredits),
      missingOwners,
      processingBlocked,
      ready: processingBlocked === 0,
      recordCount: artifact.recordCount,
    });
  } catch {
    logger.error(
      JSON.stringify({
        errorCode: "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
        event: "account_deletion.register_replay_failed",
      }),
    );
    throw new AccountDeletionRegisterRecoveryError(
      "ACCOUNT_DELETION_REGISTER_REPLAY_FAILED",
      "The account-deletion register replay failed.",
    );
  }
  logger.info(
    JSON.stringify({
      event: "account_deletion.register_replayed",
      result: publicResult,
    }),
  );
  return publicResult;
}
