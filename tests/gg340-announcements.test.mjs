import assert from "node:assert/strict";
import test from "node:test";
import { AnnouncementError, announcementApiError, announcementCursor, validateAnnouncementMutation } from "../server/announcements/policy.mjs";
import { announcementDto, authorizeAnnouncements } from "../server/announcements/repository.mjs";
import { handleAnnouncementsHttp } from "../server/announcements/http.mjs";
import { announcementStream, closeAnnouncementStreams } from "../server/announcements/realtime.mjs";
import { sessionExpiredError } from "../server/auth/errors.mjs";
import { parseWorkspaceRoute, workspaceRouteHref } from "../features/navigation/workspace-route.mjs";

const id = "33700000-0000-4000-8000-000000000001", owner = { ownerId: "33700000-0000-4000-8000-000000000002" };
const mutation = { id, mutationId: "33700000-0000-4000-8000-000000000003", expectedVersion: 0, action: "save", title: "", body: "", pinned: false, important: false };
test("empty draft is allowed; publication requires content and rejects unsupported fields, controls and invalid revisions", () => {
  assert.equal(validateAnnouncementMutation(mutation).body, "");
  assert.equal(validateAnnouncementMutation({ ...mutation, action: "publish", title: " 活动 ", body: "正文\n下一行" }).title, "活动");
  assert.equal(validateAnnouncementMutation({ ...mutation, title: "😀".repeat(100) }).title.length, 200);
  for (const input of [{ ...mutation, action: "publish" }, { ...mutation, title: "x".repeat(101) }, { ...mutation, body: "x".repeat(12001) }, { ...mutation, title: "换\n行" }, { ...mutation, body: "\0" }, { ...mutation, expectedVersion: -1 }, { ...mutation, role: "site_owner" }, { ...mutation, action: "withdraw" }, { ...mutation, id: "bad" }]) assert.throws(() => validateAnnouncementMutation(input), AnnouncementError);
  assert.equal(validateAnnouncementMutation({ id, mutationId: mutation.mutationId, expectedVersion: 1, action: "withdraw" }).action, "withdraw");
});
test("public DTO omits administrator, identity and metrics; cursors are bounded and reversible", () => {
  const row = { id, title: "公告", body: "内容", important: false, pinned: true, status: "published", version: 1, publication_version: 1, published_at: new Date("2026-10-03T00:00:00.123Z"), updated_at: new Date("2026-10-03T00:00:00.123Z"), view_count: 12, like_count: 3, created_by: owner.ownerId, unread: true, liked: false };
  assert.equal(announcementDto(row).unread, true);
  for (const key of ["status", "view_count", "like_count", "created_by", "viewCount", "likeCount"]) assert.equal(Object.hasOwn(announcementDto(row), key), false);
  assert.equal(announcementDto(row, true).status, "published");
  const cursor = { id, time: "2026-10-03T00:00:00.123Z", pinned: true };
  assert.deepEqual(announcementCursor(Buffer.from(JSON.stringify(cursor)).toString("base64url")), cursor);
  for (const value of ["invalid", "x".repeat(257), Buffer.from(JSON.stringify({ ...cursor, time: "bad" })).toString("base64url")]) assert.throws(() => announcementCursor(value));
  assert.doesNotMatch(JSON.stringify(announcementApiError(Error("synthetic internal detail"))), /synthetic internal detail/);
});
test("database authorization rejects missing, inactive and non-site-owner identities rather than trusting browser role", async () => {
  await assert.rejects(authorizeAnnouncements({ query: async () => ({ rowCount: 1 }) }, {}), (error) => error.status === 401);
  let sql;
  await assert.rejects(authorizeAnnouncements({ query: async (value) => { sql = value; return { rowCount: 0 }; } }, { ...owner, systemRole: "site_owner" }, true), (error) => error.status === 403);
  assert.match(sql, /system_role_assignments/); assert.match(sql, /status='active'/);
});
test("HTTP authenticates first, binds owner, blocks forged writes and broadcasts only committed visible changes", async () => {
  let written = 0, broadcast = 0;
  const options = { resources: { pool: {} }, authenticateSession: async () => owner, broadcast: async () => { broadcast++; }, operations: {
    readAnnouncements: async ({ ownerContext, administrator }) => { assert.equal(ownerContext.ownerId, owner.ownerId); return { items: [], nextCursor: null, unreadCount: 0, administrator }; },
    mutateAnnouncement: async () => { written++; return { item: { id, status: "draft", publicationVersion: 0 }, changed: true, notify: false }; },
  } };
  const write = (header) => new Request("http://local/api/admin/announcements", { method: "POST", headers: { "content-type": "application/json", ...(header ? { "x-goodgood-announcement-action": "1" } : {}) }, body: JSON.stringify(mutation) });
  assert.equal((await handleAnnouncementsHttp(write(false), options)).status, 403); assert.equal(written, 0);
  assert.equal((await handleAnnouncementsHttp(write(true), options)).status, 200); assert.equal(written, 1); assert.equal(broadcast, 0);
  options.operations.mutateAnnouncement = async () => ({ item: { id, status: "published", publicationVersion: 1 }, changed: true, notify: true });
  await handleAnnouncementsHttp(write(true), options); assert.equal(broadcast, 1);
  options.operations.mutateAnnouncement = async () => ({ item: { id, status: "published", publicationVersion: 1 }, changed: false });
  await handleAnnouncementsHttp(write(true), options); assert.equal(broadcast, 1);
  assert.equal((await handleAnnouncementsHttp(new Request("http://local/api/announcements"), { ...options, authenticateSession: async () => { throw sessionExpiredError(); } })).status, 401);
  assert.equal((await handleAnnouncementsHttp(new Request("http://local/api/announcements"), options)).status, 200);
  assert.equal((await handleAnnouncementsHttp(new Request("http://local/api/announcements/missing", { method: "PUT" }), options)).status, 405);
  assert.equal(workspaceRouteHref(parseWorkspaceRoute("/admin/announcements")), "/admin/announcements");
});
test("SSE shares one subscriber, sends markers, enforces connection cap and releases canceled connections", async () => {
  let duplicates = 0, callback;
  const subscriber = { isOpen: false, on() {}, async connect() { this.isOpen = true; }, async subscribe(_, listener) { callback = listener; }, async quit() { this.isOpen = false; }, destroy() { this.isOpen = false; } };
  const resources = { pool: { query: async () => ({ rowCount: 1 }) }, redis: { duplicate() { duplicates++; return subscriber; } } };
  const options = { request: new Request("http://local/api/announcements/stream"), resources, ownerContext: owner, authenticateSession: async () => owner };
  try {
    const connections = await Promise.all(Array.from({ length: 4 }, () => announcementStream(options)));
    assert.equal(duplicates, 1);
    await assert.rejects(announcementStream(options), (error) => error.status === 429);
    const reader = connections[0].body.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: connected/);
    callback(JSON.stringify({ id, status: "withdrawn", publicationVersion: 1 }));
    assert.match(new TextDecoder().decode((await reader.read()).value), /withdrawn/);
    await reader.cancel();
    const extra = await announcementStream(options); await extra.body.cancel();
    for (const connection of connections.slice(1)) await connection.body.cancel();
  } finally { await closeAnnouncementStreams(resources); }
  assert.equal(subscriber.isOpen, false);
});
