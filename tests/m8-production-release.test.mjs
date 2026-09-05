import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  PAID_ONLY_PRODUCTION_CHECK_IDS,
  REQUIRED_PRODUCTION_CHECKS,
} from "../scripts/production-readiness-contract.mjs";
import {
  parseProductionReleaseArguments,
  planProductionRelease,
} from "../scripts/run-production-release.mjs";
import {
  parseSeedProductionReleaseArguments,
  planSeedProductionRelease,
} from "../scripts/run-seed-production-release.mjs";
import {
  PRODUCTION_RUNTIME_ADAPTER,
  PRODUCTION_RUNTIME_ADAPTER_ID,
} from "../scripts/production-runtime-adapter.mjs";
import {
  PRODUCTION_INFRASTRUCTURE_PROFILE,
  PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
  PRODUCTION_SCALE_OUT_PROFILE,
} from "../scripts/production-infrastructure-profile.mjs";

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
    release: {
      image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
      migration: "0010_m6_payment_sandbox.sql",
      revision: REVISION,
      runtimeConfigVersion: "c".repeat(64),
    },
    schemaVersion: 2,
  };
}

test("production release planner exposes an immutable plan only after the full gate", () => {
  const result = planProductionRelease({
    evidenceDocument: completeEvidenceDocument(),
    now: () => NOW,
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.executed, false);
  assert.equal(result.executionAvailable, false);
  assert.equal(result.gate.ok, true);
  assert.deepEqual(result.plan.adapter, PRODUCTION_RUNTIME_ADAPTER);
  assert.equal(
    result.plan.adapter.infrastructureProfile,
    PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
  );
  assert.equal(result.plan.candidate.revision, REVISION);
  assert.equal(result.plan.steps.length, 8);
  assert.equal(result.plan.steps[0].id, "lock-and-snapshot-active");
  assert.equal(result.plan.steps[1].id, "stage-inactive-web");
  assert.equal(result.plan.steps[4].id, "handoff-single-worker");
  assert.equal(result.plan.steps[5].id, "switch-nginx-upstream");
  assert.equal(result.plan.steps.at(-1).id, "observe-or-revert-slot");
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

test("seed release planner emits a distinct plan when only paid evidence is blocked", () => {
  const document = completeEvidenceDocument();
  for (const id of PAID_ONLY_PRODUCTION_CHECK_IDS) {
    document.evidence.find((item) => item.id === id).status = "blocked";
  }

  const seedResult = planSeedProductionRelease({
    evidenceDocument: document,
    now: () => NOW,
  });
  const fullResult = planProductionRelease({
    evidenceDocument: document,
    now: () => NOW,
  });

  assert.equal(seedResult.ok, true);
  assert.equal(seedResult.executed, false);
  assert.equal(seedResult.executionAvailable, false);
  assert.equal(seedResult.plan.action, "seed-production-release-dry-run");
  assert.equal(seedResult.plan.candidate.revision, REVISION);
  assert.equal(fullResult.ok, false);
  assert.equal(fullResult.plan, null);
});

test("seed release planner emits no plan when a shared requirement is blocked", () => {
  const document = completeEvidenceDocument();
  document.evidence.find(({ id }) => id === "monitoring-handoff").status =
    "pending";

  const result = planSeedProductionRelease({
    evidenceDocument: document,
    now: () => NOW,
  });

  assert.equal(result.ok, false);
  assert.equal(result.executed, false);
  assert.equal(result.plan, null);
});

test("selected production profile is the existing bounded Hong Kong seed host", () => {
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE_ID,
    "alibaba-hong-kong-single-host-seed-v1",
  );
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.status, "selected-existing-not-converted");
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.region.productionRegion,
    "china-hong-kong",
  );
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.applicationHost.architecture,
    "linux-amd64",
  );
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.applicationHost.vcpu, 2);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.applicationHost.memoryGiB, 4);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.applicationHost.systemDiskGiB, 50);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.applicationHost.purchaseRequired, false);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.postgresql.engineVersion, "17");
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.postgresql.service,
    "host-colocated-container",
  );
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.postgresql.stagingDataImportAllowed, false);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.queue.authoritativeState, false);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.queue.fixedQueueDepthLimit, null);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.queue.fixedConcurrentJobLimit, null);
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.objectStorage.bucket, "goodgood");
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.preproduction.remoteStagingActive, false);
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.resourceAdmission.availableMemoryFloorMiB,
    500,
  );
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.resourceAdmission.rootDiskUsageCeilingPercent,
    80,
  );
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.conversion.maximumWindowMinutes, 240);
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.authorization.purchaseAuthorized,
    false,
  );
  assert.equal(
    PRODUCTION_INFRASTRUCTURE_PROFILE.authorization.productionDeploymentAuthorized,
    false,
  );
  assert.equal(PRODUCTION_INFRASTRUCTURE_PROFILE.authorization.liveConversionAuthorized, false);
  assert.equal(PRODUCTION_SCALE_OUT_PROFILE.id, "alibaba-managed-state-v1");
  assert.equal(PRODUCTION_SCALE_OUT_PROFILE.postgresql.edition, "high-availability");
  assert.equal(PRODUCTION_SCALE_OUT_PROFILE.authorization.purchaseAuthorized, false);
});

test("single-host seed decision keeps local data isolated and authorizes no live conversion", async () => {
  const [decision, priorDecision, deployment, plan] = await Promise.all([
    readFile(
      new URL(
        "../docs/decisions/0021-single-host-seed-production-and-local-preproduction.md",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../docs/decisions/0019-hong-kong-invite-only-seed-production.md",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../docs/DEPLOYMENT.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/IMPLEMENTATION_PLAN.md", import.meta.url), "utf8"),
  ]);

  for (const source of [decision, priorDecision, deployment, plan]) {
    assert.match(source, /goodgood\.o1key\.com/);
    assert.match(source, /staging-goodgood\.o1key\.com/);
  }
  assert.match(decision, /2 vCPUs, 4 GiB memory, a 50 GiB/);
  assert.match(decision, /must never\s+be copied into that local environment/);
  assert.match(decision, /one hour apart/);
  assert.match(decision, /within four\s+hours/);
  assert.match(decision, /14 daily, 8 weekly, and 12 monthly/);
  assert.match(decision, /Do not impose a fixed per-user pending-job limit/);
  assert.match(decision, /current Worker awaits each job serially/);
  assert.match(decision, /`MemAvailable` falls below 500 MiB/);
  assert.match(decision, /root filesystem reaches 80%/);
  assert.match(
    decision,
    /reuse the existing private Cloudflare R2 `goodgood` bucket/,
  );
  assert.match(decision, /Reuse the current Authing application and identity directory/);
  assert.match(
    decision,
    /https:\/\/goodgood\.o1key\.com\/api\/auth\/callback/,
  );
  assert.match(decision, /Do not delete Authing identity-directory records/);
  assert.match(
    decision,
    /new pending\s+GoodGood account with the standard welcome grant/,
  );
  assert.match(decision, /visible maintenance window with a\s+four-hour execution limit/);
  assert.match(decision, /keep the public site in maintenance mode/);
  assert.match(decision, /no live connection, data deletion/);
  assert.match(deployment, /No live reset or deletion is authorized/);
  assert.match(deployment, /seven days after conversion passes/);
  assert.match(deployment, /verify the bucket is empty/);
  assert.match(plan, /connected to no server and deleted or changed no data/);
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
  assert.deepEqual(
    parseSeedProductionReleaseArguments([
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
      parseSeedProductionReleaseArguments([
        "deploy",
        "--evidence-file",
        "production-readiness.json",
      ]),
    /Usage/,
  );
  assert.throws(
    () =>
      parseSeedProductionReleaseArguments([
        "plan",
        "--evidence-file",
        "production-readiness.json",
        "--execute",
      ]),
    /Usage/,
  );

  const [
    source,
    seedSource,
    adapterSource,
    profileSource,
    packageJson,
    releaseMetadata,
  ] = await Promise.all([
    readFile(
      new URL("../scripts/run-production-release.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../scripts/run-seed-production-release.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../scripts/production-runtime-adapter.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../scripts/production-infrastructure-profile.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL("../scripts/release-metadata.mjs", import.meta.url),
      "utf8",
    ),
  ]);
  assert.doesNotMatch(source, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.doesNotMatch(seedSource, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.doesNotMatch(adapterSource, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.doesNotMatch(profileSource, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.equal(PRODUCTION_RUNTIME_ADAPTER.publicIngress, "nginx-only");
  assert.deepEqual(PRODUCTION_RUNTIME_ADAPTER.stateBoundary, [
    "host-colocated-postgresql",
    "host-colocated-valkey",
    "private-r2",
  ]);
  assert.deepEqual(
    PRODUCTION_RUNTIME_ADAPTER.slots.map(({ webPort, workerHealthPort }) => [
      webPort,
      workerHealthPort,
    ]),
    [
      [3100, 3101],
      [3200, 3201],
    ],
  );
  assert.equal(
    PRODUCTION_RUNTIME_ADAPTER.schemaRollback,
    "forbidden-forward-fix-only",
  );
  assert.equal(
    JSON.parse(packageJson).scripts["production:release-plan"],
    "node scripts/run-production-release.mjs",
  );
  assert.equal(
    JSON.parse(packageJson).scripts["production:seed-release-plan"],
    "node scripts/run-seed-production-release.mjs",
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/run-production-release.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/run-seed-production-release.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/production-runtime-adapter.mjs")),
  );
  assert.match(
    releaseMetadata,
    new RegExp(JSON.stringify("scripts/production-infrastructure-profile.mjs")),
  );
});
