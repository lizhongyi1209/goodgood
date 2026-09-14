import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { currentRevision, recordBuild, sourceFingerprint, verifyBuild } from "../scripts/local-build-provenance.mjs";
import { handleLocalBuildVersion, setVerifiedLocalBuildIdentity } from "../server/runtime/local-build-identity.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "goodgood-gg093-build-"));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("goodgood-gg093-build-"));
    await rm(root, { recursive: true, force: true });
  });
  const git = (args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git(["init", "-q"]);
  await mkdir(path.join(root, "app"));
  await writeFile(path.join(root, "app/page.tsx"), "video and image");
  await writeFile(path.join(root, ".gitignore"), "/dist/\n");
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "docs/fixture.md"), "fixture");
  git(["add", "app/page.tsx", ".gitignore", "docs/fixture.md"]);
  git(["-c", "user.name=GoodGood Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture"]);
  for (const dir of ["dist/client", "dist/server"]) await mkdir(path.join(root, dir), { recursive: true });
  // dist is ignored exactly like the application; it isn't build input.
  await writeFile(path.join(root, "dist/client/page.js"), "client-v1");
  await writeFile(path.join(root, "dist/server/index.js"), "server-v1");
  const sourceHash = await sourceFingerprint(root);
  const manifest = await recordBuild(root, currentRevision(root), sourceHash);
  return { root, git, manifest };
}

test("GG093 accepts a bound build and rejects missing or incomplete output", async (t) => {
  const { root, manifest } = await fixture(t);
  const verified = await verifyBuild(root);
  assert.equal(verified.revision, manifest.revision);
  assert.equal(verified.verified, true);
  await rm(path.join(root, "dist/client/page.js"));
  await assert.rejects(verifyBuild(root), /Build output changed/);
  await rm(path.join(root, "dist/goodgood-build.json"));
  await assert.rejects(verifyBuild(root), /No valid build provenance/);
});

test("GG093 rejects changed source and newly added untracked runtime files", async (t) => {
  const { root } = await fixture(t);
  await writeFile(path.join(root, "app/page.tsx"), "old page");
  await assert.rejects(verifyBuild(root), /Source differs from build/);
  await writeFile(path.join(root, "app/page.tsx"), "video and image");
  await writeFile(path.join(root, "app/new-route.ts"), "untracked runtime source");
  await assert.rejects(verifyBuild(root), /Source differs from build/);
});

test("GG093 rejects a different Git commit and output tampering despite a revision label", async (t) => {
  const { root, git } = await fixture(t);
  await writeFile(path.join(root, "dist/server/index.js"), "tampered");
  await assert.rejects(verifyBuild(root), /Build output changed/);
  await writeFile(path.join(root, "dist/server/index.js"), "server-v1");
  await writeFile(path.join(root, "docs/fixture.md"), "new commit");
  git(["add", "docs/fixture.md"]);
  git(["-c", "user.name=GoodGood Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "new commit"]);
  await assert.rejects(verifyBuild(root), /another Git commit/);
});

test("GG093 refuses stamping when source changes during a build", async (t) => {
  const { root } = await fixture(t);
  const hash = await sourceFingerprint(root);
  await writeFile(path.join(root, "app/page.tsx"), "changed during build");
  await assert.rejects(recordBuild(root, currentRevision(root), hash), /Source changed during build/);
});

test("GG093 version endpoint distinguishes verified startup from a free-form label", () => {
  function request(method = "GET", url = "/api/health/version") {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
    const handled = handleLocalBuildVersion({ method, url }, response);
    return { handled, response };
  }
  setVerifiedLocalBuildIdentity(null);
  assert.equal(request().response.body.build, null);
  setVerifiedLocalBuildIdentity({ revision: "a".repeat(40), sourceHash: "b".repeat(64), artifactHash: "c".repeat(64), builtAt: "2026-09-15T00:00:00Z" });
  assert.equal(request().response.body.build.verified, true);
  assert.equal(request().response.headers["cache-control"], "no-store");
  assert.equal(request("POST").response.statusCode, 405);
  assert.equal(request("GET", "/api/health/ready").handled, false);
  setVerifiedLocalBuildIdentity(null);
});
