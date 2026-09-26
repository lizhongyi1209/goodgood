import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { deleteUploadedAsset } from "../server/assets/api.mjs";
import { createAssetNodeApiHandler } from "../server/assets/node-api.mjs";

const assetId = "20000000-0000-4000-8000-000000000001";

function fixture({ owner = "owner-a", failStorage = false, failRowDelete = false } = {}) {
  const statements = [];
  const deleted = [];
  const client = {
    async query(sql, values = []) {
      statements.push([sql, values]);
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rowCount: 0, rows: [] };
      if (sql.includes("JOIN workspaces w")) return { rows: [{ workspace_id: "workspace-a", kind: "personal" }] };
      if (sql.startsWith("SELECT object_key FROM")) return values[2] === "owner-a"
        ? { rowCount: 1, rows: [{ object_key: "private/asset/original" }] }
        : { rowCount: 0, rows: [] };
      if (sql.startsWith("DELETE FROM asset_organization")) return { rowCount: 1, rows: [] };
      if (sql.startsWith("UPDATE reference_assets")) return { rowCount: 1, rows: [] };
      if (sql.startsWith("DELETE FROM video_materials") || sql.startsWith("DELETE FROM audio_materials")) {
        if (failRowDelete) throw new Error("database failed");
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    release() {},
  };
  const resourcesOverride = {
    pool: { async connect() { return client; },
      async query(sql, values = []) { return client.query(sql, values); } },
    config: { objectStorage: { bucket: "disposable-assets" } },
    storage: { async send(command) {
      if (failStorage) throw new Error("storage failed");
      deleted.push({ command: command.constructor.name, key: command.input.Key });
    } },
  };
  return { ownerContext: { ownerId: owner }, resourcesOverride, statements, deleted };
}

test("uploaded file deletion removes organization and object after durable row change", async () => {
  for (const kind of ["reference", "video", "audio"]) {
    const setup = fixture();
    assert.deepEqual(await deleteUploadedAsset({ kind, assetId, ...setup }), { id: assetId, deleted: true });
    const sql = setup.statements.map(([statement]) => statement);
    const organization = sql.findIndex((statement) => statement.startsWith("DELETE FROM asset_organization"));
    const rowChange = sql.findIndex((statement) => statement.startsWith(kind === "reference" ? "UPDATE reference_assets" : `DELETE FROM ${kind}_materials`));
    assert.ok(organization > 0 && rowChange > organization);
    assert.ok(sql.indexOf("COMMIT") > rowChange);
    assert.deepEqual(setup.deleted, [{ command: "DeleteObjectCommand", key: "private/asset/original" }]);
    if (kind === "reference") assert.match(sql.at(-1), /object_deleted_at = now\(\)/);
  }
});

test("uploaded file deletion rejects foreign owners, invalid kinds, and failed transactions without touching storage", async () => {
  const foreign = fixture({ owner: "owner-b" });
  await assert.rejects(deleteUploadedAsset({ kind: "reference", assetId, ...foreign }),
    (error) => error.code === "ASSET_NOT_FOUND" && error.status === 404);
  assert.deepEqual(foreign.deleted, []);
  assert.equal(foreign.statements.some(([sql]) => sql === "COMMIT"), false);

  const invalid = fixture();
  await assert.rejects(deleteUploadedAsset({ kind: "generated", assetId, ...invalid }),
    (error) => error.code === "ASSET_NOT_FOUND");
  assert.equal(invalid.statements.length, 0);

  const failed = fixture({ failRowDelete: true });
  await assert.rejects(deleteUploadedAsset({ kind: "video", assetId, ...failed }), /database failed/);
  assert.ok(failed.statements.some(([sql]) => sql === "ROLLBACK"));
  assert.deepEqual(failed.deleted, []);
});

test("storage failure is reported after a committed removal", async () => {
  const setup = fixture({ failStorage: true });
  const original = console.error;
  console.error = () => {};
  try {
    await assert.rejects(deleteUploadedAsset({ kind: "audio", assetId, ...setup }),
      (error) => error.code === "ASSET_DELETE_INCOMPLETE" && error.status === 503);
  } finally { console.error = original; }
  assert.ok(setup.statements.some(([sql]) => sql === "COMMIT"));
  assert.equal(setup.statements.some(([sql]) => sql === "ROLLBACK"), false);
});

test("local Node delete route forwards file kind, owner, and workspace", async () => {
  const calls = [];
  const handler = createAssetNodeApiHandler({
    authenticate: async () => ({ ownerId: "owner-a" }),
    operations: { async deleteUploadedAsset(input) {
      calls.push(input);
      return { id: input.assetId, deleted: true };
    } },
  });
  const request = Readable.from([]);
  request.url = `/api/asset-files/audio/${assetId}`;
  request.method = "DELETE";
  request.headers = { "x-goodgood-workspace-id": "30000000-0000-4000-8000-000000000001" };
  const response = { statusCode: 0, body: "", writeHead(status) { this.statusCode = status; },
    end(value = "") { this.body += value; } };
  assert.equal(await handler(request, response), true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { id: assetId, deleted: true });
  assert.deepEqual(calls, [{ kind: "audio", assetId, ownerContext: { ownerId: "owner-a" },
    workspaceId: "30000000-0000-4000-8000-000000000001" }]);
});
