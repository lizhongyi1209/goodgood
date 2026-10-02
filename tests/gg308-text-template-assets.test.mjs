import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { textAssetDefaultName, textAssetInputError, textAssetPreview, TEXT_ASSET_MAX_MARKDOWN, TEXT_ASSET_MAX_TEXT } from "../shared/contracts/text-assets.mjs";
import { createTextAsset, deleteTextAsset, getTextAsset, listTextAssets } from "../server/text-assets/api.mjs";
import { createTextAssetNodeApiHandler } from "../server/text-assets/node-api.mjs";
import { planCanvasFolderMove, selectCanvasFolderItems } from "../features/canvas/canvas-folder-drop.mjs";
import { deleteCanvasLibraryEntry, removeCanvasLibraryEntry } from "../features/canvas/canvas-asset-management.mjs";

const owner = "30800000-0000-4000-8000-000000000001";
const other = "30800000-0000-4000-8000-000000000002";
const workspace = "30800000-0000-4000-8000-000000000003";
const id = "30800000-0000-4000-8000-000000000004";
const input = () => ({ id, name: "模板", markdown: "## 标题\n\n**内容**\n\n---\n\n下一段", text: "标题\n内容\n---\n下一段" });

// All repository tests inject this in-memory query boundary; no database, queue or provider is attached.
function memory() {
  const records = new Map(); const calls = []; let released = 0;
  const result = (rows = []) => ({ rows, rowCount: rows.length });
  async function query(sql, values = []) {
    calls.push({ sql, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return result();
    if (sql.includes("FROM users u")) return result([owner, other].includes(values[0]) && (values[1] === workspace || values[1] === null)
      ? [{ workspace_id: workspace, kind: "organization", name: "合成工作区", membership_id: "membership", membership_role: "org_member", status: "active" }] : []);
    if (sql.startsWith("INSERT INTO text_assets")) {
      if (!records.has(values[0])) records.set(values[0], { id: values[0], workspace_id: values[1], owner_id: values[2], name: values[3],
        markdown: values[4], text_content: values[5], created_at: "2026-10-02T00:00:00Z" });
      return result();
    }
    if (sql.startsWith("SELECT") && sql.includes("FROM text_assets")) {
      assert.match(sql, /workspace_id=\$\d+ AND owner_id=\$\d+/);
      if (sql.includes("WHERE id=$1")) {
        const row = records.get(values[0]);
        return result(row?.workspace_id === values[1] && row?.owner_id === values[2] ? [row] : []);
      }
      return result([...records.values()].filter((row) => row.workspace_id === values[0] && row.owner_id === values[1]));
    }
    if (sql.startsWith("DELETE FROM text_assets")) {
      const row = records.get(values[0]);
      if (row?.workspace_id !== values[1] || row?.owner_id !== values[2]) return result();
      records.delete(values[0]); return result([{ id: row.id }]);
    }
    if (sql.startsWith("DELETE FROM asset_organization")) return result();
    throw new Error(`Unexpected synthetic query: ${sql}`);
  }
  const client = { query, release: () => { released += 1; } };
  return { records, calls, released: () => released, resources: { pool: { query, connect: async () => client } } };
}
const scope = (store, actor = owner, workspaceId = workspace) => ({ ownerContext: { ownerId: actor }, workspaceId, resourcesOverride: store.resources });

test("template input preserves complete Markdown, rejects empty/invalid/overlong content and previews Unicode without truncating storage", () => {
  assert.equal(textAssetInputError(input()), null);
  for (const value of [null, {}, { ...input(), id: "invalid" }, { ...input(), name: "\n" }, { ...input(), text: " " },
    { ...input(), markdown: "" }, { ...input(), text: "x".repeat(TEXT_ASSET_MAX_TEXT + 1) }, { ...input(), markdown: "x".repeat(TEXT_ASSET_MAX_MARKDOWN + 1) },
    { ...input(), markdown: "x\0y" }]) assert.ok(textAssetInputError(value));
  assert.equal(textAssetDefaultName("\n 第一行\t名称\n第二行"), "第一行 名称");
  assert.equal(textAssetDefaultName("\n "), "文本模板");
  const text = "😀".repeat(2100);
  assert.equal(textAssetPreview(text), "😀".repeat(2000)); assert.equal(text.length, 4200);
});

test("save is an immutable snapshot; identical retries reuse the asset and conflicting reuse rolls back", async () => {
  const store = memory(); const draft = input();
  const first = await createTextAsset({ ...scope(store), input: draft });
  draft.text = "源节点后来修改";
  assert.equal(first.asset.text, input().text);
  const retry = await createTextAsset({ ...scope(store), input: input() });
  assert.deepEqual(retry, first); assert.equal(store.records.size, 1);
  await assert.rejects(createTextAsset({ ...scope(store), input: { ...input(), text: "冲突内容" } }), { code: "TEXT_ASSET_CONFLICT" });
  assert.equal(store.records.get(id).text_content, input().text);
  assert.equal(store.calls.at(-1).sql, "ROLLBACK"); assert.equal(store.released(), 3);
});

test("list contains only preview metadata; complete content and deletion stay scoped to owner and workspace", async () => {
  const store = memory(); await createTextAsset({ ...scope(store), input: input() });
  const list = await listTextAssets(scope(store)); assert.equal(list.assets.length, 1);
  assert.ok(!("markdown" in list.assets[0])); assert.ok(!("text" in list.assets[0]));
  assert.equal((await getTextAsset({ ...scope(store), assetId: id })).asset.markdown, input().markdown);
  assert.deepEqual((await listTextAssets(scope(store, other))).assets, []);
  await assert.rejects(getTextAsset({ ...scope(store, other), assetId: id }), { code: "TEXT_ASSET_NOT_FOUND" });
  await assert.rejects(deleteTextAsset({ ...scope(store, other), assetId: id }), { code: "TEXT_ASSET_NOT_FOUND" });
  assert.equal(store.records.size, 1);
  await assert.rejects(getTextAsset({ ...scope(store, owner, "30800000-0000-4000-8000-000000000099"), assetId: id }));
  assert.deepEqual(await deleteTextAsset({ ...scope(store), assetId: id }), { id, deleted: true });
  assert.equal(store.records.size, 0);
  assert.ok(store.calls.some((call) => call.sql.startsWith("DELETE FROM asset_organization") && call.values[1] === workspace && call.values[2] === owner));
  await assert.rejects(getTextAsset({ ...scope(store), assetId: id }), { code: "TEXT_ASSET_NOT_FOUND" });
});

test("invalid and anonymous saves do not reach storage", async () => {
  const store = memory();
  await assert.rejects(createTextAsset({ ...scope(store), input: { ...input(), text: "" } }), { code: "TEXT_ASSET_INVALID" });
  await assert.rejects(createTextAsset({ ...scope(store), ownerContext: null, input: input() }));
  assert.equal(store.calls.length, 0);
});

async function request(handler, method, path, body = "") {
  const incoming = Readable.from([Buffer.from(body)]); incoming.method = method; incoming.url = path; incoming.headers = {};
  let status; let headers; let value;
  const outgoing = { writeHead: (code, fields) => { status = code; headers = fields; }, end: (payload) => { value = JSON.parse(payload); } };
  const handled = await handler(incoming, outgoing); return { handled, status, headers, value };
}
test("HTTP text routes authenticate, bound malformed/oversized bodies and never report a failed save as successful", async () => {
  const operations = { createTextAsset: async ({ input: value }) => ({ asset: value }), listTextAssets: async () => ({ assets: [] }) };
  const handler = createTextAssetNodeApiHandler({ authenticate: async () => ({ ownerId: owner }), operations });
  const list = await request(handler, "GET", "/api/text-assets"); assert.equal(list.status, 200); assert.equal(list.headers["cache-control"], "no-store");
  assert.equal((await request(handler, "POST", "/api/text-assets", JSON.stringify(input()))).status, 201);
  assert.equal((await request(handler, "POST", "/api/text-assets", "{")).status, 400);
  assert.equal((await request(handler, "POST", "/api/text-assets", "x".repeat(512 * 1024 + 1))).status, 413);
  const broken = createTextAssetNodeApiHandler({ authenticate: async () => ({ ownerId: owner }), operations: { ...operations,
    createTextAsset: async () => { throw Object.assign(new Error("failed"), { code: "synthetic" }); } } });
  assert.equal((await request(broken, "POST", "/api/text-assets", JSON.stringify(input()))).status, 503);
  const anonymous = createTextAssetNodeApiHandler({ authenticate: async () => { throw sessionExpiredError(); }, operations });
  assert.equal((await request(anonymous, "POST", "/api/text-assets", JSON.stringify(input()))).status, 401);
  assert.equal((await request(handler, "GET", "/api/text-assets-other")).handled, false);
});

test("text templates reuse exact asset identity for folders and deletion; copied node content is independent", async () => {
  const template = { id, kind: "text", media: "text", name: "模板" }; const image = { ...template, kind: "generated", media: "image" };
  const data = { folders: [{ id: "folder", name: "模板集" }], items: [template, image], arrangements: [] };
  const move = planCanvasFolderMove(data, `text:${id}`, "folder"); assert.equal(move.kind, "text");
  const grouped = { ...data, arrangements: [{ kind: "text", id, folderId: "folder", tags: [] }] };
  assert.deepEqual(selectCanvasFolderItems(grouped, "folder"), [template]); assert.deepEqual(selectCanvasFolderItems(grouped), [image]);
  assert.equal(planCanvasFolderMove({ ...data, items: [{ ...template, kind: "reference" }] }, `reference:${id}`, "folder"), null);
  let deleted; await deleteCanvasLibraryEntry(template, { deleteText: async (value) => { deleted = value; } }); assert.equal(deleted, id);
  assert.deepEqual(removeCanvasLibraryEntry(grouped, template).items, [image]);
});
