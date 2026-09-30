import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { readCanvasProjectRecord, saveCanvasProjectRecord } from "../server/canvas-projects/repository.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const OWNER = "10000000-0000-4000-8000-000000000001";
const WORKSPACE = "30000000-0000-4000-8000-000000000003";
const PROJECT = "40000000-0000-4000-8000-000000000004";
const REFERENCE = "50000000-0000-4000-8000-000000000005";
const GENERATED = "60000000-0000-4000-8000-000000000006";
const VIDEO = "70000000-0000-4000-8000-000000000007";
const AUDIO = "80000000-0000-4000-8000-000000000008";
const JOB = "90000000-0000-4000-8000-000000000009";

function page(id = "page-1", name = "页面1") {
  return { id, name, nodes: [], edges: [], generators: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } };
}

function generatorPage(id, prompt = "独立提示词") {
  return { ...page(id), nodes: [{ id: `generator-${id}`, type: "imageGenerator", position: { x: 5, y: 8 } }],
    generators: { [`generator-${id}`]: {
      draft: { prompt, modelKey: null, ratio: "adaptive", resolution: "2K", count: 1 }, directReferenceIds: [],
    } } };
}

function input(pages = [page()], expectedVersion = null) {
  return { name: "画布", expectedVersion, document: { schemaVersion: 2, pages } };
}

function valid(pages, expectedVersion = null) {
  return validateCanvasProjectSave(input(pages, expectedVersion));
}

function invalid(value) {
  assert.throws(() => validateCanvasProjectSave(value), (error) => error.code === "INVALID_CANVAS_PROJECT");
}

test("legacy graphs retain v1 while v2 persists ordered independent pages", () => {
  const { id: _id, name: _name, ...content } = generatorPage("legacy");
  const legacy = validateCanvasProjectSave({ ...input(), document: { schemaVersion: 1, ...content } });
  assert.equal(legacy.document.schemaVersion, 1);
  assert.equal(legacy.document.nodes[0].id, "generator-legacy");
  const document = valid([generatorPage("first", "第一页"), generatorPage("second", "第二页")]).document;
  assert.equal(document.schemaVersion, 2);
  assert.deepEqual(document.pages.map((item) => item.id), ["first", "second"]);
  assert.equal(document.pages[1].generators["generator-second"].draft.prompt, "第二页");
});

test("pages enforce one through ten and stable unique identities", () => {
  assert.equal(valid(Array.from({ length: 10 }, (_, index) => page(`page-${index + 1}`))).document.pages.length, 10);
  invalid(input([]));
  invalid(input(Array.from({ length: 11 }, (_, index) => page(`page-${index + 1}`))));
  invalid(input([page(), page()]));
  invalid(input([page("../foreign")]));
  invalid(input([page("page-1", "   ")]));
  invalid(input([page("page-1", "字".repeat(21))]));
  assert.equal(valid([page("page-1", "字".repeat(20))]).document.pages[0].name.length, 20);
});

test("edges remain on their page and node and edge identities are project-wide", () => {
  const first = generatorPage("first");
  const second = generatorPage("second");
  second.edges = [{ id: "edge-cross-page", source: "generator-first", target: "generator-second" }];
  invalid(input([first, second]));
  invalid(input([first, { ...first, id: "different-page" }]));
  first.edges = [{ id: "same-edge", source: "generator-first", target: "generator-first" }];
  second.edges = [{ id: "same-edge", source: "generator-second", target: "generator-second" }];
  invalid(input([first, second]));
});

test("project aggregate node, edge and byte limits do not multiply with pages", () => {
  const first = page("first");
  const second = page("second");
  for (const [target, prefix, count] of [[first, "a", 600], [second, "b", 401]]) {
    target.nodes = Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}`, type: "sourceImage",
      asset: { id: REFERENCE, kind: "reference" }, position: { x: 0, y: 0 } }));
  }
  invalid(input([first, second]));
  first.nodes = first.nodes.slice(0, 1);
  second.nodes = second.nodes.slice(0, 1);
  first.edges = Array.from({ length: 1500 }, (_, index) => ({ id: `a-edge-${index}`, source: "a-0", target: "a-0" }));
  second.edges = Array.from({ length: 1501 }, (_, index) => ({ id: `b-edge-${index}`, source: "b-0", target: "b-0" }));
  invalid(input([first, second]));
  const large = page();
  for (let index = 0; index < 300; index += 1) {
    const sample = generatorPage(`large-${index}`, "a".repeat(4000));
    large.nodes.push(...sample.nodes);
    Object.assign(large.generators, sample.generators);
  }
  assert.throws(() => valid([large]), (error) => error.code === "PAYLOAD_TOO_LARGE" && error.status === 413);
});

test("browser state never enters either schema or a later page", () => {
  const source = input([page(), generatorPage("second")]);
  source.document.activePageId = "second";
  invalid(source);
  delete source.document.activePageId;
  source.document.pages[1].nodes[0].localJob = { id: JOB };
  invalid(source);
  delete source.document.pages[1].nodes[0].localJob;
  source.document.pages[1].generators["generator-second"].pendingReferences = [{ id: "local", name: "本机" }];
  invalid(source);
});

function fakePool({ role = "personal_owner", resources = {} } = {}) {
  let row = null;
  const statements = [];
  const client = {
    async query(statement, parameters = []) {
      statements.push({ statement, parameters });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(statement)) return { rows: [], rowCount: 0 };
      if (statement.trimStart().startsWith("SELECT project_id FROM canvas_project_deletions")) return { rows: [], rowCount: 0 };
      if (statement.includes("FROM users u")) return { rows: [{ workspace_id: WORKSPACE,
        kind: role === "personal_owner" ? "personal" : "organization", name: "Workspace", status: "active",
        membership_role: role, membership_status: "active" }], rowCount: 1 };
      for (const [kind, table] of [["reference", "reference_assets"], ["generated", "assets a"],
        ["video", "video_materials"], ["audio", "audio_materials"], ["job", "generation_jobs j"]]) {
        if (!statement.includes(`FROM ${table}`)) continue;
        assert.equal(parameters[1], WORKSPACE);
        assert.equal(parameters[2], OWNER);
        const allowed = new Set(resources[kind] ?? []);
        const rows = parameters[0].filter((id) => allowed.has(id)).map((id) => ({ id }));
        return { rows, rowCount: rows.length };
      }
      if (statement.includes("INSERT INTO canvas_projects")) {
        if (row) return { rows: [], rowCount: 0 };
        row = { id: parameters[0], name: parameters[3], document: JSON.parse(parameters[4]),
          content_hash: parameters[5], version: 1, updated_at: new Date("2026-09-30T00:00:00Z") };
        return { rows: [row], rowCount: 1 };
      }
      if (statement.includes("UPDATE canvas_projects")) {
        row = { ...row, name: parameters[3], document: JSON.parse(parameters[4]), content_hash: parameters[5],
          version: row.version + 1, updated_at: new Date("2026-09-30T00:01:00Z") };
        return { rows: [row], rowCount: 1 };
      }
      if (statement.includes("FROM canvas_projects")) {
        const allowed = row && parameters[0] === row.id && parameters[1] === WORKSPACE && parameters[2] === OWNER;
        return { rows: allowed ? [row] : [], rowCount: allowed ? 1 : 0 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    },
    release() {},
  };
  return { statements, connect: async () => client, query: (...args) => client.query(...args) };
}

test("v2 save/read preserves all pages and blocks stale edits and legacy downgrade", async () => {
  const pool = fakePool();
  const source = valid([generatorPage("first"), generatorPage("second")]);
  const saved = await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: source });
  assert.equal(saved.version, 1);
  assert.equal((await readCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT })).document.pages.length, 2);
  assert.equal((await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: source })).version, 1);
  const changed = valid([generatorPage("first", "已修改"), generatorPage("second")], 1);
  assert.equal((await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: changed })).version, 2);
  await assert.rejects(saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT,
    input: valid([page()], 1) }), (error) => error.code === "VERSION_CONFLICT");
  const { id: _id, name: _name, ...content } = page();
  const legacy = validateCanvasProjectSave({ name: "画布", expectedVersion: 2,
    document: { schemaVersion: 1, ...content } });
  await assert.rejects(saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: legacy }),
    (error) => error.code === "CANVAS_SCHEMA_UPGRADE_REQUIRED" && error.status === 400 && !error.retryable);
  assert.equal((await readCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT })).document.pages.length, 2);
});

test("resources on later pages receive the same owner/workspace and readiness validation", async () => {
  const later = generatorPage("later");
  later.nodes.push({ id: "source-later", type: "sourceImage", position: { x: 0, y: 0 },
    asset: { id: REFERENCE, kind: "reference" } });
  later.edges.push({ id: "reference-edge", source: "source-later", target: "generator-later" });
  later.convertedReferences["reference-edge"] = REFERENCE;
  later.generators["generator-later"].directReferenceIds = [REFERENCE];
  const denied = fakePool();
  await assert.rejects(saveCanvasProjectRecord(denied, { ownerId: OWNER, projectId: PROJECT,
    input: valid([page(), later]) }), (error) => error.code === "CANVAS_RESOURCE_UNAVAILABLE");
  assert.equal(denied.statements.some((entry) => entry.statement.includes("INSERT INTO canvas_projects")), false);
  const allowed = fakePool({ resources: { reference: [REFERENCE] } });
  await saveCanvasProjectRecord(allowed, { ownerId: OWNER, projectId: PROJECT, input: valid([page(), later]) });
  const queries = allowed.statements.filter((entry) => entry.statement.includes("FROM reference_assets"));
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].parameters[0], [REFERENCE]);
  assert.match(queries[0].statement, /upload_state = 'ready'.*moderation_state = 'accepted'/s);
});

test("generated organization assets follow manager reads while jobs and uploaded media stay owned", async () => {
  const later = generatorPage("later");
  later.nodes[0].jobId = JOB;
  for (const [kind, type, id] of [["generated", "sourceImage", GENERATED], ["video", "sourceVideo", VIDEO],
    ["audio", "sourceAudio", AUDIO]]) {
    later.nodes.push({ id: `source-${kind}`, type, position: { x: 0, y: 0 }, asset: { id, kind } });
  }
  for (const [role, expected] of [["personal_owner", false], ["org_member", false], ["org_admin", true], ["org_owner", true]]) {
    const pool = fakePool({ role, resources: { generated: [GENERATED], job: [JOB], video: [VIDEO], audio: [AUDIO] } });
    await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: valid([page(), later]) });
    assert.equal(pool.statements.find((entry) => entry.statement.includes("FROM assets a")).parameters[3], expected);
    assert.match(pool.statements.find((entry) => entry.statement.includes("FROM generation_jobs j")).statement,
      /j\.workspace_id = \$2 AND j\.owner_id = \$3/);
  }
});

test("legacy-to-pages upgrade and movement preserve old unavailable resource identities", async () => {
  const resources = { reference: [REFERENCE] };
  const pool = fakePool({ resources });
  const original = page();
  original.nodes = [{ id: "existing-source", type: "sourceImage", position: { x: 1, y: 2 },
    asset: { id: REFERENCE, kind: "reference" } }];
  const { id: _id, name: _name, ...content } = original;
  await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT,
    input: validateCanvasProjectSave({ name: "画布", expectedVersion: null, document: { schemaVersion: 1, ...content } }) });
  resources.reference = [];
  const before = pool.statements.filter((entry) => entry.statement.includes("FROM reference_assets")).length;
  original.nodes[0].position = { x: 20, y: 30 };
  const upgraded = await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT,
    input: valid([original, page("second")], 1) });
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.document.pages[0].nodes[0].asset.id, REFERENCE);
  assert.equal(pool.statements.filter((entry) => entry.statement.includes("FROM reference_assets")).length, before);
  const foreign = "a0000000-0000-4000-8000-00000000000a";
  original.nodes.push({ id: "new-source", type: "sourceImage", position: { x: 0, y: 0 },
    asset: { id: foreign, kind: "reference" } });
  await assert.rejects(saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT,
    input: valid([original, page("second")], 2) }), (error) => error.code === "CANVAS_RESOURCE_UNAVAILABLE");
  const query = pool.statements.filter((entry) => entry.statement.includes("FROM reference_assets")).at(-1);
  assert.deepEqual(query.parameters[0], [foreign]);
});

test("page removal edits only project JSON and retains a surviving page", async () => {
  const pool = fakePool();
  await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: valid([page(), page("second")]) });
  const saved = await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: valid([page()], 1) });
  assert.equal(saved.document.pages.length, 1);
  assert.equal(pool.statements.some((entry) => /DELETE FROM|UPDATE (assets|reference_assets|generation_jobs)/.test(entry.statement)), false);
  invalid(input([]));
});

test("multi-page migration widens the version check without rewriting existing content", async () => {
  const migration = await readFile(new URL("../migrations/0055_gg218_canvas_project_pages.sql", import.meta.url), "utf8");
  assert.match(migration, /schemaVersion' IN \('1', '2'\)/);
  assert.match(migration, /pg_column_size\(document\) <= 1048576/);
  assert.doesNotMatch(migration, /UPDATE canvas_projects|DELETE FROM|ADD COLUMN|DROP TABLE/);
});
