import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ARTIFACT_SECURITY_SCHEMA_VERSION = 1;
export const ARTIFACT_SECURITY_FILENAME = "artifact-security-evidence.json";
export const ARTIFACT_SECURITY_REPOSITORY = "lizhongyi1209/goodgood";
export const ARTIFACT_SECURITY_WORKFLOW = Object.freeze({
  name: "CI",
  path: ".github/workflows/ci.yml",
});
export const ARTIFACT_SECURITY_VERIFICATIONS = Object.freeze([
  "repositoryQualityGate",
  "lockedDependencyScan",
  "verificationImageRuntimeSmoke",
  "verificationImageScan",
  "immutableImagePublication",
  "publishedImageRuntimeSmoke",
  "publishedImageScan",
]);

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function required(value, name, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function createArtifactSecurityEvidence({
  completedAt = new Date(),
  image,
  migration,
  revision,
  runAttempt,
  runEvent,
  runId,
  runtimeConfigVersion,
}) {
  if (!(completedAt instanceof Date) || !Number.isFinite(completedAt.getTime())) {
    throw new Error("completedAt must be a valid Date.");
  }
  required(
    image,
    "image",
    /^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/,
  );
  required(revision, "revision", /^[a-f0-9]{40}$/);
  required(migration, "migration", /^\d{4}_[a-z0-9_]+\.sql$/);
  required(runtimeConfigVersion, "runtimeConfigVersion", /^[a-f0-9]{64}$/);
  required(String(runId), "runId", /^[1-9]\d{0,19}$/);
  const attempt = Number(runAttempt);
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new Error("runAttempt is invalid.");
  }
  if (!new Set(["push", "workflow_dispatch"]).has(runEvent)) {
    throw new Error("runEvent is invalid.");
  }

  return Object.freeze({
    completedAt: completedAt.toISOString(),
    producer: Object.freeze({
      repository: ARTIFACT_SECURITY_REPOSITORY,
      workflow: ARTIFACT_SECURITY_WORKFLOW.name,
      workflowPath: ARTIFACT_SECURITY_WORKFLOW.path,
    }),
    release: Object.freeze({
      image,
      migration,
      revision,
      runtimeConfigVersion,
    }),
    run: Object.freeze({
      attempt,
      event: runEvent,
      headBranch: "main",
      headSha: revision,
      htmlUrl: `https://github.com/${ARTIFACT_SECURITY_REPOSITORY}/actions/runs/${runId}`,
      id: String(runId),
    }),
    schemaVersion: ARTIFACT_SECURITY_SCHEMA_VERSION,
    verification: Object.freeze(
      Object.fromEntries(
        ARTIFACT_SECURITY_VERIFICATIONS.map((name) => [name, "pass"]),
      ),
    ),
  });
}

export async function writeArtifactSecurityEvidence({
  document,
  outputFile = path.resolve(repositoryRoot, "work", ARTIFACT_SECURITY_FILENAME),
}) {
  await mkdir(path.dirname(outputFile), { recursive: true });
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  await writeFile(outputFile, serialized, { encoding: "utf8", mode: 0o600 });
  return Object.freeze({ bytes: Buffer.byteLength(serialized), outputFile });
}

async function main() {
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.GITHUB_REPOSITORY !== ARTIFACT_SECURITY_REPOSITORY ||
    process.env.GITHUB_WORKFLOW !== ARTIFACT_SECURITY_WORKFLOW.name ||
    process.env.GITHUB_REF !== "refs/heads/main"
  ) {
    throw new Error("Artifact-security evidence may be created only by GoodGood main CI.");
  }
  const document = createArtifactSecurityEvidence({
    image: process.env.GOODGOOD_RELEASE_IMAGE,
    migration: process.env.GOODGOOD_RELEASE_MIGRATION,
    revision: process.env.GITHUB_SHA,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    runEvent: process.env.GITHUB_EVENT_NAME,
    runId: process.env.GITHUB_RUN_ID,
    runtimeConfigVersion: process.env.GOODGOOD_RUNTIME_CONFIG_VERSION,
  });
  await writeArtifactSecurityEvidence({ document });
  process.stdout.write("Artifact-security evidence is ready for immutable upload.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    process.stderr.write("Artifact-security evidence creation failed.\n");
    process.exitCode = 1;
  }
}
