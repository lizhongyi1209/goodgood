import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const readDocument = (file) => readFile(path.join(root, file), "utf8");

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
  assert.equal(plan.match(/^- Next action:/gm)?.length, 1);
  assert.equal(plan.match(/^## Current checkpoint$/gm)?.length, 1);
});

test("all agent adapters expose the same small recovery set without stale prototype claims", async () => {
  const entries = [
    "AGENTS.md",
    "CLAUDE.md",
    ".github/copilot-instructions.md",
    "README.md",
    "docs/README.md",
  ];
  for (const entry of entries) {
    const text = await readDocument(entry);
    for (const document of [
      "CURRENT_STATE.md",
      "WORKFLOW.md",
      "IMPLEMENTATION_PLAN.md",
      "BACKLOG.md",
    ]) {
      assert.ok(text.includes(document), `${entry} must expose ${document}`);
      await access(path.join(root, "docs", document));
    }
    assert.doesNotMatch(
      text,
      /current app is a frontend prototype|currently a simulated frontend prototype|real model gateway are not production implementations/i,
      `${entry} must not describe the deployed application as UI-only`,
    );
  }
});

test("keeps default recovery documents bounded instead of reintroducing a historical transcript", async () => {
  for (const [file, limit] of [
    ["AGENTS.md", 170],
    ["docs/CURRENT_STATE.md", 150],
    ["docs/WORKFLOW.md", 150],
    ["docs/IMPLEMENTATION_PLAN.md", 150],
    ["docs/BACKLOG.md", 100],
  ]) {
    const lines = (await readDocument(file)).trimEnd().split(/\r?\n/).length;
    assert.ok(lines <= limit, `${file}: ${lines} lines exceeds ${limit}; move detail to task/history`);
  }
});

test("keeps fast delivery and real-provider test isolation in every new-session path", async () => {
  const agents = await readDocument("AGENTS.md");
  const workflow = await readDocument("docs/WORKFLOW.md");
  const testing = await readDocument("docs/TESTING.md");

  assert.match(agents, /smallest behaviorally\s+complete change/);
  assert.match(agents, /Never let fixtures\s+or synthetic jobs share a database or queue with a real-provider Worker/);
  assert.match(workflow, /实现稳定后只跑一次 `npm run check:local`/);
  assert.match(workflow, /禁止让测试 outbox 进入真实\s+O1Key Worker/);
  assert.match(testing, /Never run a fixture-writing test against the active 3010 real-provider stack/);
  assert.match(testing, /site owner explicitly requests that\s+specific generation call/);
});

test("current context, task, and release links resolve inside the repository", async () => {
  const files = [
    "AGENTS.md", "README.md", "docs/README.md", "docs/CURRENT_STATE.md",
    "docs/WORKFLOW.md", "docs/IMPLEMENTATION_PLAN.md", "docs/BACKLOG.md",
    "docs/history/README.md",
  ];
  for (const directory of ["docs/tasks", "docs/releases"]) {
    files.push(...(await readdir(path.join(root, directory)))
      .filter((file) => file.endsWith(".md"))
      .map((file) => `${directory}/${file}`));
  }
  for (const file of files) {
    const text = await readDocument(file);
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(path.join(root, file)), target.split("#")[0]);
      const relative = path.relative(root, resolved);
      assert.ok(relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
        `${file}: link escapes repository: ${target}`);
      await assert.doesNotReject(access(resolved), `${file}: missing link ${target}`);
    }
  }
});

test("records the same immutable deployment identity in the snapshot and referenced release receipt", async () => {
  const state = await readDocument("docs/CURRENT_STATE.md");
  const receiptPath = state.match(/\]\((releases\/[^)]+\.md)\)/)?.[1];
  assert.ok(receiptPath, "CURRENT_STATE must link its latest release receipt");
  const receipt = await readDocument(`docs/${receiptPath}`);
  const revision = state.match(/\| 源码 revision \| `([a-f0-9]{40})`/i)?.[1];
  const image = state.match(/ghcr\.io\/[^`\s]+@sha256:[a-f0-9]{64}/)?.[0];
  const migration = state.match(/\| 数据库迁移 \| `([^`]+\.sql)`/)?.[1];
  assert.ok(revision && image && migration, "snapshot needs full source, digest, and migration");
  for (const identity of [revision, image, migration]) {
    assert.ok(receipt.includes(identity), `release receipt disagrees with snapshot: ${identity}`);
  }
  // This checks recorded consistency, not host health or that main is deployed.
});

test("preserves a discoverable archive and a resumable task template", async () => {
  const archiveIndex = await readDocument("docs/history/README.md");
  assert.match(archiveIndex, /2026-09-07-implementation-log\.md/);
  const archive = await readDocument("docs/history/2026-09-07-implementation-log.md");
  assert.match(archive, /Historical evidence only/);
  assert.match(archive, /archive\/c6-deletion-content-safety-20260907/);
  const template = await readDocument("docs/tasks/TEMPLATE.md");
  for (const field of ["状态", "分支 / worktree", "范围与验收", "实现与证据", "恢复工作", "下一步"]) {
    assert.ok(template.includes(field), `task template missing ${field}`);
  }
  const backlog = await readDocument("docs/BACKLOG.md");
  const cards = (await readdir(path.join(root, "docs/tasks")))
    .filter((file) => /^GG-\d{3}-.+\.md$/.test(file));
  for (const card of cards) {
    assert.ok(backlog.includes(card), `BACKLOG must index ${card}`);
    assert.match(await readDocument(`docs/tasks/${card}`), /下一步/);
  }
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
