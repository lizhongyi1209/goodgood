import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveReleaseMetadata,
  githubOutput,
} from "../scripts/release-metadata.mjs";

test("CI verifies changes and publishes one immutable main image", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node-version: \$\{\{ env\.NODE_VERSION \}\}/);
  assert.match(workflow, /NODE_VERSION: 24\.12\.0/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /npm run check:local/);
  assert.match(
    workflow,
    /if: github\.event_name == 'pull_request'[\s\S]*docker build/,
  );

  const actionReferences = [...workflow.matchAll(/uses: ([^\s]+)@([^\s]+)/g)];
  assert.equal(actionReferences.length, 6);
  for (const [, action, revision] of actionReferences) {
    assert.match(action, /^(actions|docker)\//);
    assert.match(revision, /^[a-f0-9]{40}$/);
  }

  assert.match(
    workflow,
    /publish-image:[\s\S]*if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(workflow, /publish-image:[\s\S]*needs: verify/);
  assert.match(workflow, /publish-image:[\s\S]*packages: write/);
  assert.match(workflow, /node scripts\/release-metadata\.mjs --github-output/);
  assert.match(
    workflow,
    /tags: \$\{\{ steps\.release\.outputs\.image-name \}\}:\$\{\{ github\.sha \}\}/,
  );
  assert.doesNotMatch(workflow, /(?:^|:)latest(?:\s|$)/m);
  assert.match(workflow, /GOODGOOD_REVISION=\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /org\.opencontainers\.image\.source=/);
  assert.match(workflow, /com\.goodgood\.migration\.version=/);
  assert.match(workflow, /com\.goodgood\.runtime-config\.version=/);
  assert.match(workflow, /steps\.image\.outputs\.digest/);
});

test("release metadata is deterministic and records the current migration", async () => {
  const first = await deriveReleaseMetadata({
    repository: "Lizhongyi1209/GoodGood",
  });
  const second = await deriveReleaseMetadata({
    repository: "lizhongyi1209/goodgood",
  });

  assert.deepEqual(first, second);
  assert.equal(first.imageName, "ghcr.io/lizhongyi1209/goodgood");
  assert.equal(first.migrationVersion, "0010_m6_payment_sandbox.sql");
  assert.match(first.runtimeConfigVersion, /^[a-f0-9]{64}$/);
  assert.equal(
    githubOutput(first),
    [
      "image-name=ghcr.io/lizhongyi1209/goodgood",
      "migration-version=0010_m6_payment_sandbox.sql",
      `runtime-config-version=${first.runtimeConfigVersion}`,
      "",
    ].join("\n"),
  );
});
