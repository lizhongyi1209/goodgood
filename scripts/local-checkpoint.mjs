import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { artifactFingerprint, assertCommittedSource, currentRevision, recordBuild, sourceFingerprint, verifyBuild } from "./local-build-provenance.mjs";
import { resolveLocalProviderTokenFile } from "./local-provider-secret.mjs";
import { loadLocalEmailSmtpEnvironment } from "./local-email-smtp.mjs";
import { setVerifiedLocalBuildIdentity } from "../server/runtime/local-build-identity.mjs";
import { runAuthenticationPreflight } from "../server/auth/preflight.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

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
    const options = process.argv.slice(4);
    assert.ok(["workspace", "login", "worker"].includes(mode) &&
      options.length % 2 === 0, "Expected workspace, login, or worker with paired options.");
    const allowedOptions = new Set(["--cloud-env-file", "--email-env-file"]);
    const selected = new Map();
    for (let index = 0; index < options.length; index += 2) {
      assert.ok(allowedOptions.has(options[index]) && options[index + 1] &&
        !selected.has(options[index]), "Expected unique --cloud-env-file or --email-env-file options.");
      selected.set(options[index], options[index + 1]);
    }
    const cloudFile = selected.get("--cloud-env-file");
    const emailFile = selected.get("--email-env-file");
    assert.ok(!cloudFile || mode === "workspace" || mode === "worker",
      "External cloud configuration is available only for workspace or worker.");
    assert.ok(!emailFile || mode === "workspace",
      "External email configuration is available only for workspace.");
    const emailWeb = mode === "workspace" || mode === "login";
    const envFile = emailWeb ? ".env.login-review" : ".env.local-review";
    const environment = parseEnv(await readFile(path.join(root, envFile), "utf8"));
    const emailEnvironment = emailFile
      ? await loadLocalEmailSmtpEnvironment(emailFile, root)
      : {};
    const cloudEnvironment = cloudFile
      ? parseEnv(await readFile(await assertExternalFile(cloudFile), "utf8"))
      : {};
    const cloudNames = [
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET",
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_REGION",
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_ENDPOINT",
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_PUBLIC_ENDPOINT",
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_ACCESS_KEY_ID_FILE",
      "GOODGOOD_LOCAL_CLOUD_UPLOAD_SECRET_ACCESS_KEY_FILE",
    ];
    if (cloudFile) {
      assert.deepEqual(Object.keys(cloudEnvironment).sort(), [...cloudNames].sort(),
        "Cloud environment file must contain exactly the documented six settings.");
      await Promise.all([
        assertExternalFile(cloudEnvironment.GOODGOOD_LOCAL_CLOUD_UPLOAD_ACCESS_KEY_ID_FILE),
        assertExternalFile(cloudEnvironment.GOODGOOD_LOCAL_CLOUD_UPLOAD_SECRET_ACCESS_KEY_FILE),
      ]);
    }
    // Every runnable local development role uses the same real online provider
    // contract as production. The dedicated development token stays outside the
    // repository and is read per start; there is no runtime mock fallback.
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
      if (!emailFile) {
        assert.equal(environment.GOODGOOD_EMAIL_SMTP_HOST, "127.0.0.1");
        assert.equal(environment.GOODGOOD_EMAIL_SMTP_PORT, "58046");
      }
    } else {
      assert.equal(environment.GOODGOOD_AUTH_MODE, "local");
      assert.equal(environment.GOODGOOD_ALLOW_LOCAL_AUTH, "true");
    }
    const role = mode === "worker" ? "worker" : "web";
    const port = mode === "login" ? "32191" : "32131";
    // Browsers presign-time need object storage to admit this page's origin;
    // a stale bucket CORS rule fails the preflight before the PUT is ever sent.
    const webOrigins = [
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
      ...(mode === "workspace"
        ? ["http://127.0.0.1:5173", "http://localhost:5173"]
        : []),
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
    const providerFile = await resolveLocalProviderTokenFile({
      repositoryRoot: root,
    });
    const providerOverrides = {
      GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
      GENERATION_API_KEY: "",
      GENERATION_API_KEY_FILE: providerFile,
      GENERATION_POLL_INTERVAL_MS: "1000",
      GENERATION_POLL_TIMEOUT_MS: "180000",
      GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
      GENERATION_PROVIDER_KIND: "o1key",
      GENERATION_REQUEST_TIMEOUT_MS: "30000",
      GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME: "true",
      GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
      GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: providerFile,
    };
    Object.assign(process.env, environment, cloudEnvironment, emailEnvironment,
      authenticationOverrides, providerOverrides, {
      GOODGOOD_REVISION: build.revision,
      GOODGOOD_PROCESS: role,
      HOST: "127.0.0.1",
      PORT: port,
      WORKER_HEALTH_HOST: "127.0.0.1",
      WORKER_HEALTH_PORT: "32142",
      OBJECT_STORAGE_PROVISIONING_MODE: "manage",
      OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: webOrigins,
    });
    if (emailFile) {
      const preflight = await runAuthenticationPreflight({
        allowLoopback: true,
        environment: process.env,
      });
      assert.ok(preflight.ok, "Real email SMTP preflight failed; Web was not started.");
    }
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
        provider: "o1key",
        referenceStorage: process.env.GOODGOOD_LOCAL_CLOUD_UPLOAD_BUCKET
          ? "cloud-development"
          : "local-rustfs",
        emailDelivery: emailFile ? "real-smtp" : "local-mailpit",
      }),
    );
    if (role === "worker") {
      console.log(
        "\n*** LOCAL WORKER -> REAL O1KEY PROVIDER: every generation costs money. ***\n",
      );
    }
    await import("../server/runtime/" + role + ".mjs");
  }
}

async function assertExternalFile(file) {
  assert.ok(path.isAbsolute(file) || path.win32.isAbsolute(file),
    "Cloud credentials and configuration need absolute external paths.");
  const resolved = await realpath(file);
  const relative = path.relative(root, resolved);
  assert.ok(path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`),
    "Cloud credentials and configuration must stay outside the repository.");
  return resolved;
}
