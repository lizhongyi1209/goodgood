import { createHash } from "node:crypto";
import { appendFile, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CONFIG_CONTRACT_FILES = [
  ".dockerignore",
  ".env.example",
  "Dockerfile",
  "compose.yaml",
  "compose.production.yaml",
  "compose.production.dependencies.yaml",
  "compose.staging.yaml",
  "compose.staging.dependencies.yaml",
  "compose.authing-local.yaml",
  "compose.o1key-local.yaml",
  "infra/staging/release.env.example",
  "infra/staging/runtime.env.example",
  "infra/staging/install-staging-dependencies.sh",
  "infra/staging/install-postgres-backup-automation.sh",
  "infra/staging/install-nginx-origin.sh",
  "infra/staging/postgres-backup-automated.sh",
  "infra/staging/postgres-backup-restore.sh",
  "infra/staging/postgres-backup.env.example",
  "infra/staging/nginx/cloudflare-origin-only.conf",
  "infra/staging/nginx/goodgood.conf",
  "infra/staging/systemd/goodgood-postgres-backup.service",
  "infra/staging/systemd/goodgood-postgres-backup.timer",
  "infra/production/release.env.example",
  "infra/production/runtime.env.example",
  "infra/production/CONVERSION_RUNBOOK.md",
  "infra/production/conversion-manifest.example.json",
  "infra/production/maintenance/index.html",
  "infra/production/maintenance-control.sh",
  "infra/production/nginx/active-upstream.blue.example.conf",
  "infra/production/nginx/active-upstream.green.example.conf",
  "infra/production/nginx/cloudflare-origin-only.conf",
  "infra/production/nginx/goodgood.conf",
  "infra/production/postgres-backup.env.example",
  "infra/production/postgres-backup-automated.sh",
  "infra/production/postgres-backup-restore.sh",
  "infra/production/r2-inventory.env.example",
  "infra/production/slots/blue.env",
  "infra/production/slots/green.env",
  "infra/production/systemd/goodgood-production-postgres-backup.service",
  "infra/production/systemd/goodgood-production-postgres-backup.timer",
  "infra/production/systemd/goodgood-production-postgres-maintenance.service",
  "infra/production/systemd/goodgood-production-postgres-maintenance.timer",
  "scripts/artifact-security-contract.mjs",
  "scripts/artifact-security-evidence.mjs",
  "scripts/import-artifact-security-evidence.mjs",
  "scripts/build-runtime.mjs",
  "scripts/production-preflight-contract.mjs",
  "scripts/production-conversion-contract.mjs",
  "scripts/production-work-package-contract.mjs",
  "scripts/production-readiness-contract.mjs",
  "scripts/production-infrastructure-profile.mjs",
  "scripts/production-runtime-adapter.mjs",
  "scripts/run-production-release.mjs",
  "scripts/run-seed-production-release.mjs",
  "scripts/run-production-conversion.mjs",
  "scripts/run-production-r2-deletion-plan.mjs",
  "scripts/run-production-work-package.mjs",
  "scripts/verify-production-preflight.mjs",
  "scripts/verify-production-readiness.mjs",
  "scripts/verify-seed-production-readiness.mjs",
  "scripts/run-staging-release.mjs",
  "scripts/staging-contract.mjs",
  "scripts/verify-staging.mjs",
  "server/generation/concurrent-job-runner.mjs",
  "server/generation/r2-inventory-contract.mjs",
  "server/runtime/host-resource-admission.mjs",
  "server/runtime/r2-inventory.mjs",
];

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function normalizeReleaseContractBytes(contents) {
  return Buffer.from(contents.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
}

function releaseRepository(value) {
  const repository = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?\/[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/.test(repository)) {
    throw new Error("GOODGOOD_RELEASE_REPOSITORY must be an owner/repository name.");
  }
  return repository;
}

export async function deriveReleaseMetadata({
  repository,
  root = repositoryRoot,
} = {}) {
  const migrations = (await readdir(resolve(root, "migrations")))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const migrationVersion = migrations.at(-1);
  if (!migrationVersion) throw new Error("No versioned SQL migration was found.");

  const hash = createHash("sha256");
  for (const relativePath of CONFIG_CONTRACT_FILES) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(
      normalizeReleaseContractBytes(await readFile(resolve(root, relativePath))),
    );
    hash.update("\0");
  }

  return {
    imageName: `ghcr.io/${releaseRepository(repository)}`,
    migrationVersion,
    runtimeConfigVersion: hash.digest("hex"),
  };
}

export function githubOutput(metadata) {
  return [
    `image-name=${metadata.imageName}`,
    `migration-version=${metadata.migrationVersion}`,
    `runtime-config-version=${metadata.runtimeConfigVersion}`,
    "",
  ].join("\n");
}

async function main() {
  if (
    process.argv.length !== 3 ||
    process.argv[2] !== "--github-output" ||
    !process.env.GITHUB_OUTPUT
  ) {
    throw new Error("Use --github-output inside GitHub Actions.");
  }
  const metadata = await deriveReleaseMetadata({
    repository: process.env.GOODGOOD_RELEASE_REPOSITORY,
  });
  await appendFile(process.env.GITHUB_OUTPUT, githubOutput(metadata), "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
