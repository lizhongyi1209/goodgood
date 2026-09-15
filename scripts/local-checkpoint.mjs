import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { artifactFingerprint, assertCommittedSource, currentRevision, recordBuild, sourceFingerprint, verifyBuild } from "./local-build-provenance.mjs";
import { setVerifiedLocalBuildIdentity } from "../server/runtime/local-build-identity.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

// The real-provider token lives outside the repository on purpose: an ignore
// rule can be edited or bypassed with `git add -f`, but git cannot reach a path
// it has never seen. The worker reads the file per start; the value never
// enters the repo, a build artifact, or a log line.
const REAL_PROVIDER_TOKEN_FILE =
  process.env.GOODGOOD_LOCAL_O1KEY_KEY_FILE ??
  path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? "",
    ".claude",
    "goodgood-local-secrets",
    "o1key-api-key.txt",
  );

async function readRealProviderTokenFile() {
  const resolved = path.resolve(REAL_PROVIDER_TOKEN_FILE);
  assert.ok(
    !resolved.startsWith(path.resolve(root) + path.sep),
    "The real provider token file must live outside the repository.",
  );
  let info;
  try {
    info = await stat(resolved);
  } catch {
    throw new Error(
      `Real provider token file not found at ${resolved}. ` +
        "Write your local O1Key token there (see the README beside it), or set " +
        "GOODGOOD_LOCAL_O1KEY_KEY_FILE, or set LOCAL_GENERATION_PROVIDER_KIND=mock " +
        "in .env.local-review to run without real calls.",
    );
  }
  if (!info.isFile()) throw new Error(`${resolved} is not a file.`);
  const token = (await readFile(resolved, "utf8")).trim();
  if (!token) {
    throw new Error(`The real provider token file at ${resolved} is empty.`);
  }
  if (/[\r\n]/.test(token)) {
    throw new Error(
      `The real provider token file at ${resolved} must hold exactly one token.`,
    );
  }
  return resolved;
}
const command = process.argv[2];
assert.ok(["build", "verify", "start"].includes(command), "Expected build, verify, or start");
if (command === "build") {
  assert.equal(process.argv.length, 3);
  assertCommittedSource(root);
  const revision = currentRevision(root);
  const sourceHash = await sourceFingerprint(root);
  // Exact file under the resolved repository, never a recursive deletion.
  await rm(path.join(root, "dist/goodgood-build.json"), { force: true });
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/vinext/dist/cli.js"), "build"], { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
  console.log(JSON.stringify({ event: "checkpoint.build_recorded", ...await recordBuild(root, revision, sourceHash) }));
} else {
  const build = await verifyBuild(root);
  if (command === "verify") {
    assert.equal(process.argv.length, 3);
    console.log(JSON.stringify({ event: "checkpoint.build_verified", ...build }));
  } else {
    const mode = process.argv[3];
    assert.ok(["workspace", "login", "worker", "provider"].includes(mode) && process.argv.length === 4, "Expected workspace, login, worker, or provider");
    const emailWeb = mode === "workspace" || mode === "login";
    const envFile = emailWeb ? ".env.login-review" : ".env.local-review";
    const environment = parseEnv(await readFile(path.join(root, envFile), "utf8"));
    // Local runs call the real provider by default so the local stack exercises
    // the same contract production uses. The token lives outside the repository
    // and is read per start, never copied into the repo or a build artifact.
    const providerKind = mode === "worker"
      ? environment.LOCAL_GENERATION_PROVIDER_KIND ?? "o1key"
      : "mock";
    if (mode === "provider") {
      assert.equal(
        providerKind,
        "mock",
        "The mock provider process must not start while the worker calls the real provider.",
      );
    }
    if (emailWeb || providerKind === "mock") {
      assert.equal(environment.GENERATION_API_BASE_URL, "http://127.0.0.1:32143");
    }
    const database = new URL(environment.DATABASE_URL);
    assert.equal(database.hostname, "127.0.0.1");
    assert.equal(database.port, "54449");
    assert.equal(database.pathname, "/goodgood");
    assert.equal(environment.REDIS_URL, "redis://127.0.0.1:56449/0");
    assert.equal(environment.OBJECT_STORAGE_ENDPOINT, "http://127.0.0.1:58049");
    assert.equal(environment.OBJECT_STORAGE_PUBLIC_ENDPOINT, "http://127.0.0.1:58049");
    assert.equal(environment.OBJECT_STORAGE_BUCKET, "goodgood-gg052-local");
    if (emailWeb) {
      assert.equal(environment.GOODGOOD_AUTH_MODE, "email_otp");
      assert.equal(environment.GOODGOOD_ALLOW_LOCAL_AUTH, "false");
      assert.equal(environment.GOODGOOD_EMAIL_SMTP_HOST, "127.0.0.1");
      assert.equal(environment.GOODGOOD_EMAIL_SMTP_PORT, "58046");
    } else {
      assert.equal(environment.GOODGOOD_AUTH_MODE, "local");
      assert.equal(environment.GOODGOOD_ALLOW_LOCAL_AUTH, "true");
    }
    const role = mode === "worker" ? "worker" : mode === "provider" ? "mock-generation" : "web";
    const port = mode === "login" ? "32191" : "32131";
    // Browsers presign-time need object storage to admit this page's origin;
    // a stale bucket CORS rule fails the preflight before the PUT is ever sent.
    const webOrigins = [
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
    ].join(",");
    const authenticationOverrides = emailWeb
      ? {
          GOODGOOD_AUTH_COOKIE_NAME:
            mode === "workspace"
              ? "goodgood_workspace_email_session"
              : environment.GOODGOOD_AUTH_COOKIE_NAME,
          GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:" + port,
          GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: "",
          GOODGOOD_LOCAL_AUTH_TOKENS: "",
        }
      : {};
    const providerOverrides = providerKind === "o1key"
      ? {
          GENERATION_API_BASE_URL:
            environment.LOCAL_GENERATION_API_BASE_URL ?? "https://cf-api.o1key.com",
          GENERATION_API_KEY: "",
          GENERATION_API_KEY_FILE: await readRealProviderTokenFile(),
          GENERATION_POLL_INTERVAL_MS: "1000",
          GENERATION_POLL_TIMEOUT_MS: "180000",
          GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
          GENERATION_PROVIDER_KIND: "o1key",
          GENERATION_REQUEST_TIMEOUT_MS: "30000",
        }
      : {
          GENERATION_API_BASE_URL: "http://127.0.0.1:32143",
          GENERATION_PROVIDER_KIND: "mock",
        };
    Object.assign(process.env, environment, authenticationOverrides, providerOverrides, {
      GOODGOOD_REVISION: build.revision,
      GOODGOOD_PROCESS: role,
      HOST: "127.0.0.1",
      PORT: port,
      WORKER_HEALTH_HOST: "127.0.0.1",
      WORKER_HEALTH_PORT: "32142",
      MOCK_GENERATION_HOST: "127.0.0.1",
      MOCK_GENERATION_PORT: "32143",
      OBJECT_STORAGE_PROVISIONING_MODE: "manage",
      OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: webOrigins,
    });
    // Workers and providers don't load dist; the same source snapshot still binds all roles.
    assert.equal((await artifactFingerprint(root)).hash, build.artifactHash);
    setVerifiedLocalBuildIdentity(build);
    process.chdir(root);
    console.log(
      JSON.stringify({
        event: "checkpoint.runtime_start",
        mode,
        revision: build.revision,
        artifactHash: build.artifactHash,
        pid: process.pid,
        provider: role === "worker" ? providerKind : "not-applicable",
      }),
    );
    if (role === "worker") {
      console.log(
        providerKind === "o1key"
          ? "\n*** LOCAL WORKER -> REAL O1KEY PROVIDER: every generation costs money. ***\n"
          : "\n*** LOCAL WORKER -> MOCK PROVIDER: no real generation calls. ***\n",
      );
    }
    await import("../server/runtime/" + role + ".mjs");
  }
}
