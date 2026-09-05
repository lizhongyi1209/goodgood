import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { verifyArtifactSecurityEvidence } from "../scripts/artifact-security-contract.mjs";
import {
  ARTIFACT_SECURITY_FILENAME,
  ARTIFACT_SECURITY_VERIFICATIONS,
  createArtifactSecurityEvidence,
} from "../scripts/artifact-security-evidence.mjs";
import { parseArtifactSecurityArguments } from "../scripts/import-artifact-security-evidence.mjs";
import { REQUIRED_PRODUCTION_CHECKS } from "../scripts/production-readiness-contract.mjs";

const NOW = Date.parse("2026-09-05T03:00:00.000Z");
const COMPLETED_AT = new Date("2026-09-05T02:30:00.000Z");
const REVISION = "b".repeat(40);
const RUNTIME_VERSION = "c".repeat(64);
const IMAGE = `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`;
const RUN_ID = "123456789";

function readinessDocument(overrides = {}) {
  return {
    evidence: REQUIRED_PRODUCTION_CHECKS.map(({ id }) => ({
      checkedAt: null,
      id,
      reference: `pending:${id}`,
      ...(new Set([
        "artifact-security",
        "production-preflight",
        "candidate-health-invariants",
        "rollback-rehearsal",
      ]).has(id)
        ? { releaseRevision: REVISION }
        : {}),
      status: "pending",
    })),
    release: {
      image: IMAGE,
      migration: "0010_m6_payment_sandbox.sql",
      revision: REVISION,
      runtimeConfigVersion: RUNTIME_VERSION,
      ...overrides,
    },
    schemaVersion: 1,
  };
}

function artifactDocument() {
  return createArtifactSecurityEvidence({
    completedAt: COMPLETED_AT,
    image: IMAGE,
    migration: "0010_m6_payment_sandbox.sql",
    revision: REVISION,
    runAttempt: 2,
    runEvent: "workflow_dispatch",
    runId: RUN_ID,
    runtimeConfigVersion: RUNTIME_VERSION,
  });
}

function artifactBuffer(document = artifactDocument()) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

function successfulStep(name) {
  return { conclusion: "success", name, status: "completed" };
}

function remoteEvidence(bytes, document = artifactDocument()) {
  const verifySteps = [
    "Run repository quality gate",
    "Scan locked production dependencies",
    "Build verification image",
    "Smoke verification image runtime imports",
    "Scan verification image",
  ].map(successfulStep);
  const publishSteps = [
    "Build and publish image",
    "Smoke published image runtime imports",
    "Scan published image",
    "Create artifact-security evidence",
    "Upload artifact-security evidence",
  ].map(successfulStep);
  return {
    artifacts: {
      artifacts: [
        {
          digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
          expired: false,
          id: 987654321,
          name: ARTIFACT_SECURITY_FILENAME,
          size_in_bytes: bytes.length,
          workflow_run: {
            head_branch: "main",
            head_sha: REVISION,
            id: Number(RUN_ID),
          },
        },
      ],
    },
    jobs: {
      jobs: [
        {
          conclusion: "success",
          name: "Verify source and image",
          status: "completed",
          steps: verifySteps,
        },
        {
          conclusion: "success",
          name: "Publish immutable image",
          status: "completed",
          steps: publishSteps,
        },
      ],
    },
    run: {
      conclusion: "success",
      created_at: "2026-09-05T02:00:00.000Z",
      event: document.run.event,
      head_branch: "main",
      head_sha: REVISION,
      html_url: document.run.htmlUrl,
      id: Number(RUN_ID),
      name: "CI",
      path: ".github/workflows/ci.yml",
      repository: { full_name: "lizhongyi1209/goodgood" },
      run_attempt: 2,
      status: "completed",
      updated_at: "2026-09-05T02:40:00.000Z",
    },
  };
}

function githubFetch(remote) {
  return async (url) => {
    const body = url.includes("/jobs?")
      ? remote.jobs
      : url.includes("/artifacts?")
        ? remote.artifacts
        : remote.run;
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };
}

async function validReport(overrides = {}) {
  const document = artifactDocument();
  const bytes = artifactBuffer(document);
  const remote = remoteEvidence(bytes, document);
  return verifyArtifactSecurityEvidence({
    artifactFileBytes: bytes,
    evidenceDocument: readinessDocument(),
    fetchImpl: githubFetch(remote),
    now: () => NOW,
    ...overrides,
  });
}

test("artifact importer emits exact-candidate evidence only after GitHub provenance passes", async () => {
  const report = await validReport();

  assert.equal(report.ok, true);
  assert.deepEqual(report.evidence, {
    checkedAt: COMPLETED_AT.toISOString(),
    id: "artifact-security",
    reference: `github:run:${RUN_ID}/artifact:987654321`,
    releaseRevision: REVISION,
    status: "pass",
  });
  assert.equal(report.release.image, IMAGE);
  assert.match(report.provenance.artifactDigest, /^sha256:[a-f0-9]{64}$/);
  assert.ok(report.checks.every(({ status }) => status === "pass"));
});

test("artifact importer rejects a candidate mismatch before trusting GitHub", async () => {
  let requests = 0;
  const report = await validReport({
    evidenceDocument: readinessDocument({ revision: "d".repeat(40) }),
    fetchImpl: async () => {
      requests += 1;
      throw new Error("must not be called");
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.evidence, null);
  assert.equal(requests, 0);
  assert.equal(
    report.checks.find(({ id }) => id === "candidate-identity").status,
    "fail",
  );
});

test("artifact importer rejects failed CI jobs and tampered artifact bytes", async () => {
  const document = artifactDocument();
  const bytes = artifactBuffer(document);
  const failedJobs = remoteEvidence(bytes, document);
  failedJobs.jobs.jobs[1].steps.find(
    ({ name }) => name === "Scan published image",
  ).conclusion = "failure";
  const jobReport = await validReport({ fetchImpl: githubFetch(failedJobs) });
  assert.equal(jobReport.ok, false);
  assert.equal(jobReport.evidence, null);
  assert.equal(
    jobReport.checks.find(({ id }) => id === "github-jobs").status,
    "fail",
  );

  const tampered = remoteEvidence(bytes, document);
  tampered.artifacts.artifacts[0].digest = `sha256:${"f".repeat(64)}`;
  const digestReport = await validReport({ fetchImpl: githubFetch(tampered) });
  assert.equal(digestReport.ok, false);
  assert.equal(digestReport.evidence, null);
  assert.equal(
    digestReport.checks.find(({ id }) => id === "github-artifact-integrity")
      .status,
    "fail",
  );
});

test("artifact importer fails closed for malformed local or remote evidence", async () => {
  let requests = 0;
  const local = await verifyArtifactSecurityEvidence({
    artifactFileBytes: Buffer.from("not-json"),
    evidenceDocument: readinessDocument(),
    fetchImpl: async () => {
      requests += 1;
      throw new Error("secret remote failure");
    },
    now: () => NOW,
  });
  assert.equal(local.ok, false);
  assert.equal(local.evidence, null);
  assert.equal(requests, 0);

  const remote = await validReport({
    fetchImpl: async () => {
      throw new Error("token=must-not-appear");
    },
  });
  assert.equal(remote.ok, false);
  assert.equal(remote.evidence, null);
  assert.doesNotMatch(JSON.stringify(remote), /token=must-not-appear/);
});

test("artifact creator fixes every verification and importer CLI is strict", () => {
  const document = artifactDocument();
  assert.deepEqual(Object.keys(document.verification), [
    ...ARTIFACT_SECURITY_VERIFICATIONS,
  ]);
  assert.ok(Object.values(document.verification).every((value) => value === "pass"));
  assert.throws(
    () =>
      createArtifactSecurityEvidence({
        completedAt: COMPLETED_AT,
        image: IMAGE,
        migration: "0010_m6_payment_sandbox.sql",
        revision: REVISION,
        runAttempt: 2,
        runEvent: "pull_request",
        runId: RUN_ID,
        runtimeConfigVersion: RUNTIME_VERSION,
      }),
    /runEvent/,
  );
  assert.deepEqual(
    parseArtifactSecurityArguments([
      "--artifact-file",
      "artifact-security-evidence.json",
      "--evidence-file",
      "production-readiness.json",
      "--github-token-file",
      "github-token",
    ]),
    {
      artifactFile: path.resolve("artifact-security-evidence.json"),
      evidenceFile: path.resolve("production-readiness.json"),
      githubTokenFile: path.resolve("github-token"),
    },
  );
  assert.throws(() => parseArtifactSecurityArguments([]), /are required/);
  assert.throws(
    () => parseArtifactSecurityArguments(["--execute", "true"]),
    /Unknown artifact-security argument/,
  );
});

test("CI scans the published digest and uploads one immutable raw evidence file", async () => {
  const [workflow, packageJson, releaseMetadata] = await Promise.all([
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(workflow, /name: Smoke published image runtime imports/);
  assert.match(workflow, /name: Scan published image/);
  assert.match(
    workflow,
    /image-ref: \$\{\{ steps\.release\.outputs\.image-name \}\}@\$\{\{ steps\.image\.outputs\.digest \}\}/,
  );
  assert.match(
    workflow,
    /actions\/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f # v7\.0\.0/,
  );
  assert.match(workflow, /archive: false/);
  assert.match(workflow, /path: work\/artifact-security-evidence\.json/);
  const scripts = JSON.parse(packageJson).scripts;
  assert.equal(
    scripts["production:artifact-evidence"],
    "node scripts/import-artifact-security-evidence.mjs",
  );
  for (const relativePath of [
    "scripts/artifact-security-contract.mjs",
    "scripts/artifact-security-evidence.mjs",
    "scripts/import-artifact-security-evidence.mjs",
  ]) {
    assert.match(releaseMetadata, new RegExp(JSON.stringify(relativePath)));
  }
});
