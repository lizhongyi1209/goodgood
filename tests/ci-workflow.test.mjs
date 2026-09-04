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
  assert.match(workflow, /NODE_VERSION: 24\.20\.0/);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /npm run check:local/);
  assert.match(
    workflow,
    /- name: Build verification image\s+run: >-[\s\S]*docker build[\s\S]*--tag goodgood:ci-\$\{\{ github\.sha \}\}/,
  );
  assert.doesNotMatch(
    workflow,
    /- name: Build verification image\s+if:/,
  );
  assert.match(
    workflow,
    /- name: Smoke verification image runtime imports[\s\S]*docker run --rm[\s\S]*--entrypoint node[\s\S]*import\('react'\)[\s\S]*import\('react-dom\/server'\)[\s\S]*import\('react-server-dom-webpack\/client\.node'\)[\s\S]*import\('vinext\/server\/prod-server'\)/,
  );
  assert.match(
    workflow,
    /Smoke verification image runtime imports[\s\S]*Scan verification image/,
  );

  assert.equal(
    workflow.match(
      /uses: aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/g,
    )?.length,
    2,
  );
  assert.match(workflow, /- name: Scan locked production dependencies/);
  assert.match(workflow, /scan-type: fs/);
  assert.match(workflow, /scan-ref: \./);
  assert.match(
    workflow,
    /skip-dirs: node_modules,\.sites-runtime,dist,runtime-bundle/,
  );
  assert.match(workflow, /vuln-type: library/);
  assert.match(workflow, /version: v0\.70\.0/);
  assert.match(workflow, /image-ref: goodgood:ci-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /exit-code: ["']1["']/);
  assert.match(workflow, /ignore-unfixed: true/);
  assert.match(workflow, /vuln-type: os,library/);
  assert.match(workflow, /severity: CRITICAL,HIGH/);
  assert.match(workflow, /scanners: vuln/);

  const actionReferences = [...workflow.matchAll(/uses: ([^\s]+)@([^\s]+)/g)];
  assert.equal(actionReferences.length, 8);
  for (const [, action, revision] of actionReferences) {
    assert.match(action, /^(actions|aquasecurity|docker)\//);
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

test("runtime build dependencies exclude the vulnerable image-size release", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const lock = JSON.parse(
    await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  );

  assert.equal(manifest.dependencies.next, "16.2.11");
  assert.equal(manifest.devDependencies.vinext, "1.0.0-beta.9");
  assert.equal(manifest.devDependencies["@vitejs/plugin-rsc"], "0.5.34");
  assert.equal(manifest.devDependencies["eslint-config-next"], "16.2.11");
  assert.equal(manifest.dependencies.sharp, "0.35.0");
  assert.deepEqual(manifest.overrides, {
    "fast-uri": "3.1.6",
    nanoid: "3.3.18",
    postcss: "8.5.28",
    sharp: "$sharp",
  });
  assert.equal(lock.packages["node_modules/vinext"].version, "1.0.0-beta.9");
  assert.equal(lock.packages["node_modules/sharp"].version, "0.35.0");
  assert.equal(lock.packages["node_modules/image-size"], undefined);

  for (const dependency of Object.values(lock.packages)) {
    assert.equal(dependency?.dependencies?.["image-size"], undefined);
  }
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
