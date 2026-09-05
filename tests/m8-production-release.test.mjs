import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { REQUIRED_PRODUCTION_CHECKS } from "../scripts/production-readiness-contract.mjs";
import {
  parseProductionReleaseArguments,
  planProductionRelease,
} from "../scripts/run-production-release.mjs";

const NOW = Date.parse("2026-09-05T05:00:00.000Z");
const REVISION = "b".repeat(40);
const RELEASE_BOUND_IDS = new Set([
  "artifact-security",
  "production-preflight",
  "candidate-health-invariants",
  "rollback-rehearsal",
]);

function completeEvidenceDocument() {
  return {
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
      if (id === "production-restore-drill") item.observedRtoMinutes = 210;
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
      return item;
    }),
    release: {
      image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
      migration: "0010_m6_payment_sandbox.sql",
      revision: REVISION,
      runtimeConfigVersion: "c".repeat(64),
    },
    schemaVersion: 1,
  };
}

test("production release planner exposes an immutable plan only after the full gate", () => {
  const result = planProductionRelease({
    evidenceDocument: completeEvidenceDocument(),
    now: () => NOW,
  });

  assert.equal(result.ok, true);
  assert.equal(result.executed, false);
  assert.equal(result.executionAvailable, false);
  assert.equal(result.gate.ok, true);
  assert.equal(result.plan.candidate.revision, REVISION);
  assert.equal(result.plan.steps.length, 6);
  assert.equal(result.plan.steps[0].id, "retain-prior-release");
  assert.equal(result.plan.steps.at(-1).id, "observe-or-rollback");
  assert.ok(result.plan.steps.every(({ purpose }) => !purpose.includes(":latest")));
});

test("production release planner emits no plan when any gate evidence is blocked", () => {
  const document = completeEvidenceDocument();
  document.evidence.find(({ id }) => id === "monitoring-handoff").status =
    "pending";
  const result = planProductionRelease({
    evidenceDocument: document,
    now: () => NOW,
  });

  assert.equal(result.ok, false);
  assert.equal(result.executed, false);
  assert.equal(result.plan, null);
  assert.equal(
    result.gate.checks.find(({ id }) => id === "monitoring-handoff").status,
    "pending",
  );
});

test("production release CLI is plan-only and has no process execution path", async () => {
  assert.deepEqual(
    parseProductionReleaseArguments([
      "plan",
      "--evidence-file",
      "production-readiness.json",
    ]),
    {
      action: "plan",
      evidenceFile: path.resolve("production-readiness.json"),
    },
  );
  assert.throws(
    () =>
      parseProductionReleaseArguments([
        "deploy",
        "--evidence-file",
        "production-readiness.json",
      ]),
    /Usage/,
  );
  assert.throws(
    () =>
      parseProductionReleaseArguments([
        "plan",
        "--evidence-file",
        "production-readiness.json",
        "--execute",
      ]),
    /Usage/,
  );

  const [source, packageJson, releaseMetadata] = await Promise.all([
    readFile(new URL("../scripts/run-production-release.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(source, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.equal(
    JSON.parse(packageJson).scripts["production:release-plan"],
    "node scripts/run-production-release.mjs",
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/run-production-release.mjs")),
  );
});
