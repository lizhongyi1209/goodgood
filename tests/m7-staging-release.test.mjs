import assert from "node:assert/strict";
import { chmod, chown, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  parseEnvironmentFile,
  runStagingPreflight,
  STAGING_APPLICATION_ORIGIN,
  STAGING_AUTH_SECRET_PATH,
  STAGING_GENERATION_SECRET_PATH,
  STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH,
  STAGING_OBJECT_STORAGE_SECRET_KEY_PATH,
  STAGING_R2_ENDPOINT,
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
const STORAGE_ACCESS_KEY = "storage-access-key-that-must-never-be-reported";
const STORAGE_SECRET_KEY = "storage-secret-key-that-must-never-be-reported";

async function stagingFixture(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "goodgood-staging-"));
  context.after(async () => {
    await import("node:fs/promises").then(({ rm }) =>
      rm(directory, { force: true, recursive: true }),
    );
  });
  const authSecretFile = path.join(directory, "auth-secret");
  const generationSecretFile = path.join(directory, "generation-secret");
  const storageAccessKeyFile = path.join(directory, "storage-access-key");
  const storageSecretKeyFile = path.join(directory, "storage-secret-key");
  const releaseFile = path.join(directory, "release.env");
  const runtimeFile = path.join(directory, "runtime.env");
  const secretGroupId =
    process.platform === "win32"
      ? 11000
      : process.getgid() === 0
        ? 11000
        : process.getgid();
  await Promise.all([
    writeFile(authSecretFile, `${AUTH_SECRET}\n`, { mode: 0o640 }),
    writeFile(generationSecretFile, `${GENERATION_SECRET}\n`, { mode: 0o640 }),
    writeFile(storageAccessKeyFile, `${STORAGE_ACCESS_KEY}\n`, { mode: 0o640 }),
    writeFile(storageSecretKeyFile, `${STORAGE_SECRET_KEY}\n`, { mode: 0o640 }),
  ]);
  if (process.platform !== "win32" && process.getgid() === 0) {
    await Promise.all(
      [
        authSecretFile,
        generationSecretFile,
        storageAccessKeyFile,
        storageSecretKeyFile,
      ].map((file) => chown(file, process.getuid(), secretGroupId)),
    );
  }

  const release = {
    GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE: authSecretFile,
    GOODGOOD_GENERATION_API_KEY_SOURCE_FILE: generationSecretFile,
    GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE: storageAccessKeyFile,
    GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE: storageSecretKeyFile,
    GOODGOOD_RELEASE_IMAGE: `ghcr.io/lizhongyi1209/goodgood@sha256:${"a".repeat(64)}`,
    GOODGOOD_RELEASE_MIGRATION: "0010_m6_payment_sandbox.sql",
    GOODGOOD_RELEASE_REVISION: "b".repeat(40),
    GOODGOOD_RUNTIME_CONFIG_VERSION: "c".repeat(64),
    GOODGOOD_RUNTIME_ENV_FILE: runtimeFile,
    GOODGOOD_STAGING_SECRET_GID: String(secretGroupId),
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
      `${STAGING_APPLICATION_ORIGIN}/api/auth/callback`,
    GOODGOOD_FAKE_PAYMENT_ENABLED: "false",
    NODE_ENV: "production",
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE: STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH,
    OBJECT_STORAGE_BUCKET: "goodgood",
    OBJECT_STORAGE_ENDPOINT: STAGING_R2_ENDPOINT,
    OBJECT_STORAGE_FORCE_PATH_STYLE: "true",
    OBJECT_STORAGE_PROVISIONING_MODE: "verify",
    OBJECT_STORAGE_PROVIDER_KIND: "r2",
    OBJECT_STORAGE_PUBLIC_ENDPOINT: STAGING_R2_ENDPOINT,
    OBJECT_STORAGE_REGION: "auto",
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE: STAGING_OBJECT_STORAGE_SECRET_KEY_PATH,
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: STAGING_APPLICATION_ORIGIN,
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
  assert.equal(serialized.includes(STORAGE_ACCESS_KEY), false);
  assert.equal(serialized.includes(STORAGE_SECRET_KEY), false);

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

  const invalidSecretGroup = runStagingPreflight({
    releaseEnvironment: {
      ...fixture.release,
      GOODGOOD_STAGING_SECRET_GID: "not-a-gid",
    },
    runtimeEnvironment: fixture.runtime,
    runtimeFilePath: fixture.runtimeFile,
  });
  assert.equal(invalidSecretGroup.ok, false);
  assert.match(invalidSecretGroup.checks[0].detail, /positive numeric GID/);

  if (process.platform !== "win32") {
    await chmod(fixture.release.GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE, 0o600);
    const ownerOnlySecret = runStagingPreflight({
      releaseEnvironment: fixture.release,
      runtimeEnvironment: fixture.runtime,
      runtimeFilePath: fixture.runtimeFile,
    });
    assert.equal(ownerOnlySecret.ok, false);
    assert.match(ownerOnlySecret.checks[0].detail, /0640/);
    await chmod(fixture.release.GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE, 0o640);
  }

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
      OBJECT_STORAGE_ACCESS_KEY_ID: "inline-storage-access-key",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_SECRET_ACCESS_KEY: "inline-storage-secret-key",
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
      OBJECT_STORAGE_PUBLIC_ENDPOINT: "https://assets-goodgood.o1key.com",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_REGION: "us-east-1",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_FORCE_PATH_STYLE: "false",
    },
    {
      ...fixture.runtime,
      OBJECT_STORAGE_PROVISIONING_MODE: "manage",
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
  assert.match(compose, /group_add:\n\s+- "\$\{GOODGOOD_STAGING_SECRET_GID:\?/);
  assert.match(compose, /goodgood_auth_client_secret:/);
  assert.match(compose, /goodgood_generation_api_key:/);
  assert.match(compose, /goodgood_object_storage_access_key_id:/);
  assert.match(compose, /goodgood_object_storage_secret_access_key:/);
  assert.doesNotMatch(
    compose,
    /OBJECT_STORAGE_ACCESS_KEY_ID:|OBJECT_STORAGE_SECRET_ACCESS_KEY:/,
  );
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

test("Alibaba Cloud staging bootstrap is bounded and keeps public services closed", async () => {
  const bootstrap = await readFile(
    new URL("../infra/staging/bootstrap-ubuntu-host.sh", import.meta.url),
    "utf8",
  );

  assert.match(bootstrap, /VERSION_ID:-.*24\.04/);
  assert.match(bootstrap, /readonly admin_user="goodgood"/);
  assert.match(
    bootstrap,
    /readonly runtime_secrets_group="goodgood-runtime-secrets"/,
  );
  assert.match(bootstrap, /groupadd --system "\$\{runtime_secrets_group\}"/);
  assert.match(bootstrap, /readonly swap_size_mib="2048"/);
  assert.match(bootstrap, /apt-get upgrade --with-new-pkgs --yes/);
  assert.match(bootstrap, /https:\/\/download\.docker\.com\/linux\/ubuntu/);
  assert.doesNotMatch(bootstrap, /get\.docker\.com/);
  assert.match(bootstrap, /"log-driver": "local"/);
  assert.match(bootstrap, /"max-size": "10m"/);
  assert.match(bootstrap, /99-zz-goodgood-host\.conf/);
  assert.match(bootstrap, /GoodGood host swap policy/);
  assert.match(bootstrap, /systemctl disable --now nginx/);
  assert.match(bootstrap, /ufw allow 22\/tcp/);
  assert.match(bootstrap, /ufw allow 80\/tcp/);
  assert.match(bootstrap, /ufw allow 443\/tcp/);
  assert.doesNotMatch(bootstrap, /8\.217\.113\.148|password|api[_-]?key/i);
});

test("same-host staging dependencies are bounded, private, and secret-file backed", async () => {
  const [applicationCompose, dependencyCompose, installer, backupTool, releaseMetadata] =
    await Promise.all([
      readFile(new URL("../compose.staging.yaml", import.meta.url), "utf8"),
      readFile(
        new URL("../compose.staging.dependencies.yaml", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../infra/staging/install-staging-dependencies.sh",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../infra/staging/postgres-backup-restore.sh",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    ]);

  assert.match(
    dependencyCompose,
    /postgres:17\.11-bookworm@sha256:[a-f0-9]{64}/,
  );
  assert.match(
    dependencyCompose,
    /valkey\/valkey:8\.1\.9-alpine3\.24@sha256:[a-f0-9]{64}/,
  );
  assert.match(
    dependencyCompose,
    /rustfs\/rustfs:1\.0\.0-rc\.3@sha256:[a-f0-9]{64}/,
  );
  assert.equal(
    dependencyCompose.match(/^\s+ports:/gm)?.length,
    1,
    "only the S3 API may publish a host port",
  );
  assert.match(
    dependencyCompose,
    /127\.0\.0\.1:9000:9000/,
  );
  assert.doesNotMatch(dependencyCompose, /^\s*-\s*["']?0\.0\.0\.0:/m);
  assert.doesNotMatch(dependencyCompose, /:5432:5432|:6379:6379|:9001:9001/);
  assert.match(dependencyCompose, /internal: true/);
  assert.match(dependencyCompose, /goodgood-staging-storage-origin:/);
  assert.match(dependencyCompose, /RUSTFS_ACCESS_KEY_FILE: \/run\/secrets\//);
  assert.match(dependencyCompose, /RUSTFS_SECRET_KEY_FILE: \/run\/secrets\//);
  assert.match(dependencyCompose, /POSTGRES_PASSWORD_FILE: \/run\/secrets\//);
  assert.equal(dependencyCompose.match(/^\s+mem_limit:/gm)?.length, 3);
  assert.equal(dependencyCompose.match(/^\s+pids_limit:/gm)?.length, 3);
  assert.match(dependencyCompose, /--maxmemory-policy\n\s+- noeviction/);
  assert.match(dependencyCompose, /goodgood-staging-postgres-data/);
  assert.match(dependencyCompose, /goodgood-staging-valkey-data/);
  assert.match(dependencyCompose, /goodgood-staging-object-storage-data/);

  assert.match(applicationCompose, /mem_limit: 640m/);
  assert.match(applicationCompose, /pids_limit: 256/);
  assert.match(applicationCompose, /goodgood-staging-private:\n\s+external: true/);
  assert.match(applicationCompose, /goodgood-staging-egress:/);

  assert.match(installer, /openssl rand -hex 32/);
  assert.match(installer, /chmod 0600/);
  assert.match(installer, /readonly rustfs_uid="10001"/);
  assert.match(installer, /chmod 0400/);
  assert.match(installer, /refusing an implicit rotation/i);
  assert.match(installer, /Docker metadata/);
  assert.match(installer, /http:\/\/127\.0\.0\.1:9000\/health\/ready/);
  assert.doesNotMatch(installer, /printf 'OBJECT_STORAGE_/);
  assert.doesNotMatch(
    installer,
    /8\.217\.113\.148|goodgood-local-only|rustfsadmin/,
  );
  assert.match(backupTool, /readonly backup_root="\/var\/backups\/goodgood"/);
  assert.match(backupTool, /refusing to overwrite/i);
  assert.match(backupTool, /chmod 0600 "\$\{archive_path\}"/);
  assert.match(backupTool, /pg_dump[\s\S]*--format custom/);
  assert.match(backupTool, /pg_restore[\s\S]*--single-transaction/);
  assert.match(backupTool, /--network none/);
  assert.match(backupTool, /--read-only/);
  assert.match(backupTool, /--tmpfs \/var\/lib\/postgresql\/data:/);
  assert.match(backupTool, /POSTGRES_HOST_AUTH_METHOD=trust/);
  assert.match(backupTool, /docker rm --force "\$\{restore_container\}"/);
  assert.doesNotMatch(backupTool, /--publish|-p [0-9]|docker volume/);
  assert.doesNotMatch(backupTool, /8\.217\.113\.148|database-secret|password=/i);
  assert.match(releaseMetadata, /"compose\.staging\.dependencies\.yaml"/);
  assert.match(releaseMetadata, /"infra\/staging\/install-staging-dependencies\.sh"/);
});

test("Nginx accepts only Cloudflare traffic and activates only a matching origin certificate", async () => {
  const [configuration, allowlist, installer, releaseMetadata] =
    await Promise.all([
      readFile(
        new URL("../infra/staging/nginx/goodgood.conf", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../infra/staging/nginx/cloudflare-origin-only.conf",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../infra/staging/install-nginx-origin.sh", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../scripts/release-metadata.mjs", import.meta.url), "utf8"),
    ]);

  assert.match(configuration, /server_name goodgood\.o1key\.com/);
  assert.match(configuration, /include \/etc\/nginx\/snippets\/goodgood-cloudflare-origin-only\.conf/);
  assert.match(configuration, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.match(configuration, /X-Real-IP \$http_cf_connecting_ip/);
  assert.match(configuration, /ssl_protocols TLSv1\.2 TLSv1\.3/);
  assert.doesNotMatch(configuration, /8\.217\.113\.148/);
  assert.match(allowlist, /allow 173\.245\.48\.0\/20/);
  assert.match(allowlist, /allow 2c0f:f248::\/32/);
  assert.match(allowlist, /deny all/);
  assert.match(installer, /ec_paramgen_curve:prime256v1/);
  assert.match(installer, /openssl x509 .* -checkhost/);
  assert.match(installer, /openssl x509 .* -checkend 2592000/);
  assert.match(installer, /certificate_key_digest/);
  assert.match(installer, /nginx -t/);
  assert.match(installer, /systemctl enable --now nginx/);
  assert.match(releaseMetadata, /"infra\/staging\/install-nginx-origin\.sh"/);
  assert.match(releaseMetadata, /"infra\/staging\/nginx\/goodgood\.conf"/);
});
