import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { navigateWorkspace, parseWorkspaceRoute, workspaceRouteHref, WORKSPACE_NAVIGATION_EVENT } from "../features/navigation/workspace-route.mjs";
import { canonicalBusinessRoute } from "../features/distribution/business-route.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root, "next/image": `${root}node_modules/vinext/dist/shims/image.js` } },
  server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { SiteOwnerManagementView } = await vite.ssrLoadModule("/features/admin/site-owner-management-view.tsx");
const session = (role = "site_owner", status = "active", preview = false) => ({ account: { role }, access: { status }, preview });
const render = (props) => renderToStaticMarkup(React.createElement(SiteOwnerManagementView, { activeTab: "organizations", onLogin() {}, ...props }, React.createElement("p", null, "enterprise-private-content")));

test("GG-059 existing admin URLs round-trip in the shell without business-role canonicalization", () => {
  for (const tab of ["models", "users", "audit"]) {
    const route = { kind: "admin", tab };
    assert.deepEqual(parseWorkspaceRoute(workspaceRouteHref(route)), route);
    assert.deepEqual(parseWorkspaceRoute(`/admin/${tab}/`), route);
    for (const role of [null, "enterprise", "distributor"]) assert.equal(canonicalBusinessRoute(route, role), route);
  }
  for (const path of ["/admin", "/admin/unknown", "/admin/users/extra"]) assert.deepEqual(parseWorkspaceRoute(path), { kind: "create" });
});

test("GG-059 management navigation retains native history state without a document transition", () => {
  const original = globalThis.window;
  const location = { pathname: "/create" };
  const retained = { creativeSession: "retained" };
  const visits = [], events = [];
  globalThis.window = { location, history: { state: retained,
    pushState(state, _title, href) { assert.equal(state, retained); visits.push(href); location.pathname = href; },
  }, dispatchEvent(event) { events.push(event.type); } };
  try {
    for (const route of [{ kind: "organizations" }, { kind: "admin", tab: "models" }, { kind: "admin", tab: "users" }, { kind: "admin", tab: "audit" }, { kind: "create" }]) navigateWorkspace(route);
  } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
  assert.deepEqual(visits, ["/organizations", "/admin/models", "/admin/users", "/admin/audit", "/create"]);
  assert.deepEqual(events, Array(5).fill(WORKSPACE_NAVIGATION_EVENT));
});

test("GG-059 loading, signed-out, inactive, member and preview sessions never mount management", () => {
  assert.match(render({ session: undefined }), /role="status"[\s\S]*正在确认站长权限/);
  assert.match(render({ session: null }), /请登录站长账户[\s\S]*登录 GoodGood/);
  for (const current of [undefined, null, session("user"), session("site_owner", "pending"), session("site_owner", "suspended"), session("site_owner", "active", true)]) {
    for (const activeTab of ["organizations", "models", "users", "audit"]) {
      const html = render({ session: current, activeTab });
      assert.doesNotMatch(html, /enterprise-private-content|搜索模型|搜索邮箱|站长管理功能/);
      if (current) assert.match(html, /role="alert"[\s\S]*没有站长管理权限/);
    }
  }
});

test("GG-061 active owner has four accessible functions and one current content title", () => {
  for (const activeTab of ["organizations", "models", "users", "audit"]) {
    const html = render({ session: session(), activeTab });
    for (const href of ["/organizations", "/admin/models", "/admin/users", "/admin/audit"]) assert.ok(html.includes(`href="${href}"`));
    const href = activeTab === "organizations" ? "/organizations" : `/admin/${activeTab}`;
    assert.ok(html.includes(`href="${href}" aria-current="page"`));
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.equal((html.match(/<header/g) ?? []).length, 1);
    assert.doesNotMatch(html, /返回创作|退出登录|goodgood-wordmark|<main|data-sonner-toaster/);
    assert.match(html, activeTab === "organizations" ? /enterprise-private-content/ : activeTab === "models" ? /正在读取模型/ : activeTab === "users" ? /搜索邮箱/ : /审计日志[\s\S]*正在读取审计日志/);
    assert.doesNotMatch(html, /最近操作记录/);
  }
});

test("GG-059 admin entry points mount the same shell and management changes refresh shared data", async () => {
  for (const tab of ["models", "users", "audit"]) assert.match(await readFile(new URL(`../app/admin/${tab}/page.tsx`, import.meta.url), "utf8"), /export \{ default \} from "@\/app\/page"/);
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /location.assign\("\/admin\//);
  assert.match(page, /aria-label="站长管理"[\s\S]*?onClick=\{handleOrganizationNav\}/);
  assert.match(page, /onManagementChange=\{[\s\S]*?setBillingRevision[\s\S]*?workspaceDirectory.reload/);
  assert.match(page, /siteOwnerManagementActive \? <button[^>]*aria-label="返回创作" onClick=\{handleCreateNav\}/);
  for (const name of ["model", "account"]) {
    const view = await readFile(new URL(`../features/admin/${name}-management-page.tsx`, import.meta.url), "utf8");
    assert.match(view, /if \(workspaceSession\) return;/);
    assert.match(view, /onManagementChange\?\.\(\)/);
  }
});

test("GG-061 audit content distinguishes loading, empty, failure and populated records safely", async () => {
  const { AuditLogContent } = await vite.ssrLoadModule("/features/admin/audit-log-view.tsx");
  const content = (props) => renderToStaticMarkup(React.createElement(AuditLogContent, { actions: [], loading: false, error: null, onReload() {}, ...props }));
  assert.match(content({ loading: true }), /role="status"[\s\S]*正在读取审计日志/);
  assert.doesNotMatch(content({ loading: true }), /还没有审计日志/);
  assert.match(content({}), /还没有审计日志/);
  assert.match(content({ error: "读取失败，记录保留" }), /role="alert"[\s\S]*读取失败，记录保留[\s\S]*重试/);
  assert.doesNotMatch(content({ error: "失败" }), /还没有审计日志/);
  const action = { id: "one", actionType: "grant_test_credits", actorEmail: "owner@example.invalid", targetEmail: "member@example.invalid", creditAmount: "100", reason: '<script>alert("x")</script>', createdAt: "2026-09-13T15:00:01Z" };
  const html = content({ actions: [action] });
  assert.match(html, /赠送测试积分[\s\S]*owner@example.invalid[\s\S]*member@example.invalid[\s\S]*100 积分/);
  assert.match(html, /datetime="2026-09-13T15:00:01Z"/i);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|还没有审计日志|正在读取审计日志/);
  assert.equal((html.match(/<li /g) ?? []).length, 1);
});

test("GG-061 read-only audit boundary reuses the authorized query and preserves failures", async () => {
  const { readAuditLog } = await vite.ssrLoadModule("/features/admin/http-admin-boundary.ts");
  const original = globalThis.fetch;
  const actions = [{ id: "audit-one" }];
  try {
    for (const records of [[], actions]) {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "/api/admin/users/query");
        assert.equal(init.method, "POST");
        assert.equal(init.headers["x-goodgood-admin-action"], "1");
        assert.equal(init.cache, "no-store");
        assert.deepEqual(JSON.parse(init.body), { limit: 1 });
        return Response.json({ recentActions: records, accounts: [{ privateField: "not returned" }] });
      };
      assert.deepEqual(await readAuditLog(), records);
    }
    for (const status of [401, 403, 500]) {
      globalThis.fetch = async () => Response.json({ error: { message: "无法查看审计日志", requestId: "req-audit" } }, { status });
      await assert.rejects(readAuditLog(), /无法查看审计日志.*req-audit/);
    }
    globalThis.fetch = async () => { throw new Error("网络暂时不可用"); };
    await assert.rejects(readAuditLog(), /网络暂时不可用/);
  } finally { globalThis.fetch = original; }
});
