import { createHash } from "node:crypto";
import { appendFile, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CONFIG_CONTRACT_FILES = [
  ".dockerignore",
  ".env.example",
  "Dockerfile",
  "compose.yaml",
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
  "scripts/build-runtime.mjs",
  "scripts/production-preflight-contract.mjs",
  "scripts/verify-production-preflight.mjs",
  "scripts/run-staging-release.mjs",
  "scripts/staging-contract.mjs",
  "scripts/verify-staging.mjs",
];

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    hash.update(await readFile(resolve(root, relativePath)));
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
