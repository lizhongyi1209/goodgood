import { createHash } from "node:crypto";

export const ACCOUNT_DELETION_REGISTER_EXPORT_FORMAT =
  "goodgood.account-deletion-register";
export const ACCOUNT_DELETION_REGISTER_EXPORT_VERSION = 1;

const MAX_EXPORT_BYTES = 16 * 1024 * 1024;
const MAX_RECORDS = 100_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const TOP_LEVEL_FIELDS = Object.freeze([
  "exportedAt",
  "format",
  "recordCount",
  "records",
  "sha256",
  "version",
]);
const RECORD_FIELDS = Object.freeze([
  "auditRetentionUntil",
  "completedAt",
  "createdAt",
  "deadlineAt",
  "requestId",
  "state",
  "targetOwnerId",
  "updatedAt",
]);

export class AccountDeletionRegisterExportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountDeletionRegisterExportError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AccountDeletionRegisterExportError(code, message);
}

function exactFields(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("REGISTER_EXPORT_INVALID", `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index])
  ) {
    fail("REGISTER_EXPORT_INVALID", `${label} contains unexpected fields.`);
  }
  return value;
}

function uuid(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    fail("REGISTER_EXPORT_INVALID", `${label} must be a canonical UUID.`);
  }
  return value;
}

function instant(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "string") {
    fail("REGISTER_EXPORT_INVALID", `${label} must be an ISO timestamp.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("REGISTER_EXPORT_INVALID", `${label} must be an ISO timestamp.`);
  }
  return value;
}

function normalizeRecord(value) {
  exactFields(value, RECORD_FIELDS, "register record");
  const record = {
    auditRetentionUntil: instant(
      value.auditRetentionUntil,
      "auditRetentionUntil",
      { nullable: true },
    ),
    completedAt: instant(value.completedAt, "completedAt", { nullable: true }),
    createdAt: instant(value.createdAt, "createdAt"),
    deadlineAt: instant(value.deadlineAt, "deadlineAt"),
    requestId: uuid(value.requestId, "requestId"),
    state: value.state,
    targetOwnerId: uuid(value.targetOwnerId, "targetOwnerId"),
    updatedAt: instant(value.updatedAt, "updatedAt"),
  };
  if (record.state !== "processing" && record.state !== "completed") {
    fail("REGISTER_EXPORT_INVALID", "state is unsupported.");
  }
  if (new Date(record.deadlineAt) <= new Date(record.createdAt)) {
    fail("REGISTER_EXPORT_INVALID", "deadlineAt must follow createdAt.");
  }
  if (new Date(record.updatedAt) < new Date(record.createdAt)) {
    fail("REGISTER_EXPORT_INVALID", "updatedAt must not precede createdAt.");
  }
  if (record.state === "processing") {
    if (record.completedAt !== null || record.auditRetentionUntil !== null) {
      fail(
        "REGISTER_EXPORT_INVALID",
        "A processing record cannot contain completion timestamps.",
      );
    }
  } else if (
    record.completedAt === null ||
    record.auditRetentionUntil === null ||
    new Date(record.completedAt) < new Date(record.createdAt) ||
    new Date(record.updatedAt) < new Date(record.completedAt) ||
    new Date(record.auditRetentionUntil) <= new Date(record.completedAt)
  ) {
    fail(
      "REGISTER_EXPORT_INVALID",
      "A completed record requires ordered completion and retention timestamps.",
    );
  }
  return Object.freeze(record);
}

function canonicalPayload({ exportedAt, records }) {
  return JSON.stringify({
    exportedAt,
    format: ACCOUNT_DELETION_REGISTER_EXPORT_FORMAT,
    recordCount: records.length,
    records,
    version: ACCOUNT_DELETION_REGISTER_EXPORT_VERSION,
  });
}

function digest(payload) {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function normalizedArtifact({ exportedAt, records }) {
  const normalizedExportedAt = instant(exportedAt, "exportedAt");
  if (!Array.isArray(records) || records.length > MAX_RECORDS) {
    fail(
      "REGISTER_EXPORT_INVALID",
      `records must contain at most ${MAX_RECORDS} entries.`,
    );
  }
  const normalizedRecords = records
    .map(normalizeRecord)
    .sort((left, right) => left.requestId.localeCompare(right.requestId));
  const requestIds = new Set();
  const ownerIds = new Set();
  for (const record of normalizedRecords) {
    if (requestIds.has(record.requestId) || ownerIds.has(record.targetOwnerId)) {
      fail(
        "REGISTER_EXPORT_INVALID",
        "Register request and target-owner identities must be unique.",
      );
    }
    if (new Date(record.createdAt) > new Date(normalizedExportedAt)) {
      fail("REGISTER_EXPORT_INVALID", "A register record cannot postdate its export.");
    }
    if (
      new Date(record.updatedAt) > new Date(normalizedExportedAt) ||
      (record.completedAt !== null &&
        new Date(record.completedAt) > new Date(normalizedExportedAt))
    ) {
      fail(
        "REGISTER_EXPORT_INVALID",
        "Register activity cannot postdate its export.",
      );
    }
    requestIds.add(record.requestId);
    ownerIds.add(record.targetOwnerId);
  }
  const payload = canonicalPayload({
    exportedAt: normalizedExportedAt,
    records: normalizedRecords,
  });
  return Object.freeze({
    ...JSON.parse(payload),
    records: Object.freeze(normalizedRecords),
    sha256: digest(payload),
  });
}

export function createAccountDeletionRegisterExport(input) {
  return normalizedArtifact(input ?? {});
}

export function serializeAccountDeletionRegisterExport(input) {
  const artifact = parseAccountDeletionRegisterExport(input);
  return `${JSON.stringify(artifact)}\n`;
}

export function parseAccountDeletionRegisterExport(input) {
  let value = input;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    if (value.byteLength > MAX_EXPORT_BYTES) {
      fail("REGISTER_EXPORT_INVALID", "The register export is too large.");
    }
    value = Buffer.from(value).toString("utf8");
  }
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > MAX_EXPORT_BYTES) {
      fail("REGISTER_EXPORT_INVALID", "The register export is too large.");
    }
    try {
      value = JSON.parse(value);
    } catch {
      fail("REGISTER_EXPORT_INVALID", "The register export is not valid JSON.");
    }
  }
  exactFields(value, TOP_LEVEL_FIELDS, "register export");
  if (
    value.format !== ACCOUNT_DELETION_REGISTER_EXPORT_FORMAT ||
    value.version !== ACCOUNT_DELETION_REGISTER_EXPORT_VERSION ||
    !Number.isSafeInteger(value.recordCount) ||
    value.recordCount < 0 ||
    value.recordCount !== value.records?.length ||
    typeof value.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.sha256)
  ) {
    fail("REGISTER_EXPORT_INVALID", "The register export header is invalid.");
  }
  const normalized = normalizedArtifact({
    exportedAt: value.exportedAt,
    records: value.records,
  });
  if (normalized.sha256 !== value.sha256) {
    fail("REGISTER_EXPORT_DIGEST_MISMATCH", "The register export digest differs.");
  }
  return normalized;
}
