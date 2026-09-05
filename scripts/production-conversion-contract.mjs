import { readFileSync } from "node:fs";
import path from "node:path";
import { PRODUCTION_INFRASTRUCTURE_PROFILE_ID } from "./production-infrastructure-profile.mjs";
import { isSafeProductionEvidenceReference } from "./production-readiness-contract.mjs";

export const PRODUCTION_CONVERSION_SCHEMA_VERSION = 1;

export const PRODUCTION_CONVERSION_STEPS = Object.freeze([
  Object.freeze({
    id: "enter-public-maintenance",
    mutation: "production-ingress",
    purpose:
      "Serve only the static maintenance surface before staging writes freeze; normal application, login, and generation traffic remain unavailable.",
  }),
  Object.freeze({
    id: "freeze-and-record-staging",
    mutation: "staging-write-boundary",
    purpose:
      "Freeze writes and record the exact release identity, row counts, queue state, and complete R2 object inventory.",
  }),
  Object.freeze({
    id: "archive-and-restore-verify-staging",
    mutation: "off-host-backup-repository",
    purpose:
      "Create the final encrypted staging archive, prove an isolated restore, and retain it for seven days after a successful conversion.",
  }),
  Object.freeze({
    id: "create-fresh-production-state",
    mutation: "named-postgresql-and-valkey-targets",
    purpose:
      "Create fresh production PostgreSQL and Valkey state, run reviewed migrations, and import no staging business or session data.",
  }),
  Object.freeze({
    id: "clear-and-rotate-r2",
    mutation: "exact-inventoried-r2-objects-and-scoped-credentials",
    purpose:
      "After separate exact-target approval, delete only inventoried test objects, verify the existing goodgood bucket is empty, and rotate its scoped credentials.",
  }),
  Object.freeze({
    id: "rotate-production-boundaries",
    mutation: "authing-provider-storage-backup-database-session-and-operator-secrets",
    purpose:
      "Rotate production secrets and retain only the exact goodgood.o1key.com Authing login and logout URLs without deleting identity-directory records.",
  }),
  Object.freeze({
    id: "bootstrap-and-verify-production",
    mutation: "fresh-production-state",
    purpose:
      "Bootstrap the audited site owner and prove pending isolation, credit, upload, generation, private read, backup/restore, health, and rollback checks.",
  }),
  Object.freeze({
    id: "open-or-stop-in-maintenance",
    mutation: "conditional-production-ingress",
    purpose:
      "Open production only after every gate passes within four hours; otherwise stop with maintenance active and keep old staging private for diagnosis.",
  }),
]);

const EXPECTED = Object.freeze({
  loginCallback: "https://goodgood.o1key.com/api/auth/callback",
  logoutUrl: "https://goodgood.o1key.com/",
  maintenanceAsset: "infra/production/maintenance/index.html",
  r2Bucket: "goodgood",
  sourcePostgresqlVolume: "goodgood-staging-postgres-data",
  sourceValkeyVolume: "goodgood-staging-valkey-data",
  targetPostgresqlVolume: "goodgood-production-postgres-data",
  targetValkeyVolume: "goodgood-production-valkey-data",
});

const REQUIRED_APPROVALS = Object.freeze([
  "liveConversion",
  "postgresqlTargetReset",
  "valkeyTargetReset",
  "r2ExactObjectDeletion",
  "credentialRotation",
  "publicTrafficOpen",
]);

const REQUIRED_EVIDENCE = Object.freeze([
  "stagingInventory",
  "finalArchiveRestore",
  "r2DeletionPreview",
  "r2EmptyVerification",
  "authingRotation",
  "productionSecretRotation",
  "siteOwnerBootstrap",
  "pendingIsolation",
  "productionBackupRestore",
  "realGenerationAndPrivateRead",
  "candidateHealth",
  "rollbackRehearsal",
  "monitoringHandoff",
]);

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value;
}

function string(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function exact(value, expected, name) {
  if (string(value, name) !== expected) {
    throw new Error(`${name} must be ${expected}.`);
  }
}

function rejectSecretFields(value, trail = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSecretFields(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (/password|private.?key|client.?secret|api.?key|access.?key|secret.?access|token/i.test(key)) {
      throw new Error(`${trail}.${key} must not contain secret material.`);
    }
    rejectSecretFields(item, `${trail}.${key}`);
  }
}

function referenceResolved(value) {
  return isSafeProductionEvidenceReference(value) && !value.startsWith("pending:");
}

function candidateBlockers(candidate) {
  const blockers = [];
  if (!/^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(candidate.image)) {
    blockers.push("candidate.image must be an immutable GHCR digest");
  }
  if (!/^[a-f0-9]{40}$/.test(candidate.revision)) {
    blockers.push("candidate.revision must be a 40-character Git SHA");
  }
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(candidate.migration)) {
    blockers.push("candidate.migration must name the exact migration file");
  }
  if (!/^[a-f0-9]{64}$/.test(candidate.runtimeConfigVersion)) {
    blockers.push("candidate.runtimeConfigVersion must be the CI configuration checksum");
  }
  return blockers;
}

export function validateProductionConversionManifest(manifest) {
  rejectSecretFields(manifest);
  object(manifest, "manifest");
  if (manifest.schemaVersion !== PRODUCTION_CONVERSION_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${PRODUCTION_CONVERSION_SCHEMA_VERSION}.`);
  }
  const candidate = object(manifest.candidate, "candidate");
  for (const field of ["image", "revision", "migration", "runtimeConfigVersion"]) {
    string(candidate[field], `candidate.${field}`);
  }
  const maintenance = object(manifest.maintenance, "maintenance");
  exact(maintenance.publicAsset, EXPECTED.maintenanceAsset, "maintenance.publicAsset");
  if (maintenance.maximumWindowMinutes !== 240) {
    throw new Error("maintenance.maximumWindowMinutes must be 240.");
  }
  const source = object(manifest.source, "source");
  exact(source.postgresqlVolume, EXPECTED.sourcePostgresqlVolume, "source.postgresqlVolume");
  exact(source.valkeyVolume, EXPECTED.sourceValkeyVolume, "source.valkeyVolume");
  exact(source.r2Bucket, EXPECTED.r2Bucket, "source.r2Bucket");
  const target = object(manifest.target, "target");
  exact(target.postgresqlVolume, EXPECTED.targetPostgresqlVolume, "target.postgresqlVolume");
  exact(target.valkeyVolume, EXPECTED.targetValkeyVolume, "target.valkeyVolume");
  exact(target.r2Bucket, EXPECTED.r2Bucket, "target.r2Bucket");
  exact(target.loginCallback, EXPECTED.loginCallback, "target.loginCallback");
  exact(target.logoutUrl, EXPECTED.logoutUrl, "target.logoutUrl");

  const approvals = object(manifest.approvals, "approvals");
  for (const approval of REQUIRED_APPROVALS) {
    if (typeof approvals[approval] !== "boolean") {
      throw new Error(`approvals.${approval} must be boolean.`);
    }
  }
  const evidence = object(manifest.evidence, "evidence");
  for (const item of REQUIRED_EVIDENCE) {
    const reference = string(evidence[item], `evidence.${item}`);
    if (!isSafeProductionEvidenceReference(reference)) {
      throw new Error(`evidence.${item} must be a safe non-secret reference.`);
    }
  }
  return manifest;
}

export function planProductionConversion(manifest, { now = () => Date.now() } = {}) {
  validateProductionConversionManifest(manifest);
  const nowMs = now();
  if (!Number.isFinite(nowMs)) throw new Error("now must return epoch milliseconds.");

  const blockers = candidateBlockers(manifest.candidate);
  for (const approval of REQUIRED_APPROVALS) {
    if (!manifest.approvals[approval]) blockers.push(`approvals.${approval} is pending`);
  }
  for (const item of REQUIRED_EVIDENCE) {
    if (!referenceResolved(manifest.evidence[item])) {
      blockers.push(`evidence.${item} is pending`);
    }
  }

  return Object.freeze({
    action: "production-conversion-dry-run",
    blockers: Object.freeze(blockers),
    checkedAt: new Date(nowMs).toISOString(),
    executed: false,
    executionAvailable: false,
    failurePolicy: "stop-and-keep-public-maintenance-active",
    infrastructureProfile: PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
    maintenance: Object.freeze({
      maximumWindowMinutes: 240,
      normalApplicationAvailable: false,
      loginAvailable: false,
      generationAvailable: false,
      publicAsset: EXPECTED.maintenanceAsset,
    }),
    readyForSeparateLiveActionReview: blockers.length === 0,
    schemaVersion: PRODUCTION_CONVERSION_SCHEMA_VERSION,
    steps: PRODUCTION_CONVERSION_STEPS,
    targets: Object.freeze({
      source: Object.freeze({ ...manifest.source }),
      target: Object.freeze({ ...manifest.target }),
    }),
  });
}

export function readProductionConversionManifest(manifestFile) {
  return JSON.parse(readFileSync(manifestFile, "utf8"));
}

export function parseProductionConversionArguments(argumentsList) {
  if (
    argumentsList.length !== 3 ||
    argumentsList[0] !== "plan" ||
    argumentsList[1] !== "--manifest-file" ||
    !argumentsList[2] ||
    argumentsList[2].startsWith("--")
  ) {
    throw new Error(
      "Usage: production:conversion-plan -- plan --manifest-file <path>",
    );
  }
  return Object.freeze({
    action: "plan",
    manifestFile: path.resolve(argumentsList[2]),
  });
}
