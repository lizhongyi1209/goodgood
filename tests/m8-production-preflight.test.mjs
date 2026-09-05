import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runProductionPreflight } from "../scripts/production-preflight-contract.mjs";
import {
  parseProductionPreflightArguments,
  verifyProductionPreflightFiles,
} from "../scripts/verify-production-preflight.mjs";

const AUTH_SECRET = "production-auth-secret-that-must-not-appear";
const GENERATION_SECRET = "production-generation-secret-that-must-not-appear";
const STORAGE_ACCESS_KEY = "production-storage-key-that-must-not-appear";
const STORAGE_SECRET = "production-storage-secret-that-must-not-appear";
const DATABASE_SECRET = "production-database-secret-that-must-not-appear";
const REVISION = "b".repeat(40);
const RUNTIME_VERSION = "c".repeat(64);
const IMAGE = `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`;
const ORIGIN = "https://create.goodgood.cn";
const ISSUER = "https://goodgood-production.authing.cn/oidc";

function serializeEnvironment(environment) {
  return `${Object.entries(environment)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n")}\n`;
}

function discovery(overrides = {}) {
  return {
    authorization_endpoint: `${ISSUER}/auth`,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
    id_token_signing_alg_values_supported: ["RS256"],
    issuer: ISSUER,
    jwks_uri: `${ISSUER}/jwks`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint: `${ISSUER}/token`,
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
    ...overrides,
  };
}

function discoveryFetch(document = discovery()) {
  return async () =>
    new Response(JSON.stringify(document), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
}

function repositoryEvidence(overrides = {}) {
  return {
    clean: true,
    imageName: "ghcr.io/lizhongyi1209/goodgood",
    migrationVersion: "0010_m6_payment_sandbox.sql",
    revision: REVISION,
    runtimeConfigVersion: RUNTIME_VERSION,
    ...overrides,
  };
}

function imageLabels(overrides = {}) {
  return {
    "com.goodgood.migration.version": "0010_m6_payment_sandbox.sql",
    "com.goodgood.runtime-config.version": RUNTIME_VERSION,
    "org.opencontainers.image.revision": REVISION,
    ...overrides,
  };
}

async function productionFixture(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "goodgood-production-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const releaseFile = path.join(directory, "release.env");
  const runtimeFile = path.join(directory, "runtime.env");
  const secretDirectory = path.join(directory, "secrets");
  const authSecretFile = path.join(secretDirectory, "auth-client-secret");
  const generationSecretFile = path.join(secretDirectory, "o1key-api-key");
  const storageAccessKeyFile = path.join(secretDirectory, "r2-access-key-id");
  const storageSecretFile = path.join(secretDirectory, "r2-secret-access-key");
  const secretGroupId = 12000;
  const release = {
    GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE: authSecretFile,
    GOODGOOD_GENERATION_API_KEY_SOURCE_FILE: generationSecretFile,
    GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE: storageAccessKeyFile,
    GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE: storageSecretFile,
    GOODGOOD_PRODUCTION_ORIGIN: ORIGIN,
    GOODGOOD_PRODUCTION_SECRET_GID: String(secretGroupId),
    GOODGOOD_RELEASE_IMAGE: IMAGE,
    GOODGOOD_RELEASE_MIGRATION: "0010_m6_payment_sandbox.sql",
    GOODGOOD_RELEASE_REVISION: REVISION,
    GOODGOOD_RUNTIME_CONFIG_VERSION: RUNTIME_VERSION,
    GOODGOOD_RUNTIME_ENV_FILE: runtimeFile,
  };
  const runtime = {
    DATABASE_URL: `postgresql://goodgood:${DATABASE_SECRET}@production-postgres:5432/goodgood`,
    GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
    GENERATION_API_KEY_FILE: "/run/secrets/goodgood_generation_api_key",
    GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
    GENERATION_PROVIDER_KIND: "o1key",
    GOODGOOD_ALLOW_LOCAL_AUTH: "false",
    GOODGOOD_AUTH_CLIENT_ID: "production-client-id",
    GOODGOOD_AUTH_CLIENT_SECRET_FILE:
      "/run/secrets/goodgood_auth_client_secret",
    GOODGOOD_AUTH_COOKIE_NAME: "__Host-goodgood_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "true",
    GOODGOOD_AUTH_ISSUER: ISSUER,
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: `${ORIGIN}/api/auth/callback`,
    GOODGOOD_FAKE_PAYMENT_ENABLED: "false",
    NODE_ENV: "production",
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE:
      "/run/secrets/goodgood_object_storage_access_key_id",
    OBJECT_STORAGE_BUCKET: "goodgood-production",
    OBJECT_STORAGE_ENDPOINT:
      "https://production-account.r2.cloudflarestorage.com",
    OBJECT_STORAGE_FORCE_PATH_STYLE: "true",
    OBJECT_STORAGE_PROVISIONING_MODE: "verify",
    OBJECT_STORAGE_PROVIDER_KIND: "r2",
    OBJECT_STORAGE_PUBLIC_ENDPOINT:
      "https://production-account.r2.cloudflarestorage.com",
    OBJECT_STORAGE_REGION: "auto",
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE:
      "/run/secrets/goodgood_object_storage_secret_access_key",
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: ORIGIN,
    REDIS_URL: "redis://production-valkey:6379",
  };
  await mkdir(secretDirectory, { recursive: true });
  await Promise.all([
    writeFile(authSecretFile, `${AUTH_SECRET}\n`),
    writeFile(generationSecretFile, `${GENERATION_SECRET}\n`),
    writeFile(storageAccessKeyFile, `${STORAGE_ACCESS_KEY}\n`),
    writeFile(storageSecretFile, `${STORAGE_SECRET}\n`),
    writeFile(releaseFile, serializeEnvironment(release)),
    writeFile(runtimeFile, serializeEnvironment(runtime)),
  ]);
  const inputFiles = new Set([releaseFile, runtimeFile]);
  const lstatImpl = (filePath) => ({
    gid: inputFiles.has(filePath) ? 0 : secretGroupId,
    isFile: () => true,
    isSymbolicLink: () => false,
    mode: inputFiles.has(filePath) ? 0o100600 : 0o100640,
    size: 128,
    uid: 0,
  });
  return {
    lstatImpl,
    productionRoot: directory,
    release,
    releaseFile,
    runtime,
    runtimeFile,
  };
}

async function runFixture(fixture, overrides = {}) {
  return runProductionPreflight({
    checkedAt: () => new Date("2026-09-05T01:00:00.000Z"),
    evidenceReference: "preflight:ci-run-24",
    fetchImpl: discoveryFetch(),
    imageLabels: imageLabels(),
    lstatImpl: fixture.lstatImpl,
    platform: "linux",
    productionRoot: fixture.productionRoot,
    releaseEnvironment: fixture.release,
    releaseFilePath: fixture.releaseFile,
    repositoryEvidence: repositoryEvidence(),
    runtimeEnvironment: fixture.runtime,
    runtimeFilePath: fixture.runtimeFile,
    ...overrides,
  });
}

test("production preflight emits one exact-candidate evidence item without secrets", async (context) => {
  const fixture = await productionFixture(context);
  const report = await verifyProductionPreflightFiles({
    evidenceReference: "preflight:ci-run-24",
    fetchImpl: discoveryFetch(),
    imageLabelsFor: async () => imageLabels(),
    lstatImpl: fixture.lstatImpl,
    platform: "linux",
    productionRoot: fixture.productionRoot,
    releaseFile: fixture.releaseFile,
    repositoryEvidenceFor: async () => repositoryEvidence(),
    runtimeFile: fixture.runtimeFile,
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.evidence, {
    checkedAt: report.evidence.checkedAt,
    id: "production-preflight",
    reference: "preflight:ci-run-24",
    releaseRevision: REVISION,
    status: "pass",
  });
  assert.equal(report.release.image, IMAGE);
  assert.ok(report.checks.every(({ status }) => status === "pass"));
  const serialized = JSON.stringify(report);
  for (const secret of [
    AUTH_SECRET,
    GENERATION_SECRET,
    STORAGE_ACCESS_KEY,
    STORAGE_SECRET,
    DATABASE_SECRET,
  ]) {
    assert.doesNotMatch(serialized, new RegExp(secret));
  }
  assert.doesNotMatch(serialized, /DATABASE_URL|REDIS_URL|CLIENT_ID/);
});

test("production preflight rejects dirty source and mismatched image labels", async (context) => {
  const fixture = await productionFixture(context);
  const report = await runFixture(fixture, {
    imageLabels: imageLabels({
      "org.opencontainers.image.revision": "d".repeat(40),
    }),
    repositoryEvidence: repositoryEvidence({ clean: false }),
  });

  assert.equal(report.ok, false);
  assert.equal(report.evidence, null);
  assert.equal(
    report.checks.find(({ id }) => id === "source-identity").status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "image-labels").status,
    "fail",
  );
});

test("production preflight rejects a mutable image before Docker inspection", async (context) => {
  const fixture = await productionFixture(context);
  fixture.release.GOODGOOD_RELEASE_IMAGE =
    "ghcr.io/lizhongyi1209/goodgood:latest";
  await writeFile(
    fixture.releaseFile,
    serializeEnvironment(fixture.release),
  );
  let inspected = false;
  const report = await verifyProductionPreflightFiles({
    evidenceReference: "preflight:ci-run-24",
    fetchImpl: discoveryFetch(),
    imageLabelsFor: async () => {
      inspected = true;
      return imageLabels();
    },
    lstatImpl: fixture.lstatImpl,
    platform: "linux",
    productionRoot: fixture.productionRoot,
    releaseFile: fixture.releaseFile,
    repositoryEvidenceFor: async () => repositoryEvidence(),
    runtimeFile: fixture.runtimeFile,
  });

  assert.equal(inspected, false);
  assert.equal(report.ok, false);
  assert.equal(report.evidence, null);
  assert.equal(
    report.checks.find(({ id }) => id === "release-identity").status,
    "fail",
  );
});

test("production preflight blocks unsafe runtime modes and inline credentials", async (context) => {
  const fixture = await productionFixture(context);
  for (const runtimeEnvironment of [
    { ...fixture.runtime, GOODGOOD_FAKE_PAYMENT_ENABLED: "true" },
    { ...fixture.runtime, GENERATION_API_KEY: GENERATION_SECRET },
    {
      ...fixture.runtime,
      GOODGOOD_ALLOW_LOCAL_AUTH: "true",
      GOODGOOD_AUTH_MODE: "local",
      GOODGOOD_LOCAL_AUTH_TOKENS: `${GENERATION_SECRET}=subject`,
    },
    { ...fixture.runtime, OBJECT_STORAGE_ENDPOINT: "https://storage.example.com" },
    { ...fixture.runtime, REDIS_URL: "redis://127.0.0.1:6379" },
  ]) {
    const report = await runFixture(fixture, { runtimeEnvironment });
    assert.equal(report.ok, false);
    assert.equal(report.evidence, null);
    assert.equal(
      report.checks.find(({ id }) => id === "runtime-configuration").status,
      "fail",
    );
    assert.doesNotMatch(JSON.stringify(report), new RegExp(GENERATION_SECRET));
  }
});

test("production preflight requires Linux root-owned non-symlink inputs", async (context) => {
  const fixture = await productionFixture(context);
  const windows = await runFixture(fixture, { platform: "win32" });
  assert.equal(windows.ok, false);
  assert.equal(
    windows.checks.find(({ id }) => id === "production-host").status,
    "fail",
  );
  assert.equal(
    windows.checks.find(({ id }) => id === "host-file-security").status,
    "blocked",
  );

  const symlink = await runFixture(fixture, {
    lstatImpl: () => ({
      gid: 0,
      isFile: () => true,
      isSymbolicLink: () => true,
      mode: 0o100600,
      size: 128,
      uid: 0,
    }),
  });
  assert.equal(symlink.ok, false);
  assert.equal(
    symlink.checks.find(({ id }) => id === "host-file-security").status,
    "fail",
  );
});

test("production preflight requires live OIDC discovery and a safe evidence reference", async (context) => {
  const fixture = await productionFixture(context);
  const report = await runFixture(fixture, {
    evidenceReference: "https://evidence.invalid/item?token=secret",
    fetchImpl: async () => {
      throw new Error("network detail must not be reported");
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.evidence, null);
  assert.equal(
    report.checks.find(({ id }) => id === "authentication:oidc-discovery")
      .status,
    "fail",
  );
  assert.equal(
    report.checks.find(({ id }) => id === "evidence-reference").status,
    "fail",
  );
  assert.doesNotMatch(JSON.stringify(report), /network detail|token=secret/);
});

test("production preflight CLI and release metadata include the new contract", async () => {
  assert.deepEqual(
    parseProductionPreflightArguments([
      "--release-file",
      "release.env",
      "--runtime-env-file",
      "runtime.env",
      "--evidence-reference",
      "preflight:ci-run-24",
    ]),
    {
      evidenceReference: "preflight:ci-run-24",
      releaseFile: path.resolve("release.env"),
      runtimeFile: path.resolve("runtime.env"),
    },
  );
  assert.throws(() => parseProductionPreflightArguments([]), /are required/);
  assert.throws(
    () => parseProductionPreflightArguments(["--bypass", "true"]),
    /Unknown production preflight argument/,
  );

  const [packageJson, releaseMetadata, gitIgnore, dockerIgnore] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    readFile(new URL("../.dockerignore", import.meta.url), "utf8"),
  ]);
  assert.equal(
    JSON.parse(packageJson).scripts["production:preflight"],
    "node scripts/verify-production-preflight.mjs",
  );
  for (const relativePath of [
    "infra/production/release.env.example",
    "infra/production/runtime.env.example",
    "scripts/production-preflight-contract.mjs",
    "scripts/verify-production-preflight.mjs",
  ]) {
    assert.match(releaseMetadata, new RegExp(JSON.stringify(relativePath)));
  }
  assert.match(gitIgnore, /infra\/production\/\*\.env/);
  assert.match(gitIgnore, /infra\/production\/secrets/);
  assert.match(dockerIgnore, /infra\/production\/\*\.env/);
  assert.match(dockerIgnore, /infra\/production\/secrets/);
  assert.match(releaseMetadata, /"\.dockerignore"/);
});
