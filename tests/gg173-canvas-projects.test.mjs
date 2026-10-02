import assert from "node:assert/strict";
import test from "node:test";

import { readCanvasProjectRecord, saveCanvasProjectRecord } from "../server/canvas-projects/repository.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER_OWNER = "20000000-0000-4000-8000-000000000002";
const WORKSPACE = "30000000-0000-4000-8000-000000000003";
const PROJECT = "40000000-0000-4000-8000-000000000004";
const GENERATOR = "generator-50000000-0000-4000-8000-000000000005";

function saveInput(name = "画布") {
  return {
    expectedVersion: null,
    name,
    document: {
      schemaVersion: 1,
      nodes: [{ id: GENERATOR, type: "imageGenerator", position: { x: 5, y: 8 }, size: { width: 238, height: 238 } }],
      edges: [],
      generators: { [GENERATOR]: {
        draft: { prompt: "第一行\n第二行", modelKey: null, ratio: "1:1", resolution: "1K", count: 1 },
        directReferenceIds: [],
      } },
      viewport: { x: 10, y: 20, zoom: 1 },
    },
  };
}

test("canvas project v1 accepts a durable graph and rejects browser-only fields", () => {
  const valid = validateCanvasProjectSave(saveInput());
  assert.equal(valid.document.generators[GENERATOR].draft.prompt, "第一行\n第二行");
  assert.deepEqual(valid.document.viewport, { x: 10, y: 20, zoom: 1 });
  const bad = saveInput();
  bad.document.nodes[0].pendingFileId = "browser-blob";
  assert.throws(() => validateCanvasProjectSave(bad), (error) => error.code === "INVALID_CANVAS_PROJECT");
  const oversized = saveInput();
  oversized.document.generators[GENERATOR].draft.prompt = "字".repeat(4001);
  assert.throws(() => validateCanvasProjectSave(oversized), (error) => error.code === "INVALID_CANVAS_PROJECT");
});

test("canvas project counts one through twelve round-trip and reject noninteger or out-of-range drafts", () => {
  const input = saveInput();
  for (const count of Array.from({ length: 12 }, (_, index) => index + 1)) {
    input.document.generators[GENERATOR].draft.count = count;
    assert.equal(validateCanvasProjectSave(input).document.generators[GENERATOR].draft.count, count);
  }
  for (const count of [0, 13, -1, 1.5, "2", null, NaN, Infinity]) {
    input.document.generators[GENERATOR].draft.count = count;
    assert.throws(() => validateCanvasProjectSave(input), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
});

function fakePool() {
  let row = null;
  const client = {
    async query(statement, parameters = []) {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(statement)) return { rows: [], rowCount: 0 };
      if (statement.includes("FROM users u")) {
        return { rows: [{ workspace_id: WORKSPACE, kind: "personal", name: "Personal", status: "active" }], rowCount: 1 };
      }
      if (statement.trim().startsWith("SELECT project_id FROM canvas_project_deletions")) return { rows: [], rowCount: 0 };
      if (statement.includes("INSERT INTO canvas_projects")) {
        if (row) return { rows: [], rowCount: 0 };
        row = { id: parameters[0], name: parameters[3], document: JSON.parse(parameters[4]),
          content_hash: parameters[5], version: 1, updated_at: new Date("2026-09-29T00:00:00Z") };
        return { rows: [row], rowCount: 1 };
      }
      if (statement.includes("UPDATE canvas_projects")) {
        row = { ...row, name: parameters[3], document: JSON.parse(parameters[4]),
          content_hash: parameters[5], version: row.version + 1, updated_at: new Date("2026-09-29T00:01:00Z") };
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
  return { connect: async () => client, query: (...args) => client.query(...args) };
}

test("a twelve-output generator survives server save and owner-scoped read", async () => {
  const pool = fakePool();
  const draft = saveInput();
  draft.document.generators[GENERATOR].draft.count = 12;
  const input = validateCanvasProjectSave(draft);
  const saved = await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input });
  assert.equal(saved.document.generators[GENERATOR].draft.count, 12);
  const restored = await readCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT });
  assert.equal(restored.document.generators[GENERATOR].draft.count, 12);
  assert.equal(await readCanvasProjectRecord(pool, { ownerId: OTHER_OWNER, projectId: PROJECT }), null);
});

test("canvas project save retries acknowledge the same content and reject stale edits", async () => {
  const pool = fakePool();
  const original = validateCanvasProjectSave(saveInput());
  const first = await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: original });
  assert.equal(first.version, 1);
  assert.equal((await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: original })).version, 1);
  const changed = validateCanvasProjectSave({ ...saveInput("新画布"), expectedVersion: 1 });
  assert.equal((await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: changed })).version, 2);
  assert.equal((await saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: changed })).version, 2);
  const stale = validateCanvasProjectSave({ ...saveInput("冲突画布"), expectedVersion: 1 });
  await assert.rejects(
    saveCanvasProjectRecord(pool, { ownerId: OWNER, projectId: PROJECT, input: stale }),
    (error) => error.code === "VERSION_CONFLICT" && error.status === 409,
  );
  assert.equal(await readCanvasProjectRecord(pool, { ownerId: OTHER_OWNER, projectId: PROJECT }), null);
});
