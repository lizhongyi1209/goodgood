import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("keeps the implementation handoff wired into agent and documentation entry points", async () => {
  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  const documentationMap = await readFile(
    path.join(root, "docs/README.md"),
    "utf8",
  );
  const plan = await readFile(
    path.join(root, "docs/IMPLEMENTATION_PLAN.md"),
    "utf8",
  );

  assert.match(agents, /docs\/IMPLEMENTATION_PLAN\.md/);
  assert.match(documentationMap, /`IMPLEMENTATION_PLAN\.md`/);
  assert.match(plan, /^# Production implementation plan/m);
  assert.match(plan, /^- Last synchronized: \d{4}-\d{2}-\d{2}$/m);
  assert.match(plan, /^- Current phase:/m);
  assert.match(plan, /^## Current checkpoint$/m);
  assert.match(plan, /^- Next action:/m);
  assert.match(plan, /^- Blockers:/m);
  assert.match(plan, /^## Milestones$/m);
  assert.match(plan, /^## New-session recovery$/m);
});

test("lists every architecture decision record in the ADR index", async () => {
  const decisionsDirectory = path.join(root, "docs/decisions");
  const index = await readFile(
    path.join(decisionsDirectory, "README.md"),
    "utf8",
  );
  const decisions = (await readdir(decisionsDirectory))
    .filter((file) => /^\d{4}-.+\.md$/.test(file))
    .sort();

  assert.ok(decisions.length > 0);
  for (const decision of decisions) {
    assert.ok(
      index.includes("`" + decision + "`"),
      `ADR index is missing ${decision}`,
    );
  }
});
