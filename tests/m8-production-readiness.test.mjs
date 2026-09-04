import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  REQUIRED_PRODUCTION_CHECKS,
  runProductionReadinessGate,
} from "../scripts/production-readiness-contract.mjs";
import { parseProductionReadinessArguments } from "../scripts/verify-production-readiness.mjs";

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
    schemaVersion: 1,
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
      return item;
    }),
  };
}

function reportFor(document) {
  return runProductionReadinessGate(document, { now: () => NOW });
}

test("production gate passes only a complete, current, exact-digest evidence set", () => {
  const report = reportFor(validEvidenceDocument());

  assert.equal(report.ok, true);
  assert.equal(report.release.revision, REVISION);
  assert.equal(report.checks.length, REQUIRED_PRODUCTION_CHECKS.length + 2);
  assert.ok(report.checks.every(({ status }) => status === "pass"));
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
  const example = JSON.parse(
    await readFile(
      new URL("../infra/production/readiness-evidence.example.json", import.meta.url),
      "utf8",
    ),
  );

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
});
