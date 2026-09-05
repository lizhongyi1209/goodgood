import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  PAID_ONLY_PRODUCTION_CHECK_IDS,
  REQUIRED_PRODUCTION_CHECKS,
  REQUIRED_SEED_PRODUCTION_CHECKS,
  runProductionReadinessGate,
  runSeedProductionReadinessGate,
} from "../scripts/production-readiness-contract.mjs";
import { parseProductionReadinessArguments } from "../scripts/verify-production-readiness.mjs";
import { parseSeedProductionReadinessArguments } from "../scripts/verify-seed-production-readiness.mjs";
import { PRODUCTION_RUNTIME_ADAPTER_ID } from "../scripts/production-runtime-adapter.mjs";

const NOW = Date.parse("2026-09-04T14:00:00.000Z");
const REVISION = "b".repeat(40);
const RELEASE_BOUND_IDS = new Set([
  "artifact-security",
  "production-preflight",
  "candidate-health-invariants",
  "rollback-rehearsal",
]);

function validEvidenceDocument() {
  return {
    schemaVersion: 2,
    release: {
      image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
      migration: "0010_m6_payment_sandbox.sql",
      revision: REVISION,
      runtimeConfigVersion: "c".repeat(64),
    },
    evidence: REQUIRED_PRODUCTION_CHECKS.map(({ id }) => {
      const item = {
        checkedAt: new Date(NOW - 30 * 60 * 1_000).toISOString(),
        id,
        reference: `evidence:${id}`,
        ...(RELEASE_BOUND_IDS.has(id)
          ? { releaseRevision: REVISION }
          : {}),
        status: "pass",
      };
      if (id === "production-backup-freshness") {
        Object.assign(item, {
          observedRpoMinutes: 55,
          recoveryPoints: { daily: 14, monthly: 12, weekly: 8 },
        });
      }
      if (id === "production-restore-drill") {
        item.observedRtoMinutes = 210;
      }
      if (id === "monitoring-handoff") {
        Object.assign(item, {
          alertsOwnedWithRunbooks: true,
          firingAcknowledged: true,
          logRetentionDays: 30,
          metricRetentionDays: 90,
          owner: "team:operations",
          resolvedAcknowledged: true,
          syntheticGenerationObserved: true,
          syntheticRequestObserved: true,
        });
      }
      if (id === "incident-support-ownership") {
        Object.assign(item, {
          primaryOwner: "operator:primary",
          secondaryOwner: "operator:secondary",
          severity1AckMinutes: 15,
          severity2AckBusinessMinutes: 240,
        });
      }
      if (id === "candidate-health-invariants") {
        Object.assign(item, {
          creditInvariantPassed: true,
          databaseInvariantPassed: true,
          isolatedCandidatePassed: true,
          liveReadyPassed: true,
          migrationAppliedOnce: true,
          publicSyntheticPassed: true,
          queueInvariantPassed: true,
          runtimeAdapter: PRODUCTION_RUNTIME_ADAPTER_ID,
        });
      }
      if (id === "rollback-rehearsal") {
        Object.assign(item, {
          creditFingerprintUnchanged: true,
          databaseFingerprintUnchanged: true,
          priorReleaseRetained: true,
          priorReleaseRevision: "d".repeat(40),
          queueRecoveryPassed: true,
          runtimeAdapter: PRODUCTION_RUNTIME_ADAPTER_ID,
          schemaDowngradeAttempted: false,
          webRollbackPassed: true,
          workerRollbackPassed: true,
        });
      }
      return item;
    }),
  };
}

function reportFor(document) {
  return runProductionReadinessGate(document, { now: () => NOW });
}

function seedReportFor(document) {
  return runSeedProductionReadinessGate(document, { now: () => NOW });
}

test("production gate passes only a complete, current, exact-digest evidence set", () => {
  const report = reportFor(validEvidenceDocument());

  assert.equal(report.ok, true);
  assert.equal(report.release.revision, REVISION);
  assert.equal(report.checks.length, REQUIRED_PRODUCTION_CHECKS.length + 2);
  assert.ok(report.checks.every(({ status }) => status === "pass"));
});

test("seed gate excludes only paid-only evidence while the full gate stays closed", () => {
  const document = validEvidenceDocument();
  for (const id of PAID_ONLY_PRODUCTION_CHECK_IDS) {
    document.evidence.find((item) => item.id === id).status = "blocked";
  }

  const seedReport = seedReportFor(document);
  const fullReport = reportFor(document);

  assert.equal(seedReport.ok, true);
  assert.equal(
    seedReport.checks.length,
    REQUIRED_SEED_PRODUCTION_CHECKS.length + 2,
  );
  assert.ok(
    PAID_ONLY_PRODUCTION_CHECK_IDS.every(
      (id) => !seedReport.checks.some((check) => check.id === id),
    ),
  );
  assert.equal(fullReport.ok, false);
  for (const id of PAID_ONLY_PRODUCTION_CHECK_IDS) {
    assert.equal(
      fullReport.checks.find((check) => check.id === id).status,
      "blocked",
    );
  }
});

test("seed gate fails closed for shared requirements and malformed paid-only evidence", () => {
  const blockedDocument = validEvidenceDocument();
  blockedDocument.evidence.find(
    ({ id }) => id === "monitoring-handoff",
  ).status = "pending";

  const blockedReport = seedReportFor(blockedDocument);
  assert.equal(blockedReport.ok, false);
  assert.equal(
    blockedReport.checks.find(({ id }) => id === "monitoring-handoff").status,
    "pending",
  );

  const malformedDocument = validEvidenceDocument();
  malformedDocument.evidence.find(
    ({ id }) => id === "icp-production-domain",
  ).reference = "https://evidence.invalid/item?token=secret";

  const malformedReport = seedReportFor(malformedDocument);
  assert.equal(malformedReport.ok, false);
  assert.equal(
    malformedReport.checks.find(({ id }) => id === "evidence-contract").status,
    "fail",
  );
});

test("production gate fails closed for blockers, stale recovery, and missing monitoring handoff", () => {
  const document = validEvidenceDocument();
  document.evidence = document.evidence.filter(
    ({ id }) => id !== "monitoring-handoff",
  );
  document.evidence.find(
    ({ id }) => id === "production-backup-freshness",
  ).checkedAt = new Date(NOW - 61 * 60 * 1_000).toISOString();
  document.evidence.find(({ id }) => id === "icp-production-domain").status =
    "blocked";

  const report = reportFor(document);

  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "monitoring-handoff").status,
    "blocked",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "production-backup-freshness").status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "icp-production-domain").status,
    "blocked",
  );
});

test("release-specific evidence cannot be reused for another candidate", () => {
  const document = validEvidenceDocument();
  document.evidence.find(
    ({ id }) => id === "artifact-security",
  ).releaseRevision = "d".repeat(40);

  const report = reportFor(document);

  assert.equal(report.ok, false);
  assert.match(
    report.checks.find(({ id }) => id === "artifact-security").detail,
    /not bound to the candidate Git revision/,
  );
});

test("production recovery and monitoring attestations must meet accepted objectives", () => {
  const document = validEvidenceDocument();
  document.evidence.find(
    ({ id }) => id === "production-restore-drill",
  ).observedRtoMinutes = 241;
  document.evidence.find(
    ({ id }) => id === "monitoring-handoff",
  ).resolvedAcknowledged = false;
  document.evidence.find(
    ({ id }) => id === "incident-support-ownership",
  ).secondaryOwner = "operator:primary";

  const report = reportFor(document);

  assert.equal(report.ok, false);
  for (const id of [
    "production-restore-drill",
    "monitoring-handoff",
    "incident-support-ownership",
  ]) {
    assert.equal(report.checks.find((check) => check.id === id).status, "fail");
  }
});

test("candidate and rollback evidence must prove the selected runtime adapter and invariants", () => {
  const document = validEvidenceDocument();
  document.evidence.find(
    ({ id }) => id === "candidate-health-invariants",
  ).runtimeAdapter = "unreviewed-adapter";
  document.evidence.find(
    ({ id }) => id === "rollback-rehearsal",
  ).schemaDowngradeAttempted = true;

  const report = reportFor(document);

  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "candidate-health-invariants")
      .status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "rollback-rehearsal").status,
    "fail",
  );
});

test("production evidence contract rejects duplicate, unknown, and unsafe references", () => {
  for (const mutate of [
    (document) => document.evidence.push({ ...document.evidence[0] }),
    (document) =>
      document.evidence.push({
        checkedAt: new Date(NOW).toISOString(),
        id: "unreviewed-bypass",
        reference: "evidence:unknown",
        status: "pass",
      }),
    (document) => {
      document.evidence[0].reference = "https://evidence.invalid/item?token=secret";
    },
  ]) {
    const document = validEvidenceDocument();
    mutate(document);
    const report = reportFor(document);
    assert.equal(report.ok, false);
    assert.equal(
      report.checks.find(({ id }) => id === "evidence-contract").status,
      "fail",
    );
  }
});

test("checked-in example is deliberately blocked and CLI parsing is strict", async () => {
  const [exampleSource, packageSource, releaseMetadata] = await Promise.all([
    readFile(
      new URL("../infra/production/readiness-evidence.example.json", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
  ]);
  const example = JSON.parse(exampleSource);

  assert.equal(reportFor(example).ok, false);
  assert.deepEqual(
    parseProductionReadinessArguments([
      "--evidence-file",
      "infra/production/readiness-evidence.example.json",
    ]),
    {
      evidenceFile: path.resolve(
        "infra/production/readiness-evidence.example.json",
      ),
    },
  );
  assert.throws(() => parseProductionReadinessArguments([]), /Usage/);
  assert.throws(
    () => parseProductionReadinessArguments(["--evidence-file", "--bypass"]),
    /Usage/,
  );
  assert.deepEqual(
    parseSeedProductionReadinessArguments([
      "--evidence-file",
      "infra/production/readiness-evidence.example.json",
    ]),
    {
      evidenceFile: path.resolve(
        "infra/production/readiness-evidence.example.json",
      ),
    },
  );
  assert.throws(() => parseSeedProductionReadinessArguments([]), /Usage/);
  assert.throws(
    () =>
      parseSeedProductionReadinessArguments(["--evidence-file", "--bypass"]),
    /Usage/,
  );
  const packageJson = JSON.parse(packageSource);
  assert.equal(
    packageJson.scripts["production:gate"],
    "node scripts/verify-production-readiness.mjs",
  );
  assert.equal(
    packageJson.scripts["production:seed-gate"],
    "node scripts/verify-seed-production-readiness.mjs",
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/verify-production-readiness.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/verify-seed-production-readiness.mjs")),
  );
});
