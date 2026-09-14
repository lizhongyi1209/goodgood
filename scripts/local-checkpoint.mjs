import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { artifactFingerprint, assertCommittedSource, currentRevision, recordBuild, sourceFingerprint, verifyBuild } from "./local-build-provenance.mjs";
import { setVerifiedLocalBuildIdentity } from "../server/runtime/local-build-identity.mjs";

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
    assert.ok(["workspace", "login", "worker", "provider"].includes(mode) && process.argv.length === 4, "Expected workspace, login, worker, or provider");
    const envFile = mode === "login" ? ".env.login-review" : ".env.local-review";
    const environment = parseEnv(await readFile(path.join(root, envFile), "utf8"));
    assert.equal(environment.GENERATION_PROVIDER_KIND, "mock", "Checkpoint start supports mock only");
    assert.equal(environment.GENERATION_API_BASE_URL, "http://127.0.0.1:32143");
    const database = new URL(environment.DATABASE_URL);
    assert.equal(database.hostname, "127.0.0.1");
    assert.equal(database.port, "54449");
    assert.equal(database.pathname, "/goodgood");
    assert.equal(environment.REDIS_URL, "redis://127.0.0.1:56449/0");
    assert.equal(environment.OBJECT_STORAGE_ENDPOINT, "http://127.0.0.1:58049");
    assert.equal(environment.OBJECT_STORAGE_PUBLIC_ENDPOINT, "http://127.0.0.1:58049");
    assert.equal(environment.OBJECT_STORAGE_BUCKET, "goodgood-gg052-local");
    if (mode === "login") {
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
    Object.assign(process.env, environment, {
      GOODGOOD_REVISION: build.revision,
      GOODGOOD_PROCESS: role,
      HOST: "127.0.0.1",
      PORT: port,
      WORKER_HEALTH_HOST: "127.0.0.1",
      WORKER_HEALTH_PORT: "32142",
      MOCK_GENERATION_HOST: "127.0.0.1",
      MOCK_GENERATION_PORT: "32143",
      OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: "http://127.0.0.1:" + port + ",http://localhost:" + port,
    });
    // Workers and providers don't load dist; the same source snapshot still binds all roles.
    assert.equal((await artifactFingerprint(root)).hash, build.artifactHash);
    setVerifiedLocalBuildIdentity(build);
    process.chdir(root);
    console.log(JSON.stringify({ event: "checkpoint.runtime_start", mode, revision: build.revision, artifactHash: build.artifactHash, pid: process.pid }));
    await import("../server/runtime/" + role + ".mjs");
  }
}
