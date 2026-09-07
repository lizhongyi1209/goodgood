import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  ACCOUNT_DELETION_RUNTIME_SECRET_FILES,
  loadAccountDeletionRuntimeConfig,
} from "../server/account-deletion/runtime-config.mjs";
import { createAccountDeletionRuntimeResources } from "../server/account-deletion/runtime-resources.mjs";
import {
  ACCOUNT_DELETION_CYCLE_LIMITS,
  executeAccountDeletionRuntime,
  runAccountDeletionRuntimeMain,
} from "../server/runtime/account-deletion-cycle.mjs";

const root = path.resolve(import.meta.dirname, "..");

function productionEnvironment(overrides = {}) {
  return {
    DATABASE_URL:
      "postgresql://goodgood:database-password@postgres:5432/goodgood",
    GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_ID_FILE:
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.authingAccessKeyId,
    GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_SECRET_FILE:
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.authingAccessKeySecret,
    GOODGOOD_AUTH_ISSUER: "https://goodgood.authing.cn/oidc",
    NODE_ENV: "production",
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE:
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.objectStorageAccessKeyId,
    OBJECT_STORAGE_BUCKET: "goodgood",
    OBJECT_STORAGE_ENDPOINT:
      "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
    OBJECT_STORAGE_FORCE_PATH_STYLE: "true",
    OBJECT_STORAGE_PROVISIONING_MODE: "verify",
    OBJECT_STORAGE_REGION: "auto",
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE:
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.objectStorageSecretAccessKey,
    ...overrides,
  };
}

function secretReader(seen = []) {
  const secrets = new Map([
    [
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.authingAccessKeyId,
      "authing-access-key-id",
    ],
    [
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.authingAccessKeySecret,
      "authing-access-key-secret-with-enough-material",
    ],
    [
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.objectStorageAccessKeyId,
      "r2-access-key-id",
    ],
    [
      ACCOUNT_DELETION_RUNTIME_SECRET_FILES.objectStorageSecretAccessKey,
      "r2-secret-access-key-with-enough-material",
    ],
  ]);
  return (filePath) => {
    seen.push(filePath);
    if (!secrets.has(filePath)) throw new Error("missing fixture");
    return `${secrets.get(filePath)}\n`;
  };
}

function emptyCycleResult(status = "ok", alertCodes = []) {
  const lifecycle = {
    overdue: 0,
    processing: 0,
    waitCompleted: 0,
    waitDue: 0,
    waitLeased: 0,
  };
  return {
    alertCodes,
    lifecycleAfter: lifecycle,
    lifecycleBefore: lifecycle,
    privateOwnerId: "must-not-cross-runtime-boundary",
    status,
    totals: {
      claimed: 0,
      completed: 0,
      deferred: 0,
      failed: 0,
      lostLease: 0,
    },
  };
}

test("production deletion config reads only exact mounted secret files", () => {
  const seen = [];
  const config = loadAccountDeletionRuntimeConfig(productionEnvironment(), {
    readFile: secretReader(seen),
  });

  assert.deepEqual(seen.sort(), Object.values(ACCOUNT_DELETION_RUNTIME_SECRET_FILES).sort());
  assert.equal(config.databaseUrl.includes("@postgres:5432/goodgood"), true);
  assert.equal(config.identity.expectedIssuer, "https://goodgood.authing.cn/oidc");
  assert.equal(config.objectStorage.bucket, "goodgood");
  assert.equal(config.objectStorage.provisioningMode, "verify");
  assert.equal(config.objectStorage.forcePathStyle, true);
  assert.equal(Object.hasOwn(config, "provider"), false);
  assert.equal(Object.hasOwn(config, "redisUrl"), false);
});

test("production deletion config rejects inline credentials and altered targets", () => {
  for (const overrides of [
    { GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_ID: "inline-secret" },
    { OBJECT_STORAGE_SECRET_ACCESS_KEY: "inline-secret" },
    {
      GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_SECRET_FILE:
        "/tmp/authing-secret",
    },
    { DATABASE_URL: "postgresql://goodgood:password@elsewhere:5432/goodgood" },
    { GOODGOOD_AUTH_ISSUER: "http://goodgood.authing.cn/oidc" },
    {
      OBJECT_STORAGE_ENDPOINT:
        "https://0123456789abcdef0123456789abcdef.example.com",
    },
    { OBJECT_STORAGE_BUCKET: "another-bucket" },
    { OBJECT_STORAGE_PROVISIONING_MODE: "manage" },
  ]) {
    assert.throws(() =>
      loadAccountDeletionRuntimeConfig(productionEnvironment(overrides), {
        readFile: secretReader(),
      }),
    );
  }
});

test("deletion resources use only a two-connection database pool and private R2", async () => {
  const operations = [];
  class FakePool {
    constructor(options) {
      operations.push(["pool", options]);
    }
    on(event) {
      operations.push(["pool-on", event]);
    }
    async query(sql) {
      operations.push(["query", sql]);
    }
    async end() {
      operations.push(["pool-end"]);
    }
  }
  class FakeStorage {
    constructor(options) {
      operations.push(["storage", options]);
    }
    async send(command) {
      assert.equal(command instanceof HeadBucketCommand, true);
      operations.push(["head", command.input.Bucket]);
    }
    destroy() {
      operations.push(["storage-destroy"]);
    }
  }
  const config = loadAccountDeletionRuntimeConfig(productionEnvironment(), {
    readFile: secretReader(),
  });
  const runtime = createAccountDeletionRuntimeResources(config, {
    PoolClass: FakePool,
    StorageClientClass: FakeStorage,
    logger: { error() {} },
  });

  await runtime.verify();
  await runtime.close();
  await runtime.close();

  assert.deepEqual(operations[0], [
    "pool",
    { connectionString: config.databaseUrl, max: 2 },
  ]);
  assert.deepEqual(operations.filter(([name]) => name === "query"), [
    ["query", "SELECT 1"],
  ]);
  assert.deepEqual(operations.filter(([name]) => name === "head"), [
    ["head", "goodgood"],
  ]);
  assert.equal(
    operations.filter(([name]) => name === "pool-end").length,
    1,
  );
  assert.equal(
    operations.filter(([name]) => name === "storage-destroy").length,
    1,
  );
});

test("one deletion invocation uses fixed limits, verifies dependencies, and closes", async () => {
  const calls = [];
  const config = {
    identity: {
      accessKeyId: "authing-id",
      accessKeySecret: "authing-secret",
      expectedIssuer: "https://goodgood.authing.cn/oidc",
    },
  };
  const identityAdapter = {
    async deleteIdentity() {},
    async disableIdentity() {},
  };
  const outcome = await executeAccountDeletionRuntime({
    adapterFactory(options) {
      calls.push(["adapter", options]);
      return identityAdapter;
    },
    configLoader() {
      calls.push(["config"]);
      return config;
    },
    async cycleRunner(resources, options) {
      calls.push(["cycle", resources, options]);
      return emptyCycleResult();
    },
    logger: { error() {}, info() {} },
    resourcesFactory(value) {
      assert.equal(value, config);
      return {
        async close() {
          calls.push(["close"]);
        },
        resources: { pool: {}, storage: {} },
        async verify() {
          calls.push(["verify"]);
        },
      };
    },
  });

  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.result.status, "ok");
  assert.equal(Object.hasOwn(outcome.result, "privateOwnerId"), false);
  assert.deepEqual(calls.map(([name]) => name), [
    "config",
    "verify",
    "adapter",
    "cycle",
    "close",
  ]);
  const cycleOptions = calls.find(([name]) => name === "cycle")[2];
  assert.deepEqual(
    {
      batchSize: cycleOptions.batchSize,
      identityBatchSize: cycleOptions.identityBatchSize,
      leaseMilliseconds: cycleOptions.leaseMilliseconds,
      objectBatchSize: cycleOptions.objectBatchSize,
      retryMilliseconds: cycleOptions.retryMilliseconds,
    },
    ACCOUNT_DELETION_CYCLE_LIMITS,
  );
  assert.equal(cycleOptions.identityAdapter, identityAdapter);
  assert.equal(cycleOptions.requestId, null);
});

test("attention and aborted outcomes have stable non-zero handoff codes", async () => {
  for (const [status, exitCode] of [
    ["attention", 2],
    ["aborted", 3],
  ]) {
    let output = "";
    const actual = await runAccountDeletionRuntimeMain({
      adapterFactory: () => ({}),
      configLoader: () => ({ identity: {} }),
      cycleRunner: async () =>
        emptyCycleResult(status, ["ACCOUNT_DELETION_PASS_FAILED"]),
      errorWriter: () => assert.fail("did not expect a runtime failure"),
      logger: { error() {}, info() {} },
      outputWriter: (line) => {
        output += line;
      },
      resourcesFactory: () => ({
        close: async () => {},
        resources: {},
        verify: async () => {},
      }),
    });
    assert.equal(actual, exitCode);
    assert.deepEqual(JSON.parse(output), {
      alertCodes: ["ACCOUNT_DELETION_PASS_FAILED"],
      event: "account_deletion.runtime_completed",
      lifecycle: {
        after: {
          overdue: 0,
          processing: 0,
          waitCompleted: 0,
          waitDue: 0,
          waitLeased: 0,
        },
        before: {
          overdue: 0,
          processing: 0,
          waitCompleted: 0,
          waitDue: 0,
          waitLeased: 0,
        },
      },
      status,
      totals: {
        claimed: 0,
        completed: 0,
        deferred: 0,
        failed: 0,
        lostLease: 0,
      },
    });
  }
});

test("unexpected runtime failure emits only one fixed aggregate alert", async () => {
  let errorOutput = "";
  const exitCode = await runAccountDeletionRuntimeMain({
    configLoader() {
      throw new Error("owner@example.com sensitive-secret-value");
    },
    errorWriter: (line) => {
      errorOutput += line;
    },
    outputWriter: () => assert.fail("did not expect successful output"),
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(JSON.parse(errorOutput), {
    alertCode: "ACCOUNT_DELETION_RUNTIME_FAILED",
    event: "account_deletion.runtime_alert",
  });
  assert.doesNotMatch(errorOutput, /owner@example\.com|sensitive-secret-value/);
});

test("production schedule is isolated, bounded, locked, and inactive by default", async () => {
  const [compose, wrapper, service, timer, buildSource, metadataSource] =
    await Promise.all([
      readFile(
        path.join(root, "compose.production.account-deletion.yaml"),
        "utf8",
      ),
      readFile(
        path.join(root, "infra/production/account-deletion-cycle.sh"),
        "utf8",
      ),
      readFile(
        path.join(
          root,
          "infra/production/systemd/goodgood-production-account-deletion.service",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          root,
          "infra/production/systemd/goodgood-production-account-deletion.timer",
        ),
        "utf8",
      ),
      readFile(path.join(root, "scripts/build-runtime.mjs"), "utf8"),
      readFile(path.join(root, "scripts/release-metadata.mjs"), "utf8"),
    ]);

  assert.match(compose, /pull_policy: never/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /mem_limit: 384m/);
  assert.match(compose, /cpus: 0\.5/);
  assert.match(compose, /goodgood-production-state/);
  assert.match(compose, /goodgood-production-account-deletion-egress/);
  assert.match(compose, /account-deletion\/authing-access-key-id/);
  assert.match(compose, /account-deletion\/authing-access-key-secret/);
  assert.doesNotMatch(compose, /goodgood_generation_api_key|auth_client_secret/);
  assert.doesNotMatch(compose, /ports:/);

  assert.match(wrapper, /flock --nonblock 9/);
  assert.match(wrapper, /ACCOUNT_DELETION_CYCLE_OVERLAP/);
  assert.match(wrapper, /--pull never/);
  assert.match(wrapper, /0:\$\{secret_gid\}:640/);
  assert.doesNotMatch(wrapper, /enable|systemctl|curl|api\.authing/);

  assert.match(service, /Type=oneshot/);
  assert.match(service, /TimeoutStartSec=4m/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(timer, /OnCalendar=\*-\*-\* \*:00\/5:00 UTC/);
  assert.match(timer, /Persistent=true/);
  assert.doesNotMatch(service + timer, /OnFailure=|https?:\/\//);

  for (const source of [buildSource, metadataSource]) {
    assert.match(source, /account-deletion-cycle/);
  }
  assert.match(metadataSource, /compose\.production\.account-deletion\.yaml/);
  assert.match(
    metadataSource,
    /goodgood-production-account-deletion\.service/,
  );
  assert.match(metadataSource, /goodgood-production-account-deletion\.timer/);
});
