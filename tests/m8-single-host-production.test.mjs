import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import {
  parseProductionConversionArguments,
  planProductionConversion,
  readProductionConversionManifest,
} from "../scripts/production-conversion-contract.mjs";
import { createConcurrentJobRunner } from "../server/generation/concurrent-job-runner.mjs";
import { createGenerationNodeApiHandler } from "../server/generation/node-api.mjs";
import {
  HOST_RESOURCE_THRESHOLDS,
  createHostGenerationAdmission,
  evaluateHostResourceAdmission,
  parseMemAvailable,
  rootDiskUsagePercent,
} from "../server/runtime/host-resource-admission.mjs";

const NOW = Date.parse("2026-09-05T08:00:00.000Z");
const manifestFile = new URL(
  "../infra/production/conversion-manifest.example.json",
  import.meta.url,
);

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("host resource policy uses the exact memory and root-disk boundaries", () => {
  assert.equal(HOST_RESOURCE_THRESHOLDS.availableMemoryFloorBytes, 500 * 1024 * 1024);
  assert.equal(HOST_RESOURCE_THRESHOLDS.rootDiskUsageCeilingPercent, 80);
  assert.equal(parseMemAvailable("MemTotal: 1 kB\nMemAvailable: 512000 kB\n"), 512000 * 1024);
  assert.equal(rootDiskUsagePercent({ blocks: 100n, bavail: 20n }), 80);

  assert.equal(
    evaluateHostResourceAdmission({
      availableMemoryBytes: 500 * 1024 * 1024,
      rootDiskUsagePercent: 79.999,
    }).allowed,
    true,
  );
  assert.deepEqual(
    evaluateHostResourceAdmission({
      availableMemoryBytes: 500 * 1024 * 1024 - 1,
      rootDiskUsagePercent: 80,
    }).reasons,
    ["available-memory-below-floor", "root-disk-at-or-above-ceiling"],
  );
});

test("resource protection latches for operator review and a new process can recover", async () => {
  let probes = 0;
  const logs = [];
  const protectedAdmission = createHostGenerationAdmission({
    log: (entry) => logs.push(entry),
    probe: async () => {
      probes += 1;
      return {
        availableMemoryBytes: 499 * 1024 * 1024,
        rootDiskUsagePercent: 20,
      };
    },
  });
  await assert.rejects(
    protectedAdmission.admitGeneration(),
    (error) => error.code === "GENERATION_CAPACITY_PROTECTED" && error.status === 503,
  );
  await assert.rejects(protectedAdmission.admitGeneration(), /保护生成资源/);
  assert.equal(probes, 1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].recovery, "operator-review-and-process-restart");

  const recoveredAdmission = createHostGenerationAdmission({
    probe: async () => ({
      availableMemoryBytes: 700 * 1024 * 1024,
      rootDiskUsagePercent: 40,
    }),
  });
  await recoveredAdmission.admitGeneration();
  assert.equal(recoveredAdmission.protectionState(), null);
});

test("resource protection blocks only new generation writes", async (context) => {
  let admissionCalls = 0;
  let submitCalls = 0;
  let readCalls = 0;
  const handler = createGenerationNodeApiHandler({
    admitGeneration: createHostGenerationAdmission({
      log: () => {},
      probe: async () => {
        admissionCalls += 1;
        return {
          availableMemoryBytes: 499 * 1024 * 1024,
          rootDiskUsagePercent: 20,
        };
      },
    }).admitGeneration,
    authenticate: async () => ({ ownerId: "owner-safe" }),
    operations: {
      readGeneration: async ({ jobId }) => {
        readCalls += 1;
        return { id: jobId, state: "succeeded" };
      },
      retryGeneration: async () => {
        throw new Error("must not run");
      },
      submitGeneration: async () => {
        submitCalls += 1;
        return { created: true, job: { id: "new-job" } };
      },
    },
  });
  const server = createServer((request, response) => void handler(request, response));
  const origin = await listen(server);
  context.after(() => close(server));

  const denied = await fetch(`${origin}/api/generations`, {
    body: "{}",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(denied.status, 503);
  assert.equal(
    (await denied.json()).error.code,
    "GENERATION_CAPACITY_PROTECTED",
  );
  assert.equal(submitCalls, 0);

  const readable = await fetch(`${origin}/api/generations/existing-job`);
  assert.equal(readable.status, 200);
  assert.equal((await readable.json()).state, "succeeded");
  assert.equal(readCalls, 1);
  assert.equal(admissionCalls, 1);
});

test("one Worker runner overlaps accepted jobs and drains them gracefully", async () => {
  const gates = new Map();
  const runs = [];
  const acknowledgements = [];
  const observations = [];
  const runner = createConcurrentJobRunner({
    acknowledge: async (jobId) => acknowledgements.push(jobId),
    observe: (entry) => observations.push(entry),
    run: async (jobId) => {
      runs.push(jobId);
      const gate = deferred();
      gates.set(jobId, gate);
      await gate.promise;
    },
  });

  for (const jobId of ["job-1", "job-2", "job-3"]) {
    assert.equal(runner.start(jobId), true);
  }
  assert.deepEqual(runs, ["job-1", "job-2", "job-3"]);
  assert.equal(runner.activeJobCount(), 3);

  let drained = false;
  const draining = runner.drain().then(() => {
    drained = true;
  });
  await Promise.resolve();
  assert.equal(drained, false);
  assert.equal(runner.start("job-after-stop"), false);

  for (const gate of gates.values()) gate.resolve();
  await draining;
  assert.equal(runner.activeJobCount(), 0);
  assert.deepEqual(acknowledgements.sort(), ["job-1", "job-2", "job-3"]);
  assert.equal(
    observations.filter(({ event }) => event === "worker.job_started").at(-1)
      .activeJobCount,
    3,
  );
});

test("conversion manifest is exact, fail-closed, and cannot execute", async () => {
  const manifest = readProductionConversionManifest(manifestFile);
  const pending = planProductionConversion(manifest, { now: () => NOW });
  assert.equal(pending.executed, false);
  assert.equal(pending.executionAvailable, false);
  assert.equal(pending.readyForSeparateLiveActionReview, false);
  assert.equal(pending.maintenance.maximumWindowMinutes, 240);
  assert.equal(pending.maintenance.loginAvailable, false);
  assert.equal(pending.maintenance.generationAvailable, false);
  assert.equal(pending.steps[0].id, "enter-public-maintenance");
  assert.equal(pending.steps[1].id, "freeze-and-record-staging");
  assert.equal(pending.steps.at(-1).id, "open-or-stop-in-maintenance");
  assert.match(pending.failurePolicy, /keep-public-maintenance-active/);
  assert.ok(pending.blockers.some((item) => item.includes("r2ExactObjectDeletion")));

  const wrongTarget = structuredClone(manifest);
  wrongTarget.target.r2Bucket = "some-other-bucket";
  assert.throws(
    () => planProductionConversion(wrongTarget),
    /target.r2Bucket must be goodgood/,
  );
  const secretBearing = structuredClone(manifest);
  secretBearing.apiKey = "must-not-enter-a-manifest";
  assert.throws(
    () => planProductionConversion(secretBearing),
    /must not contain secret material/,
  );

  const ready = structuredClone(manifest);
  ready.candidate = {
    image: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
    revision: "b".repeat(40),
    migration: "0011_m8_account_admission.sql",
    runtimeConfigVersion: "c".repeat(64),
  };
  for (const key of Object.keys(ready.approvals)) ready.approvals[key] = true;
  for (const key of Object.keys(ready.evidence)) ready.evidence[key] = `evidence:${key}`;
  const reviewed = planProductionConversion(ready, { now: () => NOW });
  assert.equal(reviewed.readyForSeparateLiveActionReview, true);
  assert.equal(reviewed.executionAvailable, false);
  assert.deepEqual(reviewed.blockers, []);

  assert.deepEqual(
    parseProductionConversionArguments([
      "plan",
      "--manifest-file",
      "infra/production/conversion-manifest.example.json",
    ]).action,
    "plan",
  );
  assert.throws(
    () =>
      parseProductionConversionArguments([
        "plan",
        "--manifest-file",
        "manifest.json",
        "--execute",
      ]),
    /Usage/,
  );

  const [runnerSource, contractSource, maintenance, packageJson, releaseMetadata] =
    await Promise.all([
      readFile(new URL("../scripts/run-production-conversion.mjs", import.meta.url), "utf8"),
      readFile(new URL("../scripts/production-conversion-contract.mjs", import.meta.url), "utf8"),
      readFile(new URL("../infra/production/maintenance/index.html", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    ]);
  assert.doesNotMatch(runnerSource, /node:child_process|\bspawn\b|\bexecFile\b/);
  assert.doesNotMatch(contractSource, /node:child_process|\bspawn\b|\bexecFile\b|writeFile|unlink|rmSync/);
  assert.match(maintenance, /我们正在准备正式环境/);
  assert.match(maintenance, /GoodGood 暂时无法使用/);
  assert.equal(
    JSON.parse(packageJson).scripts["production:conversion-plan"],
    "node scripts/run-production-conversion.mjs",
  );
  for (const file of [
    "infra/production/conversion-manifest.example.json",
    "infra/production/maintenance/index.html",
    "scripts/production-conversion-contract.mjs",
    "scripts/run-production-conversion.mjs",
    "server/generation/concurrent-job-runner.mjs",
    "server/runtime/host-resource-admission.mjs",
  ]) {
    assert.match(releaseMetadata, new RegExp(JSON.stringify(file)));
  }
});
