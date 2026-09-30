import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import { CanvasProjectError } from "../server/canvas-projects/errors.mjs";
import { createCanvasProjectNodeApiHandler } from "../server/canvas-projects/node-api.mjs";
import { deleteCanvasProjectRecord, listCanvasProjectRecords, listDeletedCanvasProjectIds,
  readCanvasProjectRecord, renameCanvasProjectRecord, saveCanvasProjectRecord } from "../server/canvas-projects/repository.mjs";
import { validateCanvasProjectDelete, validateCanvasProjectRename, validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { createProjectNodeApiHandler } from "../server/projects/node-api.mjs";
import { deleteProject, findProject, renameProject } from "../server/projects/repository.mjs";
import { validateProjectRenameRequest } from "../server/projects/validation.mjs";

const OWNER = "10000000-0000-4000-8000-000000000001";
const FOREIGN = "20000000-0000-4000-8000-000000000002";
const WORKSPACE = "30000000-0000-4000-8000-000000000003";
const PROJECT = "40000000-0000-4000-8000-000000000004";
const LOCAL = "50000000-0000-4000-8000-000000000005";
const scope = { ownerId: OWNER, workspaceId: WORKSPACE, projectId: PROJECT };
const document = { schemaVersion: 2, pages: [{ id: "page-1", name: "页面1", nodes: [], edges: [],
  generators: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } }] };
const hash = (name, source = document) => createHash("sha256").update(JSON.stringify({ name, document: source })).digest("hex");
const canvas = () => ({ id: PROJECT, owner_id: OWNER, workspace_id: WORKSPACE, name: "画布", document: structuredClone(document),
  content_hash: hash("画布"), version: 7, updated_at: "2026-09-30T01:00:00Z" });
const legacy = () => ({ id: PROJECT, creator_owner_id: OWNER, workspace_id: WORKSPACE, name: "创作", status: "active",
  version: 3, updated_at: "2026-09-30T01:00:00Z", prompt: "保留提示词", reference_snapshot: [{ id: LOCAL }], batch_ids: [LOCAL] });

// Only in-memory SQL stand-ins. There is no configured database, queue, storage,
// provider or live server in this suite. The exclusive lock models the existing
// FOR UPDATE OF w contract so first-create/delete order can be exercised.
function fakePool({ initialCanvas = canvas(), initialLegacy = legacy(), access = true, beforeQuery = async () => {} } = {}) {
  let state = { canvas: initialCanvas, legacy: initialLegacy, retired: [] };
  let tail = Promise.resolve();
  const statements = [];
  const key = ([id, workspace, owner]) => `${id}:${workspace}:${owner}`;
  function client() {
    let unlock;
    let snapshot;
    return {
      async query(statement, parameters = []) {
        statements.push({ statement, parameters });
        if (statement === "BEGIN") return { rows: [], rowCount: 0 };
        if (["COMMIT", "ROLLBACK"].includes(statement)) {
          if (statement === "ROLLBACK" && snapshot) state = snapshot;
          unlock?.();
          unlock = undefined;
          return { rows: [], rowCount: 0 };
        }
        if (statement.includes("FROM users u")) {
          if (!access || parameters[1] && parameters[1] !== WORKSPACE) return { rows: [], rowCount: 0 };
          if (statement.includes("FOR UPDATE OF w")) {
            const previous = tail;
            tail = new Promise((resolve) => { unlock = resolve; });
            await previous;
            snapshot = structuredClone(state);
          }
          return { rows: [{ workspace_id: WORKSPACE, kind: "organization", name: "Test", status: "active",
            membership_role: "org_member", membership_status: "active" }], rowCount: 1 };
        }
        await beforeQuery(statement, parameters);
        if (statement.includes("INSERT INTO canvas_project_deletions")) {
          if (!state.retired.includes(key(parameters))) state.retired.push(key(parameters));
          return { rows: [], rowCount: 1 };
        }
        if (statement.includes("FROM canvas_projects")) {
          let row = state.canvas;
          const allowed = row && (parameters.length === 2 ? row.workspace_id === parameters[0] && row.owner_id === parameters[1] :
            row.id === parameters[0] && row.workspace_id === parameters[1] && row.owner_id === parameters[2]);
          if (!allowed || statement.includes("NOT EXISTS") && state.retired.includes(key([row.id, row.workspace_id, row.owner_id]))) row = null;
          return { rows: row ? [structuredClone(row)] : [], rowCount: row ? 1 : 0 };
        }
        if (statement.includes("FROM canvas_project_deletions")) {
          const values = parameters.length === 3 ? state.retired.filter((entry) => entry === key(parameters)) :
            state.retired.filter((entry) => entry.endsWith(`:${parameters[0]}:${parameters[1]}`));
          return { rows: values.map((entry) => ({ project_id: entry.split(":")[0] })), rowCount: values.length };
        }
        if (statement.includes("INSERT INTO canvas_projects")) {
          if (state.canvas) return { rows: [], rowCount: 0 };
          state.canvas = { id: parameters[0], workspace_id: parameters[1], owner_id: parameters[2], name: parameters[3],
            document: JSON.parse(parameters[4]), content_hash: parameters[5], version: 1, updated_at: "2026-09-30T01:01:00Z" };
          return { rows: [structuredClone(state.canvas)], rowCount: 1 };
        }
        if (statement.includes("UPDATE canvas_projects")) {
          state.canvas.name = parameters[3];
          if (statement.includes("document = $5")) {
            state.canvas.document = JSON.parse(parameters[4]);
            state.canvas.content_hash = parameters[5];
          } else state.canvas.content_hash = parameters[4];
          state.canvas.version += 1;
          state.canvas.updated_at = "2026-09-30T01:01:00Z";
          return { rows: [structuredClone(state.canvas)], rowCount: 1 };
        }
        if (statement.includes("FROM projects")) {
          const row = state.legacy;
          const allowed = row && row.id === parameters[0] && row.workspace_id === parameters[1] && row.creator_owner_id === parameters[2] &&
            (!statement.includes("status = 'active'") || row.status === "active");
          return { rows: allowed ? [structuredClone(row)] : [], rowCount: allowed ? 1 : 0 };
        }
        if (statement.includes("UPDATE projects")) {
          if (statement.includes("status = 'archived'")) state.legacy.status = "archived";
          else state.legacy.name = parameters[3];
          state.legacy.version += 1;
          state.legacy.updated_at = "2026-09-30T01:01:00Z";
          return { rows: [structuredClone(state.legacy)], rowCount: 1 };
        }
        throw new Error(`Unexpected SQL: ${statement}`);
      },
      release() { unlock?.(); unlock = undefined; },
    };
  }
  return { statements, get state() { return structuredClone(state); }, connect: async () => client(), query: (...args) => client().query(...args) };
}

test("management requests accept only name and positive CAS version with unchanged name limits", () => {
  assert.deepEqual(validateCanvasProjectRename({ name: "  新画布  ", expectedVersion: 7 }), { name: "新画布", expectedVersion: 7 });
  assert.deepEqual(validateCanvasProjectDelete({ expectedVersion: null }), { expectedVersion: null });
  assert.deepEqual(validateCanvasProjectDelete({ expectedVersion: 7 }), { expectedVersion: 7 });
  assert.deepEqual(validateProjectRenameRequest({ name: "  新创作  " }), { name: "新创作" });
  for (const value of [{ name: " ", expectedVersion: 7 }, { name: "字".repeat(21), expectedVersion: 7 },
    { name: "名字", expectedVersion: null }, { name: "名字", expectedVersion: 0 },
    { name: "名字", expectedVersion: 1, document }]) {
    assert.throws(() => validateCanvasProjectRename(value), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
  for (const value of [{}, { expectedVersion: -1 }, { expectedVersion: "7" }, { expectedVersion: null, document }]) {
    assert.throws(() => validateCanvasProjectDelete(value), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
  for (const value of [{ name: " " }, { name: "字".repeat(33) }, { name: "非法\u0000名称" }, { name: "名字", state: {} }]) {
    assert.throws(() => validateProjectRenameRequest(value), (error) => error.code === "INVALID_PROJECT");
  }
});

test("canvas rename preserves the current graph, hashes it with its new name and supports response-loss retries", async () => {
  const pool = fakePool();
  const saved = await renameCanvasProjectRecord(pool, { ...scope, input: { name: "新名称", expectedVersion: 7 } });
  assert.deepEqual(saved, { id: PROJECT, name: "新名称", version: 8, updatedAt: "2026-09-30T01:01:00.000Z" });
  assert.deepEqual(pool.state.canvas.document, document);
  assert.equal(pool.state.canvas.content_hash, hash("新名称"));
  assert.deepEqual(await renameCanvasProjectRecord(pool, { ...scope, input: { name: "新名称", expectedVersion: 7 } }), saved);
  assert.equal(pool.state.canvas.version, 8);
  await assert.rejects(renameCanvasProjectRecord(pool, { ...scope, input: { name: "旧标签覆盖", expectedVersion: 7 } }),
    (error) => error.code === "VERSION_CONFLICT" && error.status === 409);
  assert.equal(pool.state.canvas.name, "新名称");
  // The new hash must make a matching PUT idempotent too.
  assert.equal((await saveCanvasProjectRecord(pool, { ...scope, input: { name: "新名称", document, expectedVersion: 8 } })).version, 8);
});

test("canvas deletion uses CAS, is idempotent and retires reads, saves and index entries without deleting resources", async () => {
  const pool = fakePool();
  await assert.rejects(deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: 6 }), (error) => error.code === "VERSION_CONFLICT");
  assert.equal(pool.state.retired.length, 0);
  assert.deepEqual(await deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: 7 }), { id: PROJECT });
  assert.deepEqual(await deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: 6 }), { id: PROJECT });
  assert.deepEqual(pool.state.canvas, canvas());
  assert.deepEqual(await listCanvasProjectRecords(pool, scope), []);
  assert.deepEqual(await listDeletedCanvasProjectIds(pool, scope), [PROJECT]);
  for (const operation of [() => readCanvasProjectRecord(pool, scope),
    () => saveCanvasProjectRecord(pool, { ...scope, input: { name: "画布", document, expectedVersion: 7 } }),
    () => renameCanvasProjectRecord(pool, { ...scope, input: { name: "新名称", expectedVersion: 7 } })]) {
    await assert.rejects(operation, (error) => error.code === "CANVAS_PROJECT_DELETED" && error.status === 410 && !error.retryable);
  }
  assert.equal(pool.statements.some(({ statement }) => /DELETE FROM|UPDATE (assets|reference_assets|generation_jobs|generation_batches|credit_)/.test(statement)), false);
});

test("local-only retirement prevents a later first PUT; null cannot delete an ambiguously created cloud project", async () => {
  const pool = fakePool({ initialCanvas: null });
  assert.deepEqual(await deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: null }), { id: PROJECT });
  await assert.rejects(saveCanvasProjectRecord(pool, { ...scope, input: { name: "画布", document, expectedVersion: null } }),
    (error) => error.code === "CANVAS_PROJECT_DELETED");
  assert.equal(pool.state.canvas, null);
  const existing = fakePool();
  await assert.rejects(deleteCanvasProjectRecord(existing, { ...scope, expectedVersion: null }), (error) => error.code === "VERSION_CONFLICT");
  assert.equal(existing.state.retired.length, 0);
});

test("workspace and concrete ownership checks reject foreign management without leaking another project", async () => {
  const denied = fakePool({ access: false });
  await assert.rejects(deleteCanvasProjectRecord(denied, { ...scope, expectedVersion: null }), (error) => error.status === 403);
  assert.equal(denied.state.retired.length, 0);
  const foreign = fakePool();
  await assert.rejects(renameCanvasProjectRecord(foreign, { ...scope, ownerId: FOREIGN, input: { name: "外人", expectedVersion: 7 } }),
    (error) => error.code === "CANVAS_PROJECT_NOT_FOUND");
  await assert.rejects(deleteCanvasProjectRecord(foreign, { ...scope, ownerId: FOREIGN, expectedVersion: 7 }),
    (error) => error.code === "CANVAS_PROJECT_NOT_FOUND");
  assert.equal(await renameProject(foreign, { ...scope, ownerId: FOREIGN, name: "外人" }), null);
  assert.equal(await deleteProject(foreign, { ...scope, ownerId: FOREIGN }), null);
  assert.deepEqual(await listDeletedCanvasProjectIds(foreign, { ...scope, ownerId: FOREIGN }), []);
  // A local-only identity is scoped to its owner; it cannot retire another owner.
  await deleteCanvasProjectRecord(foreign, { ...scope, ownerId: FOREIGN, expectedVersion: null });
  assert.equal((await readCanvasProjectRecord(foreign, scope)).id, PROJECT);
});

test("legacy name-only rename preserves state and batches; archive deletion is repeatable and not readable", async () => {
  const pool = fakePool();
  const renamed = await renameProject(pool, { ...scope, name: "旧创作改名" });
  assert.deepEqual(renamed, { id: PROJECT, name: "旧创作改名", updatedAt: "2026-09-30T01:01:00.000Z" });
  assert.equal(pool.state.legacy.prompt, legacy().prompt);
  assert.deepEqual(pool.state.legacy.reference_snapshot, legacy().reference_snapshot);
  assert.deepEqual(pool.state.legacy.batch_ids, legacy().batch_ids);
  await deleteProject(pool, scope);
  const version = pool.state.legacy.version;
  assert.deepEqual(await deleteProject(pool, scope), { id: PROJECT });
  assert.equal(pool.state.legacy.version, version);
  assert.equal(pool.state.legacy.status, "archived");
  assert.equal(await findProject(pool, scope), null);
  assert.equal(await renameProject(pool, { ...scope, name: "复活" }), null);
  assert.equal(pool.statements.some(({ statement }) => /DELETE FROM|UPDATE generation_batches/.test(statement)), false);
});

test("database failures roll back retirement and do not report a successful delete", async () => {
  const pool = fakePool({ beforeQuery: async (statement) => {
    if (statement.includes("INSERT INTO canvas_project_deletions")) throw new Error("isolated database unavailable");
  } });
  await assert.rejects(deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: 7 }), /isolated database unavailable/);
  assert.equal(pool.state.retired.length, 0);
  assert.ok(pool.statements.some(({ statement }) => statement === "ROLLBACK"));
  assert.equal((await readCanvasProjectRecord(pool, scope)).id, PROJECT);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("first-create and local-only retirement share an exclusive workspace lock", async () => {
  const entered = deferred();
  const resume = deferred();
  const pool = fakePool({ initialCanvas: null, beforeQuery: async (statement) => {
    if (statement.includes("INSERT INTO canvas_project_deletions")) { entered.resolve(); await resume.promise; }
  } });
  const deleting = deleteCanvasProjectRecord(pool, { ...scope, expectedVersion: null });
  await entered.promise;
  const saving = saveCanvasProjectRecord(pool, { ...scope, input: { name: "画布", document, expectedVersion: null } });
  const rejected = assert.rejects(saving, (error) => error.code === "CANVAS_PROJECT_DELETED");
  resume.resolve();
  await deleting;
  await rejected;
  assert.equal(pool.state.canvas, null);
  assert.equal(pool.statements.filter(({ statement }) => statement.includes("FOR UPDATE OF w")).length, 2);
});

function request(options = {}) {
  const { path = `/api/canvas-projects/${PROJECT}`, method = "PATCH", contentType = "application/json" } = options;
  const body = Object.hasOwn(options, "body") ? options.body : { name: "新名称", expectedVersion: 7 };
  const result = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))]);
  result.url = path;
  result.method = method;
  result.headers = { "content-type": contentType, "x-goodgood-workspace-id": WORKSPACE };
  return result;
}

function response() {
  return { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(value) { this.body = JSON.parse(value); } };
}

test("canvas Node PATCH/DELETE preserve authenticated scope, bounded JSON and normalized gone errors", async () => {
  const calls = [];
  const handler = createCanvasProjectNodeApiHandler({ authenticate: async () => ({ ownerId: OWNER }), operations: {
    renameCanvasProject: async (input) => { calls.push(input); return { id: PROJECT, name: "新名称", version: 8 }; },
    deleteCanvasProject: async (input) => { calls.push(input); throw new CanvasProjectError("CANVAS_PROJECT_DELETED", "已删除", 410); },
  } });
  const renamed = response();
  await handler(request(), renamed);
  assert.equal(renamed.status, 200);
  assert.equal(renamed.headers["cache-control"], "no-store");
  assert.deepEqual(calls[0], { ownerContext: { ownerId: OWNER }, workspaceId: WORKSPACE, projectId: PROJECT, input: { name: "新名称", expectedVersion: 7 } });
  const gone = response();
  await handler(request({ method: "DELETE", body: { expectedVersion: 7 } }), gone);
  assert.equal(gone.status, 410);
  assert.equal(gone.body.error.retryable, false);
  const malformed = response();
  await handler(request({ body: "{bad" }), malformed);
  assert.equal(malformed.status, 400);
  const tooLarge = response();
  await handler(request({ body: "x".repeat(1024 * 1024 + 1) }), tooLarge);
  assert.equal(tooLarge.status, 413);
  const unsupported = response();
  await handler(request({ contentType: "text/plain" }), unsupported);
  assert.equal(unsupported.status, 415);
  assert.equal(calls.length, 2);
});

test("legacy Node name-only PATCH and body-free DELETE forward scope without changing complete PATCH", async () => {
  const calls = [];
  const handler = createProjectNodeApiHandler({ authenticate: async () => ({ ownerId: OWNER }), operations: {
    updateProject: async (value) => { calls.push(value); return { id: PROJECT, name: value.input.name }; },
    deleteProject: async (value) => { calls.push(value); return { id: PROJECT }; },
  } });
  for (const options of [{ method: "PATCH", body: { name: "新名称" } },
    { method: "PATCH", body: { name: "完整保存", state: { prompt: "保留完整状态" }, batchIds: [LOCAL] } },
    { method: "DELETE", body: undefined }]) {
    const result = response();
    await handler(request({ ...options, path: `/api/projects/${PROJECT}` }), result);
    assert.equal(result.status, 200);
    assert.equal(result.headers["cache-control"], "no-store");
  }
  assert.deepEqual(calls[0].input, { name: "新名称" });
  assert.equal(calls[1].input.state.prompt, "保留完整状态");
  assert.deepEqual(calls[2], { ownerContext: { ownerId: OWNER }, workspaceId: WORKSPACE, projectId: PROJECT });
});

test("the new retirement migration is additive and allows local-only project identities", async () => {
  const migration = await readFile(new URL("../migrations/0056_gg226_canvas_project_deletions.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE canvas_project_deletions/);
  assert.match(migration, /PRIMARY KEY \(project_id, workspace_id, owner_id\)/);
  assert.doesNotMatch(migration, /REFERENCES canvas_projects|UPDATE |DELETE FROM|DROP TABLE|ALTER TABLE/);
  // Use the original save validator to keep schema/body constraints in force.
  assert.deepEqual(validateCanvasProjectSave({ name: "画布", document, expectedVersion: null }).document.pages[0].nodes, []);
});
