import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "add-ai-element.mjs");

test("AI Elements installation requires an explicit safe component name", () => {
  for (const args of [[], ["../all"], ["--help"]]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /npm run ui:ai:add -- <component-name>/);
  }
});
