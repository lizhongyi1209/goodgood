import { readFileSync } from "node:fs";
import path from "node:path";

export const PRODUCTION_EVIDENCE_SCHEMA_VERSION = 1;

export const REQUIRED_PRODUCTION_CHECKS = Object.freeze([
  Object.freeze({ id: "artifact-security", maxAgeHours: 24 }),
  Object.freeze({ id: "production-preflight", maxAgeHours: 24 }),
  Object.freeze({ id: "secret-access-review", maxAgeHours: 720 }),
  Object.freeze({ id: "privacy-data-map", maxAgeHours: 720 }),
  Object.freeze({ id: "retention-deletion-policy", maxAgeHours: 720 }),
  Object.freeze({ id: "moderation-abuse-controls", maxAgeHours: 168 }),
  Object.freeze({ id: "production-backup-freshness", maxAgeHours: 1 }),
  Object.freeze({ id: "production-restore-drill", maxAgeHours: 168 }),
  Object.freeze({ id: "monitoring-handoff", maxAgeHours: 24 }),
  Object.freeze({ id: "incident-support-ownership", maxAgeHours: 720 }),
  Object.freeze({ id: "icp-production-domain", maxAgeHours: 8760 }),
  Object.freeze({ id: "alipay-merchant-sandbox", maxAgeHours: 720 }),
  Object.freeze({ id: "candidate-health-invariants", maxAgeHours: 1 }),
  Object.freeze({ id: "rollback-rehearsal", maxAgeHours: 168 }),
]);

const EVIDENCE_STATUSES = new Set(["blocked", "fail", "pass", "pending"]);
const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SAFE_OWNER = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const RELEASE_BOUND_CHECKS = new Set([
  "artifact-security",
  "production-preflight",
  "candidate-health-invariants",
  "rollback-rehearsal",
]);

function validNumberAtMost(value, maximum) {
  return Number.isFinite(value) && value >= 0 && value <= maximum;
}

function validateObjectiveEvidence(id, item) {
  if (id === "production-backup-freshness") {
    const points = item.recoveryPoints;
    if (
      !validNumberAtMost(item.observedRpoMinutes, 60) ||
      !points ||
      !Number.isInteger(points.daily) ||
      points.daily < 14 ||
      !Number.isInteger(points.weekly) ||
      points.weekly < 8 ||
      !Number.isInteger(points.monthly) ||
      points.monthly < 12
    ) {
      return "Backup evidence must prove RPO <= 60 minutes and 14 daily / 8 weekly / 12 monthly recovery points.";
    }
  }
  if (
    id === "production-restore-drill" &&
    !validNumberAtMost(item.observedRtoMinutes, 240)
  ) {
    return "Restore evidence must prove RTO <= 240 minutes.";
  }
  if (id === "monitoring-handoff") {
    if (
      !SAFE_OWNER.test(item.owner ?? "") ||
      !Number.isInteger(item.logRetentionDays) ||
      item.logRetentionDays < 30 ||
      !Number.isInteger(item.metricRetentionDays) ||
      item.metricRetentionDays < 90 ||
      item.syntheticRequestObserved !== true ||
      item.syntheticGenerationObserved !== true ||
      item.alertsOwnedWithRunbooks !== true ||
      item.firingAcknowledged !== true ||
      item.resolvedAcknowledged !== true
    ) {
      return "Monitoring handoff must prove ownership, retention, synthetic signals, runbooks, and acknowledged firing/resolved delivery.";
    }
  }
  if (id === "incident-support-ownership") {
    if (
      !SAFE_OWNER.test(item.primaryOwner ?? "") ||
      !SAFE_OWNER.test(item.secondaryOwner ?? "") ||
      item.primaryOwner === item.secondaryOwner ||
      !validNumberAtMost(item.severity1AckMinutes, 15) ||
      !validNumberAtMost(item.severity2AckBusinessMinutes, 240)
    ) {
      return "Incident evidence must name distinct primary/secondary owners and preserve the accepted acknowledgement objectives.";
    }
  }
  return null;
}

function gateCheck(id, status, detail, reference = undefined) {
  return Object.freeze({ detail, id, reference, status });
}

export function isSafeProductionEvidenceReference(value) {
  return SAFE_REFERENCE.test(value ?? "");
}

function safeRelease(document) {
  const release = document?.release;
  if (!release || typeof release !== "object" || Array.isArray(release)) {
    throw new Error("release must be an object.");
  }
  if (
    !/^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(
      release.image ?? "",
    )
  ) {
    throw new Error("release.image must pin the GoodGood GHCR image by sha256 digest.");
  }
  if (!/^[a-f0-9]{40}$/.test(release.revision ?? "")) {
    throw new Error("release.revision must be a full lowercase Git SHA.");
  }
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(release.migration ?? "")) {
    throw new Error("release.migration must be a versioned SQL filename.");
  }
  if (!/^[a-f0-9]{64}$/.test(release.runtimeConfigVersion ?? "")) {
    throw new Error("release.runtimeConfigVersion must be a sha256 checksum.");
  }
  return Object.freeze({
    image: release.image,
    migration: release.migration,
    revision: release.revision,
    runtimeConfigVersion: release.runtimeConfigVersion,
  });
}

function evidenceById(document) {
  if (!Array.isArray(document?.evidence)) {
    throw new Error("evidence must be an array.");
  }
  const result = new Map();
  for (const item of document.evidence) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Every evidence item must be an object.");
    }
    if (!REQUIRED_PRODUCTION_CHECKS.some(({ id }) => id === item.id)) {
      throw new Error(`Unknown production evidence id: ${item.id ?? "missing"}.`);
    }
    if (result.has(item.id)) {
      throw new Error(`Production evidence duplicates ${item.id}.`);
    }
    if (!EVIDENCE_STATUSES.has(item.status)) {
      throw new Error(`${item.id} has an unsupported status.`);
    }
    if (!isSafeProductionEvidenceReference(item.reference)) {
      throw new Error(`${item.id} requires a safe non-secret evidence reference.`);
    }
    result.set(item.id, item);
  }
  return result;
}

function evaluateEvidence(requirement, item, release, nowMs) {
  if (!item) {
    return gateCheck(
      requirement.id,
      "blocked",
      "Required production evidence is missing.",
    );
  }
  if (item.status !== "pass") {
    return gateCheck(
      requirement.id,
      item.status,
      "Required production evidence has not passed.",
      item.reference,
    );
  }
  if (
    RELEASE_BOUND_CHECKS.has(requirement.id) &&
    item.releaseRevision !== release?.revision
  ) {
    return gateCheck(
      requirement.id,
      "fail",
      "Passing evidence is not bound to the candidate Git revision.",
      item.reference,
    );
  }
  const objectiveFailure = validateObjectiveEvidence(requirement.id, item);
  if (objectiveFailure) {
    return gateCheck(
      requirement.id,
      "fail",
      objectiveFailure,
      item.reference,
    );
  }
  const checkedAt = Date.parse(item.checkedAt ?? "");
  if (!Number.isFinite(checkedAt) || checkedAt > nowMs + 5 * 60 * 1_000) {
    return gateCheck(
      requirement.id,
      "fail",
      "Passing evidence requires a valid non-future checkedAt timestamp.",
      item.reference,
    );
  }
  const ageHours = (nowMs - checkedAt) / (60 * 60 * 1_000);
  if (ageHours > requirement.maxAgeHours) {
    return gateCheck(
      requirement.id,
      "fail",
      `Passing evidence is stale; maximum age is ${requirement.maxAgeHours} hours.`,
      item.reference,
    );
  }
  return gateCheck(
    requirement.id,
    "pass",
    "Required production evidence is current.",
    item.reference,
  );
}

export function runProductionReadinessGate(
  document,
  { now = () => Date.now() } = {},
) {
  const checks = [];
  let release = null;
  if (document?.schemaVersion !== PRODUCTION_EVIDENCE_SCHEMA_VERSION) {
    checks.push(
      gateCheck(
        "schema",
        "fail",
        `schemaVersion must be ${PRODUCTION_EVIDENCE_SCHEMA_VERSION}.`,
      ),
    );
  } else {
    checks.push(gateCheck("schema", "pass", "Evidence schema is supported."));
  }

  try {
    release = safeRelease(document);
    checks.push(
      gateCheck(
        "release-identity",
        "pass",
        "Release identity uses an immutable image and complete CI metadata.",
      ),
    );
  } catch (error) {
    checks.push(
      gateCheck(
        "release-identity",
        "fail",
        error instanceof Error ? error.message : "Release identity is invalid.",
      ),
    );
  }

  let evidence = new Map();
  try {
    evidence = evidenceById(document);
  } catch (error) {
    checks.push(
      gateCheck(
        "evidence-contract",
        "fail",
        error instanceof Error ? error.message : "Evidence is invalid.",
      ),
    );
  }

  const nowMs = now();
  if (!Number.isFinite(nowMs)) throw new Error("now must return epoch milliseconds.");
  for (const requirement of REQUIRED_PRODUCTION_CHECKS) {
    checks.push(
      evaluateEvidence(requirement, evidence.get(requirement.id), release, nowMs),
    );
  }

  return Object.freeze({
    checks: Object.freeze(checks),
    ok: checks.every(({ status }) => status === "pass"),
    release,
    schemaVersion: PRODUCTION_EVIDENCE_SCHEMA_VERSION,
  });
}

export function readProductionEvidence(filePath) {
  const resolved = path.resolve(filePath);
  let document;
  try {
    document = JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    throw new Error("Production evidence must be a readable JSON file.");
  }
  return document;
}
