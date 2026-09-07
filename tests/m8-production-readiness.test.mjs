import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  CONTROLLED_ALPHA_MODE,
  PAID_ONLY_PRODUCTION_CHECK_IDS,
  REQUIRED_CONTROLLED_ALPHA_CHECKS,
  REQUIRED_PRODUCTION_CHECKS,
  REQUIRED_SEED_PRODUCTION_CHECKS,
  runControlledAlphaReadinessGate,
  runProductionReadinessGate,
  runSeedProductionReadinessGate,
} from "../scripts/production-readiness-contract.mjs";
import { parseControlledAlphaReadinessArguments } from "../scripts/verify-controlled-alpha-readiness.mjs";
import { parseProductionReadinessArguments } from "../scripts/verify-production-readiness.mjs";
import { parseSeedProductionReadinessArguments } from "../scripts/verify-seed-production-readiness.mjs";
import { PRODUCTION_RUNTIME_ADAPTER_ID } from "../scripts/production-runtime-adapter.mjs";
import {
  CONTENT_POLICY_DOCUMENT_HASH,
  CONTENT_POLICY_VERSION,
} from "../server/content-safety/policy.mjs";

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
    schemaVersion: 3,
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
      if (id === "moderation-abuse-controls") {
        Object.assign(item, {
          accountSuspensionAvailable: true,
          assetsPrivateByDefault: true,
          customerContentInEvidence: false,
          generationLimitAdded: false,
          keywordFilterEnabled: false,
          localSemanticClassifierEnabled: false,
          ownerOnlyReportingPassed: true,
          policyAcceptanceEnforced: true,
          policyDocumentHash: CONTENT_POLICY_DOCUMENT_HASH,
          policyVersion: CONTENT_POLICY_VERSION,
          privateObjectRemovalPassed: true,
          productionRehearsalPassed: true,
          providerDefaultSafetyRetained: true,
          providerRejectionNormalized: true,
          quarantineFlowPassed: true,
          siteOwnerReviewPassed: true,
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

function validControlledAlphaDocument() {
  return {
    schemaVersion: 3,
    release: {
      image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
      migration: "0012_m8_remove_legacy_local_fixtures.sql",
      revision: REVISION,
      runtimeConfigVersion: "c".repeat(64),
    },
    evidence: REQUIRED_CONTROLLED_ALPHA_CHECKS.map(({ id }) => {
      const item = {
        checkedAt: new Date(NOW - 30 * 60 * 1_000).toISOString(),
        id,
        reference: `evidence:${id}`,
        releaseRevision: REVISION,
        status: "pass",
      };
      if (id === "controlled-alpha-boundary") {
        Object.assign(item, {
          activeWorkerCount: 1,
          assetsPrivateByDefault: true,
          automatedAccountDeletionDeferred: true,
          checkoutEnabled: false,
          customerContentInEvidence: false,
          inProductReportingDeferred: true,
          knownTesterBriefingRequired: true,
          manualFallbackAccepted: true,
          mode: CONTROLLED_ALPHA_MODE,
          nonSensitiveContentOnly: true,
          o1keyDisclosureRequired: true,
          providerErasureTermsAvailable: false,
          publicMaintenanceEnabled: true,
          registrationDefaultState: "pending",
          siteOwnerApprovalRequired: true,
          webHealthy: true,
          workerHealthy: true,
        });
      }
      if (id === "controlled-alpha-member-journey") {
        Object.assign(item, {
          crossOwnerReadDenied: true,
          customerContentInEvidence: false,
          generationBlockedWhilePending: true,
          manualTestCreditGrantPassed: true,
          nonOwnerAccountUsed: true,
          pendingBeforeApproval: true,
          privateAssetReadPassed: true,
          realGenerationPassed: true,
          referenceUploadPassed: true,
          reloginPassed: true,
          siteOwnerApprovalPassed: true,
          welcomeCredits: 100,
        });
      }
      if (id === "controlled-alpha-recovery") {
        Object.assign(item, {
          assetsPrivateByDefault: true,
          customerContentInEvidence: false,
          encryptedOffHostBackup: true,
          isolatedRestorePassed: true,
          maintenanceReentryPassed: true,
          observedRpoMinutes: 30,
          observedRtoMinutes: 20,
          productionDataCopiedLocal: false,
          recoveryPoints: { daily: 14, monthly: 12, weekly: 8 },
        });
      }
      if (id === "controlled-alpha-operations") {
        Object.assign(item, {
          accountSuspensionPathPassed: true,
          backupFreshnessObserved: true,
          complexDashboardRequired: false,
          containerRestartSignalObserved: true,
          customerContentInEvidence: false,
          dualOperatorRequired: false,
          exactTargetRemovalRunbookDocumented: true,
          generationProviderFailureObserved: true,
          hostMemoryObserved: true,
          manualContactDocumented: true,
          notificationDelivered: true,
          owner: "operator:site-owner",
          publicAvailabilityObserved: true,
          rootDiskObserved: true,
          webWorkerHealthObserved: true,
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

function controlledAlphaReportFor(document) {
  return runControlledAlphaReadinessGate(document, { now: () => NOW });
}

test("controlled-alpha gate passes the narrow exact-candidate contract while full seed stays closed", () => {
  const document = validControlledAlphaDocument();
  const alphaReport = controlledAlphaReportFor(document);
  const seedReport = seedReportFor(document);

  assert.equal(alphaReport.ok, true);
  assert.equal(
    alphaReport.checks.length,
    REQUIRED_CONTROLLED_ALPHA_CHECKS.length + 2,
  );
  assert.ok(alphaReport.checks.every(({ status }) => status === "pass"));
  assert.equal(seedReport.ok, false);
});

test("controlled-alpha gate fails closed for weakened boundaries or reused candidate evidence", () => {
  const document = validControlledAlphaDocument();
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-boundary",
  ).siteOwnerApprovalRequired = false;
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-member-journey",
  ).crossOwnerReadDenied = false;
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-recovery",
  ).observedRpoMinutes = 61;
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-operations",
  ).releaseRevision = "d".repeat(40);

  const report = controlledAlphaReportFor(document);
  assert.equal(report.ok, false);
  for (const id of [
    "controlled-alpha-boundary",
    "controlled-alpha-member-journey",
    "controlled-alpha-recovery",
    "controlled-alpha-operations",
  ]) {
    assert.equal(report.checks.find((check) => check.id === id).status, "fail");
  }
});

test("controlled-alpha evidence uses the reviewed seven-day artifact and 72-hour preflight lifetimes", () => {
  const current = validControlledAlphaDocument();
  current.evidence.find(({ id }) => id === "artifact-security").checkedAt =
    new Date(NOW - 167 * 60 * 60 * 1_000).toISOString();
  current.evidence.find(({ id }) => id === "production-preflight").checkedAt =
    new Date(NOW - 71 * 60 * 60 * 1_000).toISOString();
  assert.equal(controlledAlphaReportFor(current).ok, true);

  const stale = validControlledAlphaDocument();
  stale.evidence.find(({ id }) => id === "artifact-security").checkedAt =
    new Date(NOW - 169 * 60 * 60 * 1_000).toISOString();
  stale.evidence.find(({ id }) => id === "production-preflight").checkedAt =
    new Date(NOW - 73 * 60 * 60 * 1_000).toISOString();
  const report = controlledAlphaReportFor(stale);
  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "artifact-security").status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "production-preflight").status,
    "fail",
  );
});

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

test("moderation evidence cannot pass without every accepted seed control", () => {
  const document = validEvidenceDocument();
  const evidence = document.evidence.find(
    ({ id }) => id === "moderation-abuse-controls",
  );
  evidence.policyAcceptanceEnforced = false;
  evidence.localSemanticClassifierEnabled = true;
  evidence.generationLimitAdded = true;

  const report = reportFor(document);
  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "moderation-abuse-controls").status,
    "fail",
  );
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

test("checked-in examples are deliberately blocked and CLI parsing is strict", async () => {
  const [exampleSource, alphaExampleSource, packageSource, releaseMetadata] =
    await Promise.all([
    readFile(
      new URL("../infra/production/readiness-evidence.example.json", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../infra/production/controlled-alpha-readiness-evidence.example.json",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
  ]);
  const example = JSON.parse(exampleSource);
  const alphaExample = JSON.parse(alphaExampleSource);

  assert.equal(reportFor(example).ok, false);
  assert.equal(controlledAlphaReportFor(alphaExample).ok, false);
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
  assert.deepEqual(
    parseControlledAlphaReadinessArguments([
      "--evidence-file",
      "infra/production/controlled-alpha-readiness-evidence.example.json",
    ]),
    {
      evidenceFile: path.resolve(
        "infra/production/controlled-alpha-readiness-evidence.example.json",
      ),
    },
  );
  assert.throws(() => parseControlledAlphaReadinessArguments([]), /Usage/);
  assert.throws(
    () =>
      parseControlledAlphaReadinessArguments([
        "--evidence-file",
        "--bypass",
      ]),
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
  assert.equal(
    packageJson.scripts["production:alpha-gate"],
    "node scripts/verify-controlled-alpha-readiness.mjs",
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/verify-production-readiness.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/verify-seed-production-readiness.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(
      JSON.stringify("scripts/verify-controlled-alpha-readiness.mjs"),
    ),
  );
});
