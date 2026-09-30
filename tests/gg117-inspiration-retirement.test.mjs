import assert from "node:assert/strict";
import {readdir, readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {parseWorkspaceRoute,workspaceRouteHref} from "../features/navigation/workspace-route.mjs";

const root = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const read = (relative) => readFile(path.join(root, relative), "utf8");
// Children before the parent: inspiration_cases has an inbound foreign key from
// each of the other four, so any other order fails on a live database.
const droppedTables = [
  "inspiration_interactions",
  "inspiration_generation_prompts",
  "inspiration_likes",
  "inspiration_events",
  "inspiration_cases",
];

/** Every source file under the given directory, as paths relative to the repo. */
async function sourceFiles(directory, pattern = /\.(mjs|ts|tsx)$/) {
  const found = [];
  async function walk(relative) {
    let entries;
    try {
      entries = await readdir(path.join(root, relative), {withFileTypes: true});
    } catch {
      return; // The directory is gone, which is the point of most of these tests.
    }
    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else if (pattern.test(entry.name)) found.push(child);
    }
  }
  await walk(directory);
  return found;
}

test("GG-117 the inspiration routes, components, boundary modules and DTO are gone", async () => {
  for (const directory of ["app", "features", "server", "shared"]) {
    for (const relative of await sourceFiles(directory)) {
      assert.doesNotMatch(
        relative,
        /(^|\/)inspiration(\/|\.)/,
        `${relative} must be removed with the feature`,
      );
    }
  }
  assert.doesNotMatch(
    await read("shared/contracts").catch(() => ""),
    /inspiration/,
  );
  const contracts = await readdir(path.join(root, "shared/contracts"));
  assert.ok(!contracts.includes("inspiration.mjs"));
  const app = await readdir(path.join(root, "app"));
  assert.ok(!app.includes("inspiration"));
  assert.ok(!(await readdir(path.join(root, "app/api"))).includes("inspiration"));
});

test("GG-117 no surviving module imports a retired inspiration path", async () => {
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("features")),
    ...(await sourceFiles("server")),
    ...(await sourceFiles("shared")),
  ];
  assert.ok(files.length > 0, "the source scan must actually find files");
  for (const file of files) {
    const text = await read(file);
    assert.doesNotMatch(
      text,
      /inspiration/i,
      `${file} still references the retired feature`,
    );
  }
});

test("GG-117 no source file still names the dropped tables or a retired error code", async () => {
  // ADR 0104 keeps the three original migrations as the immutable record of what
  // existed; the new drop migration is the one place the names must still
  // appear. Every other file must be free of them.
  const historical = /00(36_gg073|37_gg074|38_gg077)|gg117/;
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("features")),
    ...(await sourceFiles("server")),
    ...(await sourceFiles("shared")),
    ...(await sourceFiles("db")),
    ...(await sourceFiles("migrations", /\.sql$/)).filter((file) => !historical.test(file)),
  ];
  for (const file of files) {
    const text = await read(file);
    for (const table of droppedTables) {
      assert.doesNotMatch(
        text,
        new RegExp(`\\b${table}\\b`),
        `${file} still references the dropped ${table} table`,
      );
    }
    assert.doesNotMatch(
      text,
      /ASSET_PUBLISHED/,
      `${file} still carries the retired ASSET_PUBLISHED conflict`,
    );
  }
});

test("GG-117 the workspace router no longer resolves, renders or links the retired routes", async () => {
  // Unknown paths fall through to the creation workspace: the route kinds are
  // removed rather than remapped to a surviving view.
  for (const pathname of [
    "/inspiration",
    "/inspiration/",
    "/inspiration/edit/00000000-0000-4000-8000-000000000073",
    "/inspiration/use/00000000-0000-4000-8000-000000000073",
  ]) {
    assert.deepEqual(parseWorkspaceRoute(pathname), {kind: "create"}, pathname);
  }
  for (const kind of ["create", "profile", "projects", "assets", "credits", "feedback", "distribution", "organizations"]) {
    assert.doesNotMatch(workspaceRouteHref({kind}), /inspiration/);
  }
  assert.doesNotMatch(await read("features/navigation/workspace-route.mjs"), /inspiration/i);
});

test("GG-117 the page, the node runtime and the composer no longer mount the feature", async () => {
  const retiredViews = /InspirationBoard|CaseEditor|CaseReplica|UseCaseResult|createInspirationNodeApiHandler|handleInspirationNodeApi|CaseComparisonSettings/;
  for (const file of [
    "app/page.tsx",
    "server/runtime/web.mjs",
    "features/creation/http-generation-boundary.ts",
    "features/creation/creation-composer.tsx",
  ]) {
    const text = await read(file);
    assert.doesNotMatch(text, /inspiration/i, `${file} still names the feature`);
    assert.doesNotMatch(text, retiredViews, `${file} still references a retired view`);
    assert.doesNotMatch(text, /灵感板/, `${file} still renders an inspiration label`);
  }
  const page = await read("app/page.tsx");
  assert.doesNotMatch(page, /activeView === "inspiration"/);
  assert.doesNotMatch(page, /handleInspirationNav|requestInspirationCase|applyInspirationCase/);
  assert.doesNotMatch(page, /CaseComparisonSettings|casePublicationIssue/);
  // The hidden-parameter plumbing existed only for the retired private presets,
  // so it goes with them rather than staying as a dead wire field.
  for (const file of [
    "app/page.tsx",
    "features/creation/creation-composer.tsx",
    "features/creation/http-generation-boundary.ts",
    "shared/contracts/generation.ts",
  ]) {
    assert.doesNotMatch(await read(file), /parametersHidden|parameters_hidden|预设参数已隐藏/);
  }
  for (const file of ["server/generation/repository.mjs", "server/generation/api.mjs", "server/generation/worker-service.mjs"]) {
    assert.doesNotMatch(await read(file), /parameters_hidden|parametersHidden|frozenPreset|presetCaseId/);
  }
});

test("GG-117 the drop migration removes all five tables, children before parent", async () => {
  const migrations = (await readdir(path.join(root, "migrations"))).sort();
  const drop = migrations.filter((name) => /gg117/.test(name));
  assert.equal(drop.length, 1, "exactly one GG-117 drop migration is expected");
  const text = await readFile(path.join(root, "migrations", drop[0]), "utf8");

  const statements = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const drops = [...statements.matchAll(/DROP TABLE (?:IF EXISTS )?"?([a-z_]+)"?/gi)].map(
    (match) => match[1],
  );
  assert.deepEqual(drops, droppedTables);
  assert.equal(new Set(drops).size, drops.length, "a table must not be dropped twice");
  // CASCADE is deliberately absent: the child-first order is written out so the
  // drop can never take an object this migration did not name. (The header
  // comment explains why, which is why the comment is stripped first.)
  assert.doesNotMatch(statements, /CASCADE/i);
  assert.doesNotMatch(statements, /ALTER TABLE|CREATE TABLE|RENAME/i);
  assert.ok(
    migrations.indexOf(drop[0]) === migrations.length - 1,
    "the drop must sort after every migration that creates the tables",
  );
});

test("GG-117 the retired decision records stay indexed as history", async () => {
  const cards = (await readdir(path.join(root, "docs/tasks"))).filter((file) =>
    /^GG-117-.+\.md$/.test(file),
  );
  assert.equal(cards.length, 1);
  const backlog = await read("docs/BACKLOG.md");
  assert.ok(backlog.includes(cards[0]), "BACKLOG must still index the GG-117 card");
  assert.match(await read(`docs/tasks/${cards[0]}`), /下一步/);
  // ADR history is kept and marked retired in place; deleting the files would
  // break the decision index rather than record the retirement.
  const index = await read("docs/decisions/README.md");
  for (const record of [
    "0076-shareable-inspiration-cases.md",
    "0077-inspiration-editor-private-presets.md",
    "0078-inspiration-visibility-and-statistics.md",
  ]) {
    assert.ok(index.includes("`" + record + "`"), `ADR index must keep ${record}`);
    assert.match(
      await read(`docs/decisions/${record}`),
      /retired by ADR 0104|Retired by ADR 0104/i,
      `${record} must record its retirement`,
    );
  }
});

test("GG-117 the docs name the real drop migration instead of a placeholder", async () => {
  // The data-model doc is the place a future window looks before touching the
  // drop. It must point at the file that exists, or someone authors a second one.
  const migrations = await readdir(path.join(root, "migrations"));
  const drop = migrations.filter((name) => /gg117/.test(name));
  assert.equal(drop.length, 1);
  const dataModel = await read("docs/DATA_MODEL.md");
  assert.ok(
    dataModel.includes(`migrations/${drop[0]}`),
    "docs/DATA_MODEL.md must cite the real GG-117 migration filename",
  );
  assert.doesNotMatch(
    dataModel,
    /is not fixed at the time of writing|next free .*00NN_gg117/,
    "docs/DATA_MODEL.md must not claim the migration filename is undecided",
  );
  // Production is not executed by this change, and the docs must say so rather
  // than implying the drop already ran.
  assert.match(dataModel, /not applied to any live database yet|production/i);
});
