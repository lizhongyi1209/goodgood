import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertRootRecoveryFileMetadata,
  createProductionRecoveryPointManifest,
  parseProductionRecoveryPointManifest,
  PRODUCTION_RECOVERY_POINT_MAX_AGE_MS,
  serializeProductionRecoveryPointManifest,
  verifyProductionRecoveryPointFiles,
} from "../server/account-deletion/recovery-point-contract.mjs";
import {
  createAccountDeletionRegisterExport,
  serializeAccountDeletionRegisterExport,
} from "../server/account-deletion/register-export-contract.mjs";
import {
  parseAccountDeletionRecoveryArguments,
  runAccountDeletionRecoveryCommand,
} from "../server/runtime/account-deletion-recovery.mjs";

const ARCHIVED_AT = new Date("2026-09-07T12:00:00.000Z");
const EXPORTED_AT = new Date("2026-09-07T12:01:00.000Z");
const CREATED_AT = new Date("2026-09-07T12:02:00.000Z");
const CHECKED_AT = new Date("2026-09-07T12:30:00.000Z");
const IMAGE = `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`;
const STEM = "production-auto-20260907T120000Z";
const ARCHIVE_FILE = `/recovery/${STEM}.dump`;
const REGISTER_FILE = `/recovery/${STEM}.account-deletion-register.json`;
const MANIFEST_FILE = `/recovery/${STEM}.recovery-manifest.json`;
const ARCHIVE_SHA256 = "b".repeat(64);

function protectedMetadata(size) {
  return {
    gid: 0,
    isFile: () => true,
    isSymbolicLink: () => false,
    mode: 0o100600,
    size,
    uid: 0,
  };
}

function artifact() {
  return createAccountDeletionRegisterExport({
    exportedAt: EXPORTED_AT.toISOString(),
    records: [],
  });
}

function operations({
  archiveDigest = ARCHIVE_SHA256,
  manifest,
  register = artifact(),
} = {}) {
  const registerBytes = Buffer.from(
    serializeAccountDeletionRegisterExport(register),
  );
  const manifestBytes = Buffer.from(
    manifest ? serializeProductionRecoveryPointManifest(manifest) : "{}\n",
  );
  return {
    async digest(file) {
      assert.equal(file, ARCHIVE_FILE);
      return archiveDigest;
    },
    async lstat(file) {
      if (file === ARCHIVE_FILE) return protectedMetadata(42);
      if (file === REGISTER_FILE) return protectedMetadata(registerBytes.length);
      if (file === MANIFEST_FILE) return protectedMetadata(manifestBytes.length);
      assert.fail(`unexpected file ${file}`);
    },
    async readFile(file) {
      if (file === REGISTER_FILE) return registerBytes;
      if (file === MANIFEST_FILE) return manifestBytes;
      assert.fail(`unexpected read ${file}`);
    },
  };
}

async function recoveryManifest() {
  return createProductionRecoveryPointManifest({
    applicationImage: IMAGE,
    archiveFile: ARCHIVE_FILE,
    archivedAt: ARCHIVED_AT,
    createdAt: CREATED_AT,
    operations: operations(),
    registerFile: REGISTER_FILE,
  });
}

test("production recovery-point manifest binds one ordered three-file bundle", async () => {
  const manifest = await recoveryManifest();
  assert.equal(manifest.format, "goodgood.production-recovery-point");
  assert.equal(manifest.version, 1);
  assert.equal(manifest.applicationImage, IMAGE);
  assert.equal(manifest.database.fileName, `${STEM}.dump`);
  assert.equal(manifest.database.bytes, 42);
  assert.equal(manifest.database.sha256, ARCHIVE_SHA256);
  assert.equal(
    manifest.accountDeletionRegister.fileName,
    `${STEM}.account-deletion-register.json`,
  );
  assert.equal(manifest.accountDeletionRegister.sha256, artifact().sha256);
  assert.deepEqual(
    parseProductionRecoveryPointManifest(
      serializeProductionRecoveryPointManifest(manifest),
    ),
    manifest,
  );

  assert.throws(
    () =>
      parseProductionRecoveryPointManifest({
        ...manifest,
        unexpected: true,
      }),
    (error) => error.code === "RECOVERY_POINT_INVALID",
  );
  assert.throws(
    () =>
      parseProductionRecoveryPointManifest({
        ...manifest,
        applicationImage: "ghcr.io/lizhongyi1209/goodgood:latest",
      }),
    /immutable GoodGood image/,
  );
  assert.throws(
    () =>
      parseProductionRecoveryPointManifest({
        ...manifest,
        accountDeletionRegister: {
          ...manifest.accountDeletionRegister,
          exportedAt: "2026-09-07T11:59:00.000Z",
        },
      }),
    (error) => error.code === "RECOVERY_POINT_COMPONENT_ORDER_INVALID",
  );
});

test("recovery-point verification enforces permissions, trusted digests, and one-hour freshness", async () => {
  const manifest = await recoveryManifest();
  const verified = await verifyProductionRecoveryPointFiles({
    archiveFile: ARCHIVE_FILE,
    manifestFile: MANIFEST_FILE,
    now: CHECKED_AT,
    operations: operations({ manifest }),
    registerFile: REGISTER_FILE,
  });
  assert.equal(verified.artifact.sha256, artifact().sha256);
  assert.equal(verified.manifest.database.sha256, ARCHIVE_SHA256);

  await assert.rejects(
    verifyProductionRecoveryPointFiles({
      archiveFile: ARCHIVE_FILE,
      manifestFile: MANIFEST_FILE,
      now: CHECKED_AT,
      operations: operations({ archiveDigest: "c".repeat(64), manifest }),
      registerFile: REGISTER_FILE,
    }),
    (error) => error.code === "RECOVERY_POINT_DIGEST_MISMATCH",
  );
  await assert.rejects(
    verifyProductionRecoveryPointFiles({
      archiveFile: ARCHIVE_FILE,
      manifestFile: MANIFEST_FILE,
      now: new Date(
        CREATED_AT.getTime() + PRODUCTION_RECOVERY_POINT_MAX_AGE_MS + 1,
      ),
      operations: operations({ manifest }),
      registerFile: REGISTER_FILE,
    }),
    (error) => error.code === "RECOVERY_POINT_STALE",
  );
  assert.throws(
    () =>
      assertRootRecoveryFileMetadata(
        { ...protectedMetadata(1), mode: 0o100640 },
        "unsafe",
      ),
    (error) => error.code === "RECOVERY_POINT_PERMISSION_INVALID",
  );
  assert.throws(
    () =>
      assertRootRecoveryFileMetadata(
        { ...protectedMetadata(1), isSymbolicLink: () => true },
        "unsafe",
      ),
    (error) => error.code === "RECOVERY_POINT_PERMISSION_INVALID",
  );
});

test("recovery runtime parses only the reviewed commands and keeps artifacts on stdout", async () => {
  assert.deepEqual(parseAccountDeletionRecoveryArguments(["export"]), {
    action: "export",
  });
  assert.deepEqual(
    parseAccountDeletionRecoveryArguments([
      "replay",
      "--archive-file",
      ARCHIVE_FILE,
      "--register-file",
      REGISTER_FILE,
      "--manifest-file",
      MANIFEST_FILE,
    ]),
    {
      action: "replay",
      archiveFile: ARCHIVE_FILE,
      manifestFile: MANIFEST_FILE,
      registerFile: REGISTER_FILE,
    },
  );
  assert.throws(
    () => parseAccountDeletionRecoveryArguments(["replay", "--execute"]),
    (error) => error.code === "RECOVERY_POINT_ARGUMENT_INVALID",
  );

  let ended = 0;
  const output = [];
  const exported = await runAccountDeletionRecoveryCommand({
    arguments_: ["export"],
    databaseUrl: "postgresql://unused.invalid/goodgood",
    exportRegister: async (_pool, input) => {
      assert.equal(input.exportedAt, EXPORTED_AT);
      return artifact();
    },
    logger: { error() {} },
    now: () => EXPORTED_AT,
    poolFactory: () => ({ async end() { ended += 1; } }),
    write: (value) => output.push(value),
  });
  assert.equal(exported.sha256, artifact().sha256);
  assert.equal(ended, 1);
  assert.equal(JSON.parse(output[0]).sha256, artifact().sha256);
});

test("recovery runtime passes the trusted manifest digest and blocks processing tombstones", async () => {
  const manifest = await recoveryManifest();
  const base = {
    arguments_: [
      "replay",
      "--archive-file",
      ARCHIVE_FILE,
      "--register-file",
      REGISTER_FILE,
      "--manifest-file",
      MANIFEST_FILE,
    ],
    databaseUrl: "postgresql://unused.invalid/goodgood",
    logger: { error() {} },
    now: () => CHECKED_AT,
    poolFactory: () => ({ async end() {} }),
    verifyFiles: async () => ({ artifact: artifact(), manifest }),
    write() {},
  };
  const result = await runAccountDeletionRecoveryCommand({
    ...base,
    replayRegister: async (_pool, _artifact, input) => {
      assert.equal(
        input.expectedSha256,
        manifest.accountDeletionRegister.sha256,
      );
      return {
        artifactSha256: artifact().sha256,
        ready: true,
        recordCount: 0,
      };
    },
  });
  assert.equal(result.ready, true);

  await assert.rejects(
    runAccountDeletionRecoveryCommand({
      ...base,
      replayRegister: async () => ({
        artifactSha256: artifact().sha256,
        processingBlocked: 1,
        ready: false,
        recordCount: 1,
      }),
    }),
    (error) => error.code === "RECOVERY_POINT_NOT_READY",
  );
});

test("production backup scripts package and replay only a fresh encrypted three-file recovery point", async () => {
  const [automation, backupTool, buildRuntime, releaseMetadata] =
    await Promise.all([
      readFile(
        new URL(
          "../infra/production/postgres-backup-automated.sh",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../infra/production/postgres-backup-restore.sh",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../scripts/build-runtime.mjs", import.meta.url), "utf8"),
      readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    ]);

  assert.match(automation, /recovery_point_files=3/);
  assert.match(automation, /--tag deletion-register/);
  assert.match(automation, /--tag recovery-point/);
  assert.match(automation, /older than the one-hour RPO/);
  assert.match(automation, /must contain exactly three files/);
  assert.match(automation, /\^\/var\/backups\/goodgood-production\/production-auto/);
  assert.match(automation, /archive_owned="true"/);
  assert.match(automation, /restore-drill[\s\\]*"\$\{archive_path\}"[\s\\]*"\$\{register_path\}"[\s\\]*"\$\{manifest_path\}"/);

  assert.match(backupTool, /account-deletion-recovery\.mjs/);
  assert.match(backupTool, /readonly release_env_file="\/etc\/goodgood\/production\/release\.env"/);
  assert.match(backupTool, /GOODGOOD_RELEASE_IMAGE=/);
  assert.match(backupTool, /differs from the configured release image/);
  assert.match(backupTool, /backup_in_progress="true"/);
  assert.match(backupTool, /create-manifest/);
  assert.match(backupTool, /verify-bundle/);
  assert.match(backupTool, /--network "container:\$\{restore_container\}"/);
  assert.match(backupTool, /--pull never/);
  assert.match(backupTool, /root:root mode 0600/);
  assert.match(backupTool, /RECOVERY_POINT|recovery_ready=true/i);
  assert.doesNotMatch(backupTool, /docker pull|--publish|-p [0-9]/);
  assert.match(buildRuntime, /"account-deletion-recovery"/);
  assert.match(
    releaseMetadata,
    /"server\/account-deletion\/recovery-point-contract\.mjs"/,
  );
  assert.match(
    releaseMetadata,
    /"server\/runtime\/account-deletion-recovery\.mjs"/,
  );
});
