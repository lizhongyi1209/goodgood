import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { parseWorkspaceRoute, workspaceRouteHref } from "../features/navigation/workspace-route.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root, "next/image": `${root}node_modules/vinext/dist/shims/image.js` } },
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());

test("GG-217 former platform-coin URLs use the existing unknown-route fallback", () => {
  for (const pathname of ["/jcoin", "/jcoin/", "/admin/jcoin", "/admin/jcoin/"]) {
    assert.deepEqual(parseWorkspaceRoute(pathname), { kind: "create" }, pathname);
  }
});

test("GG-217 normal credits, creation and other workspace routes remain available", () => {
  const routes = [
    ...["create", "canvas", "profile", "projects", "assets", "credits", "feedback", "distribution", "organizations"].map((kind) => ({ kind })),
    ...["operations", "users", "logs", "models", "feedback", "audit"].map((tab) => ({ kind: "admin", tab })),
  ];
  for (const route of routes) {
    assert.deepEqual(parseWorkspaceRoute(workspaceRouteHref(route)), route);
  }
  assert.equal(workspaceRouteHref({ kind: "credits" }), "/credits");
});

test("GG-217 owner navigation retains seven ordered functions without platform coins", async () => {
  const { SiteOwnerManagementView } = await vite.ssrLoadModule("/features/admin/site-owner-management-view.tsx");
  const html = renderToStaticMarkup(React.createElement(SiteOwnerManagementView, {
    session: { account: { role: "site_owner" }, access: { status: "active" }, preview: false },
    activeTab: "audit", onLogin() {},
  }));
  const navigation = html.match(/<nav[^>]*aria-label="站长管理功能"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(navigation, "owner management navigation must be rendered");
  assert.deepEqual([...navigation.matchAll(/href="([^"]+)"/g)].map((match) => match[1]), [
    "/admin/operations", "/admin/users", "/admin/logs", "/organizations", "/admin/models", "/admin/feedback", "/admin/audit",
  ]);
  assert.doesNotMatch(html, /jcoin|平台币/i);
  assert.equal((navigation.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(navigation, /href="\/admin\/audit" aria-current="page"/);
});

test("GG-217 the shared shell keeps credit activity and removes coin entry pages", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /jcoin|平台币/i);
  assert.match(source, /<CreditActivityView/);
  const creditEntries = [...source.matchAll(/<(button|DropdownMenuItem)\b[\s\S]*?<\/\1>/g)]
    .map((match) => match[0])
    .filter((entry) => /on(?:Click|Select)=\{handleCreditsNav\}/.test(entry));
  const desktopEntries = creditEntries.filter((entry) => !entry.includes('className="mobile-credit-balance"'));
  assert.ok(desktopEntries.some((entry) => /<span>积分(?:记录)?<\/span>|aria-label=[^\n]*积分/.test(entry)),
    "normal credits must retain a labelled desktop action in the sidebar or account menu");
  const mobileEntry = creditEntries.find((entry) => entry.includes('className="mobile-credit-balance"'));
  assert.ok(mobileEntry, "mobile credit balance must still open normal credit activity");
  assert.match(mobileEntry, /aria-label=[^\n]*查看积分(?:记录|用量)/);
  for (const file of ["app/jcoin/page.tsx", "app/admin/jcoin/page.tsx"]) {
    await assert.rejects(access(new URL(`../${file}`, import.meta.url)), { code: "ENOENT" });
  }
});
