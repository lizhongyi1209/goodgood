import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { parseAccountDeletionRegisterExport } from "./register-export-contract.mjs";

export const PRODUCTION_RECOVERY_POINT_FORMAT =
  "goodgood.production-recovery-point";
export const PRODUCTION_RECOVERY_POINT_VERSION = 1;
export const PRODUCTION_RECOVERY_POINT_MAX_AGE_MS = 60 * 60 * 1000;
export const PRODUCTION_RECOVERY_POINT_MAX_COMPONENT_LAG_MS = 15 * 60 * 1000;

const MANIFEST_MAX_BYTES = 64 * 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IMAGE_PATTERN =
  /^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[0-9a-f]{64}$/;
const ARCHIVE_PATTERN = /^(production-auto-[0-9]{8}T[0-9]{6}Z)\.dump$/;
const MANIFEST_FIELDS = Object.freeze([
  "accountDeletionRegister",
  "applicationImage",
  "createdAt",
  "database",
  "format",
  "version",
]);
const DATABASE_FIELDS = Object.freeze([
  "archivedAt",
  "bytes",
  "fileName",
  "sha256",
]);
const REGISTER_FIELDS = Object.freeze([
  "exportedAt",
  "fileName",
  "recordCount",
  "sha256",
]);

export class ProductionRecoveryPointError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProductionRecoveryPointError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProductionRecoveryPointError(code, message);
}

function exactFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("RECOVERY_POINT_INVALID", `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    fail("RECOVERY_POINT_INVALID", `${label} contains unexpected fields.`);
  }
  return value;
}

function instant(value, label) {
  if (typeof value !== "string") {
    fail("RECOVERY_POINT_INVALID", `${label} must be an ISO timestamp.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("RECOVERY_POINT_INVALID", `${label} must be an ISO timestamp.`);
  }
  return value;
}

function sha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail("RECOVERY_POINT_INVALID", `${label} must be a SHA-256 digest.`);
  }
  return value;
}

function safeCount(value, label, { positive = false } = {}) {
  if (
    !Number.isSafeInteger(value) ||
    value < (positive ? 1 : 0)
  ) {
    fail("RECOVERY_POINT_INVALID", `${label} is outside its accepted range.`);
  }
  return value;
}

function normalizeManifest(value) {
  exactFields(value, MANIFEST_FIELDS, "recovery-point manifest");
  exactFields(value.database, DATABASE_FIELDS, "database evidence");
  exactFields(
    value.accountDeletionRegister,
    REGISTER_FIELDS,
    "account-deletion register evidence",
  );
  if (
    value.format !== PRODUCTION_RECOVERY_POINT_FORMAT ||
    value.version !== PRODUCTION_RECOVERY_POINT_VERSION
  ) {
    fail("RECOVERY_POINT_INVALID", "The recovery-point header is invalid.");
  }
  if (
    typeof value.applicationImage !== "string" ||
    !IMAGE_PATTERN.test(value.applicationImage)
  ) {
    fail(
      "RECOVERY_POINT_INVALID",
      "The recovery-point application image is not an immutable GoodGood image.",
    );
  }

  const archiveMatch =
    typeof value.database.fileName === "string"
      ? ARCHIVE_PATTERN.exec(value.database.fileName)
      : null;
  if (!archiveMatch) {
    fail("RECOVERY_POINT_INVALID", "The database archive filename is invalid.");
  }
  const stem = archiveMatch[1];
  if (
    value.accountDeletionRegister.fileName !==
    `${stem}.account-deletion-register.json`
  ) {
    fail(
      "RECOVERY_POINT_INVALID",
      "The register artifact does not belong to the database archive.",
    );
  }

  const normalized = Object.freeze({
    accountDeletionRegister: Object.freeze({
      exportedAt: instant(
        value.accountDeletionRegister.exportedAt,
        "accountDeletionRegister.exportedAt",
      ),
      fileName: value.accountDeletionRegister.fileName,
      recordCount: safeCount(
        value.accountDeletionRegister.recordCount,
        "accountDeletionRegister.recordCount",
      ),
      sha256: sha256(
        value.accountDeletionRegister.sha256,
        "accountDeletionRegister.sha256",
      ),
    }),
    applicationImage: value.applicationImage,
    createdAt: instant(value.createdAt, "createdAt"),
    database: Object.freeze({
      archivedAt: instant(value.database.archivedAt, "database.archivedAt"),
      bytes: safeCount(value.database.bytes, "database.bytes", {
        positive: true,
      }),
      fileName: value.database.fileName,
      sha256: sha256(value.database.sha256, "database.sha256"),
    }),
    format: PRODUCTION_RECOVERY_POINT_FORMAT,
    version: PRODUCTION_RECOVERY_POINT_VERSION,
  });

  const archivedAt = new Date(normalized.database.archivedAt).getTime();
  const exportedAt = new Date(
    normalized.accountDeletionRegister.exportedAt,
  ).getTime();
  const createdAt = new Date(normalized.createdAt).getTime();
  if (
    archivedAt > exportedAt ||
    exportedAt > createdAt ||
    exportedAt - archivedAt > PRODUCTION_RECOVERY_POINT_MAX_COMPONENT_LAG_MS
  ) {
    fail(
      "RECOVERY_POINT_COMPONENT_ORDER_INVALID",
      "The recovery-point components are stale or out of order.",
    );
  }
  return normalized;
}

export function parseProductionRecoveryPointManifest(input) {
  let value = input;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    if (value.byteLength > MANIFEST_MAX_BYTES) {
      fail("RECOVERY_POINT_INVALID", "The recovery-point manifest is too large.");
    }
    value = Buffer.from(value).toString("utf8");
  }
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > MANIFEST_MAX_BYTES) {
      fail("RECOVERY_POINT_INVALID", "The recovery-point manifest is too large.");
    }
    try {
      value = JSON.parse(value);
    } catch {
      fail("RECOVERY_POINT_INVALID", "The recovery-point manifest is not JSON.");
    }
  }
  return normalizeManifest(value);
}

export function serializeProductionRecoveryPointManifest(input) {
  return `${JSON.stringify(parseProductionRecoveryPointManifest(input))}\n`;
}

export function assertRootRecoveryFileMetadata(metadata, label) {
  if (
    !metadata ||
    typeof metadata.isFile !== "function" ||
    typeof metadata.isSymbolicLink !== "function" ||
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== 0 ||
    metadata.gid !== 0 ||
    (metadata.mode & 0o777) !== 0o600
  ) {
    fail(
      "RECOVERY_POINT_PERMISSION_INVALID",
      `${label} must be a root:root mode 0600 regular file.`,
    );
  }
}

async function fileSha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

const DEFAULT_FILE_OPERATIONS = Object.freeze({
  digest: fileSha256,
  lstat,
  readFile,
});

function fileOperations(operations) {
  if (
    !operations ||
    typeof operations.digest !== "function" ||
    typeof operations.lstat !== "function" ||
    typeof operations.readFile !== "function"
  ) {
    fail("RECOVERY_POINT_INVALID", "Recovery-point file operations are invalid.");
  }
  return operations;
}

async function readProtectedFile(filePath, label, operations) {
  const metadata = await operations.lstat(filePath);
  assertRootRecoveryFileMetadata(metadata, label);
  return { bytes: metadata.size, contents: await operations.readFile(filePath) };
}

export async function createProductionRecoveryPointManifest({
  applicationImage,
  archiveFile,
  archivedAt,
  createdAt = new Date(),
  operations = DEFAULT_FILE_OPERATIONS,
  registerFile,
}) {
  const files = fileOperations(operations);
  const archiveMetadata = await files.lstat(archiveFile);
  assertRootRecoveryFileMetadata(archiveMetadata, "The database archive");
  const register = await readProtectedFile(
    registerFile,
    "The account-deletion register artifact",
    files,
  );
  const artifact = parseAccountDeletionRegisterExport(register.contents);
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const archived = archivedAt instanceof Date ? archivedAt : new Date(archivedAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(archived.getTime())) {
    fail("RECOVERY_POINT_INVALID", "Recovery-point timestamps are invalid.");
  }
  return normalizeManifest({
    accountDeletionRegister: {
      exportedAt: artifact.exportedAt,
      fileName: path.basename(registerFile),
      recordCount: artifact.recordCount,
      sha256: artifact.sha256,
    },
    applicationImage,
    createdAt: created.toISOString(),
    database: {
      archivedAt: archived.toISOString(),
      bytes: archiveMetadata.size,
      fileName: path.basename(archiveFile),
      sha256: await files.digest(archiveFile),
    },
    format: PRODUCTION_RECOVERY_POINT_FORMAT,
    version: PRODUCTION_RECOVERY_POINT_VERSION,
  });
}

export async function verifyProductionRecoveryPointFiles({
  archiveFile,
  manifestFile,
  maxAgeMs = PRODUCTION_RECOVERY_POINT_MAX_AGE_MS,
  now = new Date(),
  operations = DEFAULT_FILE_OPERATIONS,
  registerFile,
}) {
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) {
    fail("RECOVERY_POINT_INVALID", "The recovery-point age bound is invalid.");
  }
  const checkedAt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(checkedAt.getTime())) {
    fail("RECOVERY_POINT_INVALID", "The recovery-point check time is invalid.");
  }
  const files = fileOperations(operations);
  const [archiveMetadata, register, manifestInput] = await Promise.all([
    files.lstat(archiveFile),
    readProtectedFile(
      registerFile,
      "The account-deletion register artifact",
      files,
    ),
    readProtectedFile(manifestFile, "The recovery-point manifest", files),
  ]);
  assertRootRecoveryFileMetadata(archiveMetadata, "The database archive");
  const archiveDigest = await files.digest(archiveFile);
  const manifest = parseProductionRecoveryPointManifest(manifestInput.contents);
  const artifact = parseAccountDeletionRegisterExport(register.contents);
  if (
    path.basename(archiveFile) !== manifest.database.fileName ||
    path.basename(registerFile) !==
      manifest.accountDeletionRegister.fileName ||
    archiveMetadata.size !== manifest.database.bytes ||
    archiveDigest !== manifest.database.sha256 ||
    artifact.exportedAt !== manifest.accountDeletionRegister.exportedAt ||
    artifact.recordCount !== manifest.accountDeletionRegister.recordCount ||
    artifact.sha256 !== manifest.accountDeletionRegister.sha256
  ) {
    fail(
      "RECOVERY_POINT_DIGEST_MISMATCH",
      "The recovery-point files do not match their trusted manifest.",
    );
  }
  const age = checkedAt.getTime() - new Date(manifest.createdAt).getTime();
  if (age < 0 || age > maxAgeMs) {
    fail("RECOVERY_POINT_STALE", "The production recovery point is not fresh.");
  }
  return Object.freeze({ artifact, manifest });
}
