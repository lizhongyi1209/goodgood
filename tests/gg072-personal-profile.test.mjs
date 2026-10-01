import assert from "node:assert/strict";
import test, { after } from "node:test";
import { Readable } from "node:stream";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { PROFILE_AVATAR_MAX_BYTES } from "../shared/profile-policy.mjs";
import { ProfileError, profileApiError, validateProfileInput, readPersonalProfile, updatePersonalProfile } from "../server/profile/api.mjs";
import { createProfileNodeApiHandler } from "../server/profile/node-api.mjs";
import { parseWorkspaceRoute, workspaceRouteHref } from "../features/navigation/workspace-route.mjs";

const id = "00000000-0000-4000-8000-000000000072";
const input = { displayName: " 我的名称 ", avatarReferenceId: null, version: 0 };
test("GG-254 validates the single username and rejects legacy handle, forged identity and unsafe changes", () => {
  assert.deepEqual(validateProfileInput(input), { ...input, displayName: "我的名称" });
  for (const value of [null, [], { ...input, handle: "jony" }, { ...input, ownerId: id }, { ...input, publicUserId: "000072" }, { ...input, avatarUrl: "https://example.invalid" }, { ...input, displayName: " " }, { ...input, displayName: "a".repeat(31) }, { ...input, displayName: "a\u202eb" }, { ...input, version: -1 }, { ...input, version: 0.2 }, { ...input, avatarReferenceId: "https://example.invalid" }, { ...input, avatarReferenceId: undefined }]) assert.throws(() => validateProfileInput(value), ProfileError);
});
test("GG-072 unauthenticated profile access fails before resources and suppresses internal errors", async () => {
  await assert.rejects(readPersonalProfile({ ownerContext: null }), error => error.status === 401);
  await assert.rejects(updatePersonalProfile({ ownerContext: null, input }), error => error.status === 401);
  assert.ok(!JSON.stringify(profileApiError(new Error("database password secret"))).includes("secret"));
});
test("GG-254 read defaults are owner-scoped, include zero public ID and do not create or rewrite rows", async () => {
  let calls = 0;
  const resources = { pool: { async query(sql, values) {
    calls++; assert.ok(!/INSERT|UPDATE/.test(sql)); assert.equal(values[0], id);
    return { rows: sql.includes("LEFT JOIN personal_profiles") ? [{ public_user_id: 0 }] : [{ workspace_id: id, kind: "personal", status: "active" }] };
  } } };
  assert.deepEqual(await readPersonalProfile({ ownerContext: { ownerId: id }, resources }), { displayName: "mimi", publicUserId: "000000", createdAt: null, avatarReferenceId: null, avatarUrl: null, version: 0 });
  assert.equal(calls, 2);
});
function fakeResources({ avatar = false, conflict = false, duplicate = false, name = "我的名称" } = {}) {
  const queries = []; let released = false;
  const client = { async query(sql, values) {
    queries.push(sql);
    if (sql.includes("LEFT JOIN personal_profiles")) return { rows: [{ display_name: name, handle: "historical_handle", public_user_id: 72, version: 1 }] };
    if (sql.includes("FROM users")) return { rows: [{ workspace_id: id, kind: "personal", status: "active" }] };
    if (sql.startsWith("SELECT id FROM reference_assets")) {
      assert.deepEqual(values, [id, id, id, PROFILE_AVATAR_MAX_BYTES]);
      assert.match(sql, /creator_owner_id=\$2.*workspace_id=\$3.*moderation_state='accepted'/);
      assert.match(sql, /byte_size BETWEEN 1 AND \$4 OR EXISTS.*p\.owner_id=\$2 AND p\.avatar_reference_id=reference_assets\.id/);
      return { rows: avatar ? [{ id }] : [] };
    }
    if (sql.startsWith("INSERT") || sql.startsWith("UPDATE")) {
      assert.doesNotMatch(sql, /handle/);
      if (duplicate) throw Object.assign(new Error("private constraint"), { code: "23505" });
      return { rows: conflict ? [] : [{ owner_id: id }] };
    }
    return { rows: [] };
  }, release() { released = true; } };
  return { resources: { pool: { async connect() { return client; } } }, queries, get released() { return released; } };
}
test("GG-254 saves transactionally without editing handles, checks versions and avatar ownership, and rolls back failures", async () => {
  const ok = fakeResources();
  assert.deepEqual(await updatePersonalProfile({ ownerContext: { ownerId: id }, input, resources: ok.resources }), { displayName: "我的名称", publicUserId: "000072", createdAt: null, avatarReferenceId: null, avatarUrl: null, version: 1 });
  assert.equal(ok.queries.at(-1), "COMMIT"); assert.ok(ok.released);
  for (const scenario of [{ conflict: true }, { duplicate: true }, {}]) {
    const fake = fakeResources(scenario);
    await assert.rejects(updatePersonalProfile({ ownerContext: { ownerId: id }, input: { ...input, avatarReferenceId: scenario.conflict || scenario.duplicate ? null : id }, resources: fake.resources }), error => ["PROFILE_CONFLICT", "23505", "PROFILE_AVATAR_INVALID"].includes(error.code));
    assert.equal(fake.queries.at(-1), "ROLLBACK"); assert.ok(fake.released);
  }
  const avatar = fakeResources({ avatar: true });
  await updatePersonalProfile({ ownerContext: { ownerId: id }, input: { ...input, avatarReferenceId: id }, resources: avatar.resources });
  assert.ok(avatar.queries.findIndex(sql => sql.includes("pg_advisory_xact_lock")) < avatar.queries.findIndex(sql => sql.includes("FROM reference_assets")));
  const oldDefault = fakeResources({ name: "GoodGood 用户" });
  assert.equal((await updatePersonalProfile({ ownerContext: { ownerId: id }, input, resources: oldDefault.resources })).displayName, "mimi");
});
async function invoke(method, body = "", headers = {}) {
  const request = Readable.from([Buffer.from(body)]); Object.assign(request, { url: "/api/profile", method, headers });
  let status, payload, responseHeaders;
  const handler = createProfileNodeApiHandler({ authenticate: async () => ({ ownerId: id }), operations: {
    async readPersonalProfile({ ownerContext }) { assert.equal(ownerContext.ownerId, id); return { displayName: "mimi", publicUserId: "000000" }; },
    async updatePersonalProfile({ ownerContext, input: value }) { assert.equal(ownerContext.ownerId, id); return validateProfileInput(value); },
  } });
  assert.equal(await handler(request, { writeHead(code, value) { status = code; responseHeaders = value; }, end(value) { payload = JSON.parse(value); } }), true);
  return { status, payload, headers: responseHeaders };
}
test("GG-072 private HTTP read/update, action-header gate, invalid JSON/size and unsupported methods", async () => {
  assert.equal((await invoke("GET")).payload.publicUserId, "000000");
  assert.equal((await invoke("PATCH", JSON.stringify(input))).status, 403);
  assert.equal((await invoke("PATCH", JSON.stringify(input), { "x-goodgood-profile-action": "1" })).payload.displayName, "我的名称");
  assert.equal((await invoke("PATCH", JSON.stringify({ ...input, handle: "legacy" }), { "x-goodgood-profile-action": "1" })).status, 400);
  for (const body of ["{", "x".repeat(4097)]) assert.equal((await invoke("PATCH", body, { "x-goodgood-profile-action": "1" })).status, 400);
  assert.equal((await invoke("DELETE")).status, 405); assert.equal((await invoke("GET")).headers["cache-control"], "no-store");
});
test("GG-254 forward migration keeps identity/data, bounds the allocator and prevents mutable or caller-selected numbers", async () => {
  const migration = await readFile(new URL("../migrations/0058_gg254_public_user_ids.sql", import.meta.url), "utf8");
  assert.match(migration, /public_user_id BETWEEN 0 AND 999999/);
  assert.match(migration, /UNIQUE \(public_user_id\)/);
  assert.match(migration, /row_number\(\) OVER \(ORDER BY created_at, id\) - 1/);
  assert.match(migration, /next_id < 1000000/);
  assert.match(migration, /IS DISTINCT FROM OLD\.public_user_id/);
  assert.match(migration, /NEW\.public_user_id IS NOT NULL/);
  assert.match(migration, /WHERE singleton FOR UPDATE[\s\S]*WHERE id = NEW\.id OR email = NEW\.email[\s\S]*IF FOUND THEN[\s\S]*UPDATE user_public_id_allocator/);
  assert.match(migration, /ERRCODE = '54000'/);
  assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|UPDATE personal_profiles|uuid.*hash|md5/i);
});
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const view = await vite.ssrLoadModule("/features/profile/personal-profile.tsx");
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
test("GG-254 legacy profile links remain addressable while old works/editor exports are retired", () => {
  assert.deepEqual(parseWorkspaceRoute("/profile/"), { kind: "profile" }); assert.equal(workspaceRouteHref({ kind: "profile" }), "/profile");
  assert.equal(view.PersonalProfileView, undefined); assert.equal(view.ProfileWorks, undefined);
  assert.match(render(view.ProfileReadState, { loading: true, onRetry() {} }), /role="status"/);
  assert.match(render(view.ProfileReadState, { loading: false, error: "读取失败", onRetry() {} }), /role="alert".*重试/s);
  assert.match(render(view.ProfileAvatar, { url: "https://private.invalid/avatar", name: "mimi" }), /mimi的头像/);
});
