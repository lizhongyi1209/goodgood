import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  CONTROLLED_ALPHA_MODE,
  PRODUCTION_EVIDENCE_SCHEMA_VERSION,
  REQUIRED_CONTROLLED_ALPHA_CHECKS,
  runControlledAlphaReadinessGate,
  runSeedProductionReadinessGate,
} from "../scripts/production-readiness-contract.mjs";
import { parseControlledAlphaReadinessArguments } from "../scripts/verify-controlled-alpha-readiness.mjs";

const NOW = Date.parse("2026-09-09T06:00:00.000Z");
const REVISION = "b".repeat(40);

function validControlledAlphaDocument(now = NOW) {
  return {
    schemaVersion: PRODUCTION_EVIDENCE_SCHEMA_VERSION,
    release: {
      image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
      migration: "0019_gg021_nano_banana_pro_prices.sql",
      revision: REVISION,
      runtimeConfigVersion: "c".repeat(64),
    },
    evidence: REQUIRED_CONTROLLED_ALPHA_CHECKS.map(({ id }) => {
      const item = {
        checkedAt: new Date(now - 30 * 60 * 1_000).toISOString(),
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
          registrationDefaultState: "active",
          siteOwnerApprovalRequired: false,
          webHealthy: true,
          workerHealthy: true,
        });
      }
      if (id === "controlled-alpha-member-journey") {
        Object.assign(item, {
          crossOwnerReadDenied: true,
          customerContentInEvidence: false,
          manualTestCreditGrantPassed: true,
          nonOwnerAccountUsed: true,
          privateAssetReadPassed: true,
          realGenerationPassed: true,
          referenceUploadPassed: true,
          reloginPassed: true,
          siteOwnerApprovalPassed: true,
          welcomeCredits: 200,
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
  return runControlledAlphaReadinessGate(document, { now: () => NOW });
}

test("controlled-alpha gate passes only the exact current alpha contract", () => {
  const document = validControlledAlphaDocument();
  const alphaReport = reportFor(document);

  assert.equal(alphaReport.ok, true);
  assert.equal(
    alphaReport.checks.length,
    REQUIRED_CONTROLLED_ALPHA_CHECKS.length + 2,
  );
  assert.ok(alphaReport.checks.every(({ status }) => status === "pass"));
  assert.equal(runSeedProductionReadinessGate(document, { now: () => NOW }).ok, false);
});

test("controlled-alpha gate fails closed for missing and expired evidence", () => {
  const missing = validControlledAlphaDocument();
  missing.evidence = missing.evidence.filter(
    ({ id }) => id !== "controlled-alpha-operations",
  );
  assert.equal(
    reportFor(missing).checks.find(({ id }) => id === "controlled-alpha-operations")
      .status,
    "blocked",
  );

  const expired = validControlledAlphaDocument();
  expired.evidence.find(({ id }) => id === "artifact-security").checkedAt =
    new Date(NOW - 169 * 60 * 60 * 1_000).toISOString();
  expired.evidence.find(({ id }) => id === "production-preflight").checkedAt =
    new Date(NOW - 73 * 60 * 60 * 1_000).toISOString();
  const expiredReport = reportFor(expired);
  assert.equal(expiredReport.ok, false);
  assert.equal(
    expiredReport.checks.find(({ id }) => id === "artifact-security").status,
    "fail",
  );
  assert.equal(
    expiredReport.checks.find(({ id }) => id === "production-preflight").status,
    "fail",
  );
});

test("controlled-alpha gate rejects another candidate and another launch mode", () => {
  const document = validControlledAlphaDocument();
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-operations",
  ).releaseRevision = "d".repeat(40);
  document.evidence.find(
    ({ id }) => id === "controlled-alpha-boundary",
  ).mode = "seed-production";

  const report = reportFor(document);
  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "controlled-alpha-operations").status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "controlled-alpha-boundary").status,
    "fail",
  );
});

test("controlled-alpha example is blocked and argument parsing is strict", () => {
  const examplePath = path.resolve(
    "infra/production/controlled-alpha-readiness-evidence.example.json",
  );
  const example = JSON.parse(readFileSync(examplePath, "utf8"));
  assert.equal(reportFor(example).ok, false);
  assert.deepEqual(
    parseControlledAlphaReadinessArguments(["--evidence-file", examplePath]),
    { evidenceFile: examplePath },
  );
  assert.throws(() => parseControlledAlphaReadinessArguments([]), /Usage/);
  assert.throws(
    () => parseControlledAlphaReadinessArguments(["--evidence-file", "--bypass"]),
    /Usage/,
  );
});

test("controlled-alpha CLI passes valid evidence and fails unreadable or blocked evidence", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "goodgood-alpha-gate-"));
  const evidencePath = path.join(directory, "readiness.json");
  const cliPath = path.resolve("scripts/verify-controlled-alpha-readiness.mjs");
  try {
    writeFileSync(
      evidencePath,
      JSON.stringify(validControlledAlphaDocument(Date.now())),
      "utf8",
    );
    const passed = spawnSync(
      process.execPath,
      [cliPath, "--evidence-file", evidencePath],
      { encoding: "utf8" },
    );
    assert.equal(passed.status, 0, passed.stderr);
    assert.equal(JSON.parse(passed.stdout).ok, true);

    const unreadable = spawnSync(
      process.execPath,
      [cliPath, "--evidence-file", path.join(directory, "missing.json")],
      { encoding: "utf8" },
    );
    assert.equal(unreadable.status, 1);
    assert.equal(JSON.parse(unreadable.stderr).ok, false);

    const blocked = spawnSync(
      process.execPath,
      [
        cliPath,
        "--evidence-file",
        path.resolve(
          "infra/production/controlled-alpha-readiness-evidence.example.json",
        ),
      ],
      { encoding: "utf8" },
    );
    assert.equal(blocked.status, 1);
    assert.equal(JSON.parse(blocked.stdout).ok, false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
