import pg from "pg";
import { pathToFileURL } from "node:url";
import {
  createProductionRecoveryPointManifest,
  ProductionRecoveryPointError,
  serializeProductionRecoveryPointManifest,
  verifyProductionRecoveryPointFiles,
} from "../account-deletion/recovery-point-contract.mjs";
import {
  exportAccountDeletionRegister,
  replayAccountDeletionRegister,
} from "../account-deletion/register-recovery-service.mjs";
import {
  serializeAccountDeletionRegisterExport,
} from "../account-deletion/register-export-contract.mjs";

const { Pool } = pg;
const FILE_OPTIONS = Object.freeze([
  "--archive-file",
  "--manifest-file",
  "--register-file",
]);

function commandError(code, message) {
  return new ProductionRecoveryPointError(code, message);
}

function parseOptions(arguments_, accepted) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 1) {
    const option = arguments_[index];
    if (!accepted.includes(option)) {
      throw commandError(
        "RECOVERY_POINT_ARGUMENT_INVALID",
        `Unknown recovery-point argument: ${option}`,
      );
    }
    if (values.has(option)) {
      throw commandError(
        "RECOVERY_POINT_ARGUMENT_INVALID",
        `${option} may be supplied only once.`,
      );
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw commandError(
        "RECOVERY_POINT_ARGUMENT_INVALID",
        `${option} requires a value.`,
      );
    }
    values.set(option, value);
    index += 1;
  }
  for (const option of accepted) {
    if (!values.has(option)) {
      throw commandError(
        "RECOVERY_POINT_ARGUMENT_INVALID",
        `${option} is required.`,
      );
    }
  }
  return Object.fromEntries(values);
}

export function parseAccountDeletionRecoveryArguments(arguments_) {
  if (!Array.isArray(arguments_) || arguments_.length === 0) {
    throw commandError(
      "RECOVERY_POINT_ARGUMENT_INVALID",
      "A recovery-point command is required.",
    );
  }
  const [action, ...rest] = arguments_;
  if (action === "export") {
    if (rest.length !== 0) {
      throw commandError(
        "RECOVERY_POINT_ARGUMENT_INVALID",
        "The export command accepts no file arguments.",
      );
    }
    return Object.freeze({ action });
  }
  if (action === "create-manifest") {
    const options = parseOptions(rest, [
      "--application-image",
      "--archive-file",
      "--archived-at",
      "--register-file",
    ]);
    return Object.freeze({
      action,
      applicationImage: options["--application-image"],
      archiveFile: options["--archive-file"],
      archivedAt: options["--archived-at"],
      registerFile: options["--register-file"],
    });
  }
  if (action === "verify-bundle" || action === "replay") {
    const options = parseOptions(rest, FILE_OPTIONS);
    return Object.freeze({
      action,
      archiveFile: options["--archive-file"],
      manifestFile: options["--manifest-file"],
      registerFile: options["--register-file"],
    });
  }
  throw commandError(
    "RECOVERY_POINT_ARGUMENT_INVALID",
    "The recovery-point command is unsupported.",
  );
}

function stderrLogger(logger) {
  if (!logger || typeof logger.error !== "function") {
    throw commandError(
      "RECOVERY_POINT_ARGUMENT_INVALID",
      "A stderr logger is required.",
    );
  }
  return Object.freeze({
    error: (message) => logger.error(message),
    info: (message) => logger.error(message),
  });
}

function outputJson(write, value) {
  write(`${JSON.stringify(value)}\n`);
}

export async function runAccountDeletionRecoveryCommand({
  arguments_ = process.argv.slice(2),
  createManifest = createProductionRecoveryPointManifest,
  databaseUrl = process.env.DATABASE_URL,
  exportRegister = exportAccountDeletionRegister,
  logger = console,
  now = () => new Date(),
  poolFactory = (connectionString) =>
    new Pool({ connectionString, max: 2 }),
  replayRegister = replayAccountDeletionRegister,
  verifyFiles = verifyProductionRecoveryPointFiles,
  write = (value) => process.stdout.write(value),
} = {}) {
  const command = parseAccountDeletionRecoveryArguments(arguments_);
  const recoveryLogger = stderrLogger(logger);

  if (command.action === "create-manifest") {
    const manifest = await createManifest({
      applicationImage: command.applicationImage,
      archiveFile: command.archiveFile,
      archivedAt: command.archivedAt,
      createdAt: now(),
      registerFile: command.registerFile,
    });
    write(serializeProductionRecoveryPointManifest(manifest));
    return manifest;
  }

  if (command.action === "verify-bundle") {
    const verified = await verifyFiles({
      archiveFile: command.archiveFile,
      manifestFile: command.manifestFile,
      now: now(),
      registerFile: command.registerFile,
    });
    const result = Object.freeze({
      archiveBytes: verified.manifest.database.bytes,
      archiveSha256: verified.manifest.database.sha256,
      createdAt: verified.manifest.createdAt,
      event: "account_deletion.recovery_point_verified",
      registerRecordCount:
        verified.manifest.accountDeletionRegister.recordCount,
      registerSha256: verified.manifest.accountDeletionRegister.sha256,
    });
    outputJson(write, result);
    return result;
  }

  if (!databaseUrl) {
    throw commandError(
      "RECOVERY_POINT_DATABASE_UNAVAILABLE",
      "DATABASE_URL is required for register export and replay.",
    );
  }
  const pool = poolFactory(databaseUrl);
  try {
    if (command.action === "export") {
      const artifact = await exportRegister(pool, {
        exportedAt: now(),
        logger: recoveryLogger,
      });
      write(serializeAccountDeletionRegisterExport(artifact));
      return artifact;
    }

    const verified = await verifyFiles({
      archiveFile: command.archiveFile,
      manifestFile: command.manifestFile,
      now: now(),
      registerFile: command.registerFile,
    });
    const result = await replayRegister(pool, verified.artifact, {
      expectedSha256:
        verified.manifest.accountDeletionRegister.sha256,
      logger: recoveryLogger,
      replayedAt: now(),
    });
    outputJson(write, {
      event: "account_deletion.recovery_point_replayed",
      ...result,
    });
    if (!result.ready) {
      throw commandError(
        "RECOVERY_POINT_NOT_READY",
        "The restored account-deletion register still has processing records.",
      );
    }
    return result;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runAccountDeletionRecoveryCommand();
  } catch (error) {
    const code =
      typeof error?.code === "string" && /^[A-Z][A-Z0-9_]+$/.test(error.code)
        ? error.code
        : "RECOVERY_POINT_COMMAND_FAILED";
    console.error(
      JSON.stringify({
        code,
        event: "account_deletion.recovery_point_failed",
      }),
    );
    process.exitCode = 1;
  }
}
