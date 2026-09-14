import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function currentRevision(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

const isSourceInput = (file) => !/^(docs\/|tests\/|\.github\/|\.codex\/|\.claude\/|\.env|AGENTS\.md$|CLAUDE\.md$|README\.md$)/.test(file);

export function assertCommittedSource(root) {
  const changed = execFileSync("git", ["diff", "--name-only", "-z", "HEAD"], { cwd: root, encoding: "utf8" });
  const untracked = execFileSync("git", ["ls-files", "-z", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  assert.equal((changed + untracked).split("\0").filter(Boolean).filter(isSourceInput).length, 0,
    "Commit runtime source before building a version checkpoint; use dev:local for uncommitted development.");
}

export async function sourceFingerprint(root) {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort()) {
    if (!isSourceInput(file)) continue;
    hash.update(file + "\0");
    try {
      hash.update(await readFile(path.join(root, file)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("<deleted>");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function artifactFingerprint(root) {
  const hash = createHash("sha256");
  let count = 0;
  async function visit(relative) {
    for (const entry of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = relative + "/" + entry.name;
      if (entry.isDirectory()) await visit(file);
      else {
        assert.ok(entry.isFile(), "Unexpected non-file build output: " + file);
        hash.update(file + "\0");
        hash.update(await readFile(path.join(root, file)));
        hash.update("\0");
        count++;
      }
    }
  }
  await visit("dist/client");
  await visit("dist/server");
  assert.ok(count > 0, "Build output is empty");
  return { hash: hash.digest("hex"), count };
}

export async function recordBuild(root, revision, sourceHash) {
  assert.equal(currentRevision(root), revision, "Git changed during build; rebuild");
  assert.equal(await sourceFingerprint(root), sourceHash, "Source changed during build; rebuild");
  assertCommittedSource(root);
  const artifacts = await artifactFingerprint(root);
  const manifest = {
    version: 1,
    revision,
    sourceHash,
    artifactHash: artifacts.hash,
    artifactCount: artifacts.count,
    builtAt: new Date().toISOString(),
  };
  await writeFile(path.join(root, "dist/goodgood-build.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

export async function verifyBuild(root) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(root, "dist/goodgood-build.json"), "utf8"));
  } catch {
    throw new Error("No valid build provenance. Run npm run build:checkpoint before starting.");
  }
  assert.equal(manifest.version, 1, "Unsupported build provenance; rebuild");
  for (const key of ["sourceHash", "artifactHash"]) assert.match(manifest[key] ?? "", /^[a-f0-9]{64}$/);
  assert.match(manifest.revision ?? "", /^[a-f0-9]{40}$/);
  assert.equal(manifest.revision, currentRevision(root), "Build belongs to another Git commit. Run npm run build:checkpoint.");
  assert.equal(manifest.sourceHash, await sourceFingerprint(root), "Source differs from build. Run npm run build:checkpoint.");
  const artifacts = await artifactFingerprint(root);
  assert.equal(manifest.artifactHash, artifacts.hash, "Build output changed. Run npm run build:checkpoint.");
  assert.equal(manifest.artifactCount, artifacts.count, "Build output is incomplete; rebuild");
  return Object.freeze({ ...manifest, verified: true });
}
