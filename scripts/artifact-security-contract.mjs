import { createHash } from "node:crypto";
import {
  ARTIFACT_SECURITY_FILENAME,
  ARTIFACT_SECURITY_REPOSITORY,
  ARTIFACT_SECURITY_SCHEMA_VERSION,
  ARTIFACT_SECURITY_VERIFICATIONS,
  ARTIFACT_SECURITY_WORKFLOW,
} from "./artifact-security-evidence.mjs";
import { runProductionReadinessGate } from "./production-readiness-contract.mjs";

const MAXIMUM_ARTIFACT_BYTES = 64 * 1024;
const GITHUB_API = `https://api.github.com/repos/${ARTIFACT_SECURITY_REPOSITORY}`;
const REQUIRED_JOB_STEPS = Object.freeze({
  "Publish immutable image": Object.freeze([
    "Build and publish image",
    "Smoke published image runtime imports",
    "Scan published image",
    "Create artifact-security evidence",
    "Upload artifact-security evidence",
  ]),
  "Verify source and image": Object.freeze([
    "Run repository quality gate",
    "Scan locked production dependencies",
    "Build verification image",
    "Smoke verification image runtime imports",
    "Scan verification image",
  ]),
});

function check(id, status, detail) {
  return Object.freeze({ detail, id, status });
}

function artifactBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value ?? "");
  if (bytes.length === 0 || bytes.length > MAXIMUM_ARTIFACT_BYTES) {
    throw new Error("Artifact evidence must be a small non-empty JSON file.");
  }
  return bytes;
}

function parseArtifactDocument(bytes) {
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Artifact evidence must be valid JSON.");
  }
  if (
    !document ||
    typeof document !== "object" ||
    Array.isArray(document) ||
    document.schemaVersion !== ARTIFACT_SECURITY_SCHEMA_VERSION
  ) {
    throw new Error("Artifact evidence schema is unsupported.");
  }
  const producer = document.producer;
  if (
    producer?.repository !== ARTIFACT_SECURITY_REPOSITORY ||
    producer?.workflow !== ARTIFACT_SECURITY_WORKFLOW.name ||
    producer?.workflowPath !== ARTIFACT_SECURITY_WORKFLOW.path
  ) {
    throw new Error("Artifact evidence producer is not the accepted GoodGood workflow.");
  }
  const run = document.run;
  if (
    !run ||
    !/^[1-9]\d{0,19}$/.test(run.id ?? "") ||
    !Number.isSafeInteger(run.attempt) ||
    run.attempt < 1 ||
    !new Set(["push", "workflow_dispatch"]).has(run.event) ||
    run.headBranch !== "main" ||
    !/^[a-f0-9]{40}$/.test(run.headSha ?? "") ||
    run.htmlUrl !==
      `https://github.com/${ARTIFACT_SECURITY_REPOSITORY}/actions/runs/${run.id}`
  ) {
    throw new Error("Artifact evidence run identity is invalid.");
  }
  const release = document.release;
  if (
    !release ||
    !/^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(
      release.image ?? "",
    ) ||
    release.revision !== run.headSha ||
    !/^\d{4}_[a-z0-9_]+\.sql$/.test(release.migration ?? "") ||
    !/^[a-f0-9]{64}$/.test(release.runtimeConfigVersion ?? "")
  ) {
    throw new Error("Artifact evidence release identity is invalid.");
  }
  if (
    !document.verification ||
    Object.keys(document.verification).length !==
      ARTIFACT_SECURITY_VERIFICATIONS.length ||
    ARTIFACT_SECURITY_VERIFICATIONS.some(
      (name) => document.verification[name] !== "pass",
    )
  ) {
    throw new Error("Artifact evidence does not record every required CI verification.");
  }
  const completedAt = Date.parse(document.completedAt ?? "");
  if (!Number.isFinite(completedAt)) {
    throw new Error("Artifact evidence completedAt is invalid.");
  }
  return Object.freeze({ completedAt, document });
}

function candidateRelease(evidenceDocument, now) {
  const gate = runProductionReadinessGate(evidenceDocument, { now });
  if (
    gate.checks.find(({ id }) => id === "schema")?.status !== "pass" ||
    gate.checks.find(({ id }) => id === "release-identity")?.status !== "pass" ||
    gate.checks.some(({ id, status }) => id === "evidence-contract" && status === "fail") ||
    !gate.release
  ) {
    throw new Error("The production readiness manifest is malformed.");
  }
  return gate.release;
}

function verifyCandidate(release, artifact) {
  for (const name of ["image", "migration", "revision", "runtimeConfigVersion"]) {
    if (release[name] !== artifact.release[name]) {
      throw new Error("Artifact evidence does not match the production candidate.");
    }
  }
}

async function githubJson(pathname, { fetchImpl, githubToken }) {
  let response;
  try {
    response = await fetchImpl(`${GITHUB_API}${pathname}`, {
      headers: {
        accept: "application/vnd.github+json",
        ...(githubToken ? { authorization: `Bearer ${githubToken}` } : {}),
        "user-agent": "goodgood-production-evidence",
        "x-github-api-version": "2022-11-28",
      },
      redirect: "error",
    });
  } catch {
    throw new Error("GitHub evidence could not be retrieved.");
  }
  if (!response?.ok) {
    throw new Error("GitHub evidence could not be retrieved.");
  }
  try {
    return await response.json();
  } catch {
    throw new Error("GitHub returned malformed evidence.");
  }
}

function verifyRun(run, artifact, nowMs) {
  const completedAt = Date.parse(artifact.completedAt);
  const createdAt = Date.parse(run?.created_at ?? "");
  const updatedAt = Date.parse(run?.updated_at ?? "");
  if (
    String(run?.id) !== artifact.run.id ||
    run?.run_attempt !== artifact.run.attempt ||
    run?.repository?.full_name?.toLowerCase() !== ARTIFACT_SECURITY_REPOSITORY ||
    run?.name !== ARTIFACT_SECURITY_WORKFLOW.name ||
    run?.path !== ARTIFACT_SECURITY_WORKFLOW.path ||
    run?.status !== "completed" ||
    run?.conclusion !== "success" ||
    run?.event !== artifact.run.event ||
    run?.head_branch !== "main" ||
    run?.head_sha !== artifact.run.headSha ||
    run?.html_url !== artifact.run.htmlUrl ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(updatedAt) ||
    completedAt < createdAt ||
    completedAt > updatedAt + 5 * 60 * 1_000 ||
    completedAt > nowMs + 5 * 60 * 1_000
  ) {
    throw new Error("GitHub run does not prove the accepted completed main workflow.");
  }
}

function verifyJobs(document) {
  if (!Array.isArray(document?.jobs)) {
    throw new Error("GitHub job evidence is missing.");
  }
  for (const [jobName, requiredSteps] of Object.entries(REQUIRED_JOB_STEPS)) {
    const job = document.jobs.find(({ name }) => name === jobName);
    if (!job || job.status !== "completed" || job.conclusion !== "success") {
      throw new Error("A required GitHub job did not pass.");
    }
    for (const stepName of requiredSteps) {
      const step = job.steps?.find(({ name }) => name === stepName);
      if (!step || step.status !== "completed" || step.conclusion !== "success") {
        throw new Error("A required GitHub job step did not pass.");
      }
    }
  }
}

function verifyArtifact(document, artifactDocument, bytes) {
  if (!Array.isArray(document?.artifacts)) {
    throw new Error("GitHub artifact evidence is missing.");
  }
  const matching = document.artifacts.filter(
    ({ name }) => name === ARTIFACT_SECURITY_FILENAME,
  );
  const artifact = matching.length === 1 ? matching[0] : null;
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (
    !artifact ||
    artifact.expired !== false ||
    !Number.isSafeInteger(artifact.id) ||
    artifact.id < 1 ||
    artifact.digest !== digest ||
    artifact.size_in_bytes !== bytes.length ||
    String(artifact.workflow_run?.id) !== artifactDocument.run.id ||
    artifact.workflow_run?.head_branch !== "main" ||
    artifact.workflow_run?.head_sha !== artifactDocument.run.headSha
  ) {
    throw new Error("GitHub artifact bytes do not match the immutable workflow artifact.");
  }
  return Object.freeze({ digest, id: artifact.id });
}

export async function verifyArtifactSecurityEvidence({
  artifactFileBytes,
  evidenceDocument,
  fetchImpl = fetch,
  githubToken,
  now = () => Date.now(),
}) {
  const checks = [];
  const nowMs = now();
  if (!Number.isFinite(nowMs)) throw new Error("now must return epoch milliseconds.");

  let bytes;
  let artifact;
  try {
    bytes = artifactBytes(artifactFileBytes);
    ({ document: artifact } = parseArtifactDocument(bytes));
    checks.push(check("artifact-contract", "pass", "CI artifact schema and producer are valid."));
  } catch (error) {
    checks.push(
      check(
        "artifact-contract",
        "fail",
        error instanceof Error ? error.message : "CI artifact is invalid.",
      ),
    );
  }

  let release;
  if (artifact) {
    try {
      const candidate = candidateRelease(evidenceDocument, () => nowMs);
      verifyCandidate(candidate, artifact);
      release = candidate;
      checks.push(check("candidate-identity", "pass", "CI artifact matches the exact production candidate."));
    } catch (error) {
      checks.push(
        check(
          "candidate-identity",
          "fail",
          error instanceof Error ? error.message : "Candidate identity is invalid.",
        ),
      );
    }
  } else {
    checks.push(check("candidate-identity", "blocked", "Candidate checks require a valid CI artifact."));
  }

  let run;
  let jobs;
  let artifacts;
  if (release) {
    try {
      [run, jobs, artifacts] = await Promise.all([
        githubJson(`/actions/runs/${artifact.run.id}`, { fetchImpl, githubToken }),
        githubJson(`/actions/runs/${artifact.run.id}/jobs?filter=latest&per_page=100`, {
          fetchImpl,
          githubToken,
        }),
        githubJson(`/actions/runs/${artifact.run.id}/artifacts?per_page=100`, {
          fetchImpl,
          githubToken,
        }),
      ]);
      verifyRun(run, artifact, nowMs);
      checks.push(check("github-run", "pass", "GitHub confirms a successful main CI run."));
    } catch {
      checks.push(check("github-run", "fail", "GitHub could not confirm the accepted CI run."));
    }
  } else {
    checks.push(check("github-run", "blocked", "GitHub checks require matching candidate evidence."));
  }

  if (run) {
    try {
      verifyJobs(jobs);
      checks.push(check("github-jobs", "pass", "Required source, dependency, image, and publication jobs passed."));
    } catch {
      checks.push(check("github-jobs", "fail", "GitHub did not confirm every required CI verification."));
    }
  } else {
    checks.push(check("github-jobs", "blocked", "Job checks require a confirmed GitHub run."));
  }

  let githubArtifact;
  if (run && checks.at(-1)?.status === "pass") {
    try {
      githubArtifact = verifyArtifact(artifacts, artifact, bytes);
      checks.push(check("github-artifact-integrity", "pass", "Local evidence bytes match the immutable GitHub artifact digest."));
    } catch {
      checks.push(check("github-artifact-integrity", "fail", "GitHub did not confirm the artifact bytes and candidate identity."));
    }
  } else {
    checks.push(check("github-artifact-integrity", "blocked", "Artifact integrity requires confirmed CI jobs."));
  }

  const ok = checks.every(({ status }) => status === "pass");
  const evidence =
    ok && githubArtifact
      ? Object.freeze({
          checkedAt: artifact.completedAt,
          id: "artifact-security",
          reference: `github:run:${artifact.run.id}/artifact:${githubArtifact.id}`,
          releaseRevision: artifact.release.revision,
          status: "pass",
        })
      : null;
  return Object.freeze({
    checks: Object.freeze(checks),
    evidence,
    ok,
    provenance:
      ok && githubArtifact
        ? Object.freeze({
            artifactDigest: githubArtifact.digest,
            artifactId: githubArtifact.id,
            repository: ARTIFACT_SECURITY_REPOSITORY,
            runId: artifact.run.id,
          })
        : null,
    release: release ?? null,
    schemaVersion: ARTIFACT_SECURITY_SCHEMA_VERSION,
  });
}
