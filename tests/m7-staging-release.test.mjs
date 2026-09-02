import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseEnvironmentFile,
  runStagingPreflight,
  STAGING_AUTH_SECRET_PATH,
  STAGING_GENERATION_SECRET_PATH,
} from "../scripts/staging-contract.mjs";
import {
  createReleasePlan,
  executeRelease,
  parseReleaseArguments,
  verifyReleaseImageLabels,
} from "../scripts/run-staging-release.mjs";
import { verifyStagingFiles } from "../scripts/verify-staging.mjs";

const AUTH_SECRET = "auth-secret-that-must-never-be-reported";
const GENERATION_SECRET = "generation-secret-that-must-never-be-reported";

async function stagingFixture(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "goodgood-staging-"));
  context.after(async () => {
    await import("node:fs/promises").then(({ rm }) =>
      rm(directory, { force: true, recursive: true }),
    );
  });
  const authSecretFile = path.join(directory, "auth-secret");
  const generationSecretFile = path.join(directory, "generation-secret");
  const releaseFile = path.join(directory, "release.env");
  const runtimeFile = path.join(directory, "runtime.env");
  await Promise.all([
    writeFile(authSecretFile, `${AUTH_SECRET}\n`, { mode: 0o600 }),
    writeFile(generationSecretFile, `${GENERATION_SECRET}\n`, { mode: 0o600 }),
  ]);

  const release = {
    GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE: authSecretFile,
    GOODGOOD_GENERATION_API_KEY_SOURCE_FILE: generationSecretFile,
    GOODGOOD_RELEASE_IMAGE: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
    GOODGOOD_RELEASE_MIGRATION: "0010_m6_payment_sandbox.sql",
    GOODGOOD_RELEASE_REVISION: "b".repeat(40),
    GOODGOOD_RUNTIME_CONFIG_VERSION: "c".repeat(64),
    GOODGOOD_RUNTIME_ENV_FILE: runtimeFile,
  };
  const runtime = {
    DATABASE_URL:
      "postgresql://goodgood:database-secret@staging-postgres:5432/goodgood",
    GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
    GENERATION_API_KEY_FILE: STAGING_GENERATION_SECRET_PATH,
    GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
    GENERATION_PROVIDER_KIND: "o1key",
    GOODGOOD_ALLOW_LOCAL_AUTH: "false",
    GOODGOOD_AUTH_CLIENT_ID: "staging-client-id",
    GOODGOOD_AUTH_CLIENT_SECRET_FILE: STAGING_AUTH_SECRET_PATH,
    GOODGOOD_AUTH_COOKIE_NAME: "__Host-goodgood_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "true",
    GOODGOOD_AUTH_ISSUER: "https://tenant.authing.cn/oidc",
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI:
      "https://staging.goodgood.test/api/auth/callback",
    GOODGOOD_FAKE_PAYMENT_ENABLED: "false",
    NODE_ENV: "production",
    OBJECT_STORAGE_ACCESS_KEY_ID: "staging-access-key",
    OBJECT_STORAGE_BUCKET: "goodgood-staging-test-data",
    OBJECT_STORAGE_ENDPOINT: "https://private-s3.goodgood.test",
    OBJECT_STORAGE_FORCE_PATH_STYLE: "false",
    OBJECT_STORAGE_PUBLIC_ENDPOINT: "https://assets.goodgood.test",
    OBJECT_STORAGE_REGION: "ap-east-1",
    OBJECT_STORAGE_SECRET_ACCESS_KEY: "storage-secret",
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: "https://staging.goodgood.test",
    REDIS_URL: "redis://staging-valkey:6379",
  };

  const serialize = (environment) =>
    `${Object.entries(environment)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`;
  await Promise.all([
    writeFile(releaseFile, serialize(release), { mode: 0o600 }),
    writeFile(runtimeFile, serialize(runtime), { mode: 0o600 }),
  ]);
  return { release, releaseFile, runtime, runtimeFile };
}

test("staging preflight accepts the production contract without reporting secrets", async (context) => {
  const fixture = await stagingFixture(context);
  const report = runStagingPreflight({
    releaseEnvironment: fixture.release,
    runtimeEnvironment: fixture.runtime,
    runtimeFilePath: fixture.runtimeFile,
  });

  assert.equal(report.ok, true);
  assert.deepEqual(
    report.checks.map(({ id, status }) => ({ id, status })),
    [
      { id: "release-identity", status: "pass" },
      { id: "runtime-configuration", status: "pass" },
    ],
  );
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /database-secret|storage-secret/);
  assert.equal(serialized.includes(AUTH_SECRET), false);
  assert.equal(serialized.includes(GENERATION_SECRET), false);

  const fileReport = await verifyStagingFiles({
    releaseFile: fixture.releaseFile,
    runtimeFile: fixture.runtimeFile,
  });
  assert.equal(fileReport.ok, true);
  assert.equal(fileReport.authentication, null);
});

test("staging preflight fails closed for empty, mutable, local, and inline-secret configuration", async (context) => {
  const fixture = await stagingFixture(context);
  const empty = runStagingPreflight({
    releaseEnvironment: {},
    runtimeEnvironment: {},
    runtimeFilePath: fixture.runtimeFile,
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.checks[0].status, "fail");
  assert.equal(empty.checks[1].status, "blocked");

  const mutable = runStagingPreflight({
    releaseEnvironment: {
      ...fixture.release,
      GOODGOOD_RELEASE_IMAGE: "ghcr.io/lizhongyi1209/goodgood:latest",
    },
    runtimeEnvironment: fixture.runtime,
    runtimeFilePath: fixture.runtimeFile,
  });
  assert.equal(mutable.ok, false);
  assert.match(mutable.checks[0].detail, /pinned by sha256 digest/);

  for (const unsafeRuntime of [
    {
      ...fixture.runtime,
      GENERATION_API_KEY: "inline-generation-secret",
    },
    {
      ...fixture.runtime,
      GOODGOOD_AUTH_CLIENT_SECRET: "inline-auth-secret",
    },
    {
      ...fixture.runtime,
      GOODGOOD_ALLOW_LOCAL_AUTH: "true",
      GOODGOOD_AUTH_MODE: "local",
    },
    {
      ...fixture.runtime,
      GOODGOOD_FAKE_PAYMENT_ENABLED: "true",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_PUBLIC_ENDPOINT: "http://127.0.0.1:9000",
    },
    {
      ...fixture.runtime,
      GENERATION_API_BASE_URL:
        "https://embedded:credential@cf-api.o1key.com",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_REGION: "REPLACE_ME",
    },
  ]) {
    const report = runStagingPreflight({
      releaseEnvironment: fixture.release,
      runtimeEnvironment: unsafeRuntime,
      runtimeFilePath: fixture.runtimeFile,
    });
    assert.equal(report.ok, false);
    assert.equal(report.checks[1].status, "fail");
  }
});

test("staging environment parser rejects malformed and duplicate entries", () => {
  assert.deepEqual(parseEnvironmentFile("# comment\nA=one=two\nB='three'\n"), {
    A: "one=two",
    B: "three",
  });
  assert.throws(() => parseEnvironmentFile("NOT AN ENTRY\n"), /KEY=value/);
  assert.throws(() => parseEnvironmentFile("A=one\nA=two\n"), /duplicates A/);
});

test("release plans migrate only forward deploys and pin rollback to its supplied digest", async (context) => {
  const fixture = await stagingFixture(context);
  const deploy = createReleasePlan({
    action: "deploy",
    releaseFile: fixture.releaseFile,
    runtimeFile: fixture.runtimeFile,
  });
  const rollback = createReleasePlan({
    action: "rollback",
    releaseFile: fixture.releaseFile,
    runtimeFile: fixture.runtimeFile,
  });

  assert.equal(deploy.image, fixture.release.GOODGOOD_RELEASE_IMAGE);
  assert.equal(deploy.migrationMode, "forward-migrate-before-start");
  assert.equal(deploy.steps.some(({ display }) => display.includes("run --rm migrate")), true);
  assert.equal(rollback.migrationMode, "no-schema-rollback");
  assert.equal(
    rollback.steps.some(({ display }) => display.includes("run --rm migrate")),
    false,
  );
  assert.equal(
    rollback.steps.every(({ display }) => !display.includes(":latest")),
    true,
  );

  const dryRun = await executeRelease({
    action: "deploy",
    execute: false,
    network: false,
    releaseFile: fixture.releaseFile,
    runtimeFile: fixture.runtimeFile,
  });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.executed, false);
  assert.equal(JSON.stringify(dryRun).includes(AUTH_SECRET), false);
  assert.equal(JSON.stringify(dryRun).includes(GENERATION_SECRET), false);

  assert.deepEqual(
    parseReleaseArguments([
      "deploy",
      "--release-file",
      fixture.releaseFile,
      "--runtime-env-file",
      fixture.runtimeFile,
    ]),
    {
      action: "deploy",
      execute: false,
      network: false,
      releaseFile: fixture.releaseFile,
      runtimeFile: fixture.runtimeFile,
    },
  );
});

test("pulled image labels must exactly match the release evidence", async (context) => {
  const fixture = await stagingFixture(context);
  const labels = {
    "com.goodgood.migration.version": fixture.release.GOODGOOD_RELEASE_MIGRATION,
    "com.goodgood.runtime-config.version":
      fixture.release.GOODGOOD_RUNTIME_CONFIG_VERSION,
    "org.opencontainers.image.revision": fixture.release.GOODGOOD_RELEASE_REVISION,
  };
  assert.equal(verifyReleaseImageLabels(labels, fixture.release), true);
  assert.throws(
    () =>
      verifyReleaseImageLabels(
        { ...labels, "org.opencontainers.image.revision": "d".repeat(40) },
        fixture.release,
      ),
    /org\.opencontainers\.image\.revision/,
  );
});

test("staging Compose has no build, local auth, mock provider, or fake payment defaults", async () => {
  const [compose, dockerIgnore, gitIgnore, packageJson, releaseMetadata] =
    await Promise.all([
      readFile(new URL("../compose.staging.yaml", import.meta.url), "utf8"),
      readFile(new URL("../.dockerignore", import.meta.url), "utf8"),
      readFile(new URL("../.gitignore", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    ]);
  const scripts = JSON.parse(packageJson).scripts;
  assert.match(compose, /image: \$\{GOODGOOD_RELEASE_IMAGE:\?/);
  assert.doesNotMatch(compose, /^\s*build:/m);
  assert.doesNotMatch(compose, /GOODGOOD_ALLOW_LOCAL_AUTH|mock-generation/);
  assert.doesNotMatch(compose, /GOODGOOD_FAKE_PAYMENT_ENABLED/);
  assert.match(compose, /127\.0\.0\.1:\$\{GOODGOOD_STAGING_WEB_PORT/);
  assert.match(compose, /goodgood_auth_client_secret:/);
  assert.match(compose, /goodgood_generation_api_key:/);
  for (const ignore of [dockerIgnore, gitIgnore]) {
    assert.match(ignore, /infra\/staging\/\*\.env/);
    assert.match(ignore, /infra\/staging\/secrets/);
  }
  assert.equal(scripts["staging:preflight"], "node scripts/verify-staging.mjs");
  assert.equal(
    scripts["staging:release"],
    "node scripts/run-staging-release.mjs",
  );
  assert.match(releaseMetadata, /"compose\.staging\.yaml"/);
  assert.match(releaseMetadata, /"infra\/staging\/runtime\.env\.example"/);
});
