import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PRODUCTION_WORK_PACKAGE_FILES,
  inspectProductionWorkPackage,
} from "../scripts/production-work-package-contract.mjs";
import { parseProductionWorkPackageArguments } from "../scripts/run-production-work-package.mjs";
import {
  createR2InventoryDocument,
  planR2CurrentObjectDeletion,
  validateR2InventoryDocument,
} from "../server/generation/r2-inventory-contract.mjs";

const NOW = Date.parse("2026-09-05T12:00:00.000Z");

test("local production work-package rehearsal passes without any execution path", () => {
  const result = inspectProductionWorkPackage({ now: () => NOW });

  assert.equal(result.ok, true);
  assert.equal(result.executed, false);
  assert.equal(result.executionAvailable, false);
  assert.equal(result.checkedAt, "2026-09-05T12:00:00.000Z");
  assert.deepEqual(
    result.checks.map(({ id, status }) => [id, status]),
    [
      ["bounded-production-state", "pass"],
      ["blue-green-application", "pass"],
      ["fail-closed-maintenance-ingress", "pass"],
      ["production-backup-policy", "pass"],
      ["metadata-only-r2-inventory", "pass"],
      ["pending-conversion-manifest", "pass"],
      ["authing-and-secret-checklists", "pass"],
      ["rollback-and-four-hour-stop", "pass"],
      ["runtime-bundle-and-release-binding", "pass"],
    ],
  );
});

test("work-package CLI accepts only rehearsal and rejects execution flags", () => {
  assert.deepEqual(parseProductionWorkPackageArguments(["rehearse"]), {
    action: "rehearse",
  });
  for (const invalid of [
    [],
    ["plan"],
    ["rehearse", "--execute"],
    ["--execute"],
  ]) {
    assert.throws(
      () => parseProductionWorkPackageArguments(invalid),
      /production:work-package -- rehearse/,
    );
  }
});

test("R2 inventory handles an empty bucket and binds exact sorted current objects", () => {
  const empty = createR2InventoryDocument({
    capturedAt: "2026-09-05T01:00:00.000Z",
    objects: [],
  });
  assert.equal(empty.objectCount, 0);
  assert.equal(empty.totalBytes, 0);
  assert.equal(planR2CurrentObjectDeletion(empty).targets.length, 0);

  const inventory = createR2InventoryDocument({
    capturedAt: "2026-09-05T02:00:00.000Z",
    objects: [
      {
        etag: '"b"',
        key: "z.png",
        lastModified: "2026-09-04T02:00:00.000Z",
        size: 2,
      },
      {
        etag: '"a"',
        key: "a.png",
        lastModified: "2026-09-04T01:00:00.000Z",
        size: 1,
      },
    ],
  });
  assert.deepEqual(inventory.objects.map(({ key }) => key), ["a.png", "z.png"]);
  const plan = planR2CurrentObjectDeletion(inventory);
  assert.equal(
    plan.approvalBinding,
    `r2-goodgood-current:${inventory.inventorySha256}`,
  );
  assert.equal(plan.executed, false);
  assert.equal(plan.executionAvailable, false);
  assert.equal(plan.requiresExactTargetApproval, true);

  const changedSummary = structuredClone(inventory);
  changedSummary.totalBytes += 1;
  assert.throws(
    () => validateR2InventoryDocument(changedSummary),
    /summary or fingerprint does not match/,
  );
});

test("work package contains no local/live executor or R2 deletion implementation", async () => {
  const [contract, runner, r2Runtime, r2Planner, maintenance, runbook, packageJson] =
    await Promise.all([
      readFile(new URL("../scripts/production-work-package-contract.mjs", import.meta.url), "utf8"),
      readFile(new URL("../scripts/run-production-work-package.mjs", import.meta.url), "utf8"),
      readFile(new URL("../server/runtime/r2-inventory.mjs", import.meta.url), "utf8"),
      readFile(new URL("../scripts/run-production-r2-deletion-plan.mjs", import.meta.url), "utf8"),
      readFile(new URL("../infra/production/maintenance-control.sh", import.meta.url), "utf8"),
      readFile(new URL("../infra/production/CONVERSION_RUNBOOK.md", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);

  assert.doesNotMatch(contract, /from\s+["']node:child_process["']/);
  for (const localOnlySource of [runner, r2Planner]) {
    assert.doesNotMatch(
      localOnlySource,
      /node:child_process|\bspawn\b|\bexecFile\b|\bssh\b|DeleteObjects?Command/,
    );
  }
  assert.match(r2Runtime, /ListObjectsV2Command/);
  assert.doesNotMatch(r2Runtime, /DeleteObjects?Command|PutObjectCommand|GetObjectCommand/);
  assert.doesNotMatch(maintenance, /^\s*disable\)/m);
  assert.match(maintenance, /systemctl stop nginx/);
  assert.match(runbook, /本仓库故意不提供删除执行命令/);
  assert.match(runbook, /本仓库不提供 public-open 执行命令/);
  assert.equal(
    JSON.parse(packageJson).scripts["production:work-package"],
    "node scripts/run-production-work-package.mjs",
  );
  assert.ok(PRODUCTION_WORK_PACKAGE_FILES.length >= 27);
});
