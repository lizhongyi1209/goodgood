import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { manageableOrganizations, showOrganizationNavigation } from "../features/organizations/organization-navigation.mjs";
import { parseWorkspaceRoute, workspaceRouteHref } from "../features/navigation/workspace-route.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const session = (role = "user", businessRole = null, status = "active") => ({ account: { role, businessRole }, access: { status }, preview: false });
const organization = (id, role = "org_owner", membershipStatus = "active", status = "active") => ({ id, name: `企业 ${id}`, kind: "organization", role, membershipStatus, status });

test("GG-044 manager directory requires active organization and membership, not commercial/platform identity", () => {
  const workspaces = [organization("owner"), organization("admin", "org_admin"), organization("member", "org_member"), organization("paused", "org_owner", "suspended"), organization("closed", "org_owner", "active", "suspended"), { id: "personal", kind: "personal", role: "personal_owner", status: "active" }];
  assert.deepEqual(manageableOrganizations(workspaces).map((item) => item.id), ["owner", "admin"]);
  assert.equal(showOrganizationNavigation(session(), workspaces, []), true);
  assert.equal(showOrganizationNavigation(session(), [], []), false);
  assert.equal(showOrganizationNavigation(session("user", "enterprise"), [], []), true);
  assert.equal(showOrganizationNavigation(session("site_owner"), [], []), true);
  assert.equal(showOrganizationNavigation(session("user", "distributor"), [], []), false);
  assert.equal(showOrganizationNavigation(session(), [], [{ id: "invite" }]), true);
  for (const unavailable of [null, session("site_owner", "enterprise", "suspended"), { ...session("site_owner"), preview: true }]) {
    assert.equal(showOrganizationNavigation(unavailable, workspaces, [{ id: "invite" }]), false);
  }
});

test("GG-044 enterprise directory/detail tab routes retain stable IDs and personal routes", () => {
  assert.deepEqual(parseWorkspaceRoute("/organizations/"), { kind: "organizations" });
  for (const tab of ["overview", "members", "usage", "assets"]) {
    const route = { kind: "organizations", organizationId: "company A", tab };
    assert.deepEqual(parseWorkspaceRoute(workspaceRouteHref(route)), route);
  }
  assert.equal(workspaceRouteHref({ kind: "organizations" }), "/organizations");
  assert.deepEqual(parseWorkspaceRoute("/organizations/%E0%A4%A"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/organizations/a/unknown"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/create"), { kind: "create" });
  assert.deepEqual(parseWorkspaceRoute("/distribution"), { kind: "distribution" });
});

test("GG-044 directory renders loading/empty/error without management requests or workspace controls", async () => {
  const { OrganizationDirectoryView } = await vite.ssrLoadModule("/features/organizations/organization-directory-view.tsx");
  const base = { workspaces: [], invitations: [], loading: false, error: null, reload: async () => {} };
  const render = (directory, current = session("user", "enterprise")) => renderToStaticMarkup(React.createElement(OrganizationDirectoryView, { directory: { ...base, ...directory }, session: current }));
  assert.match(render({ loading: true }), /role="status"[\s\S]*正在读取企业信息/);
  assert.match(render({}), /暂无可管理的企业/);
  assert.match(render({}, session("site_owner")), /前往账户管理/);
  assert.match(render({ error: "暂时无法读取" }), /role="alert"[\s\S]*重试/);
  assert.match(render({}, null), /请使用已开通的账户/);
  assert.doesNotMatch(render({ error: "暂时无法读取" }), /切换工作区|Personal Workspace|企业列表/);
});

test("GG-044 one organization opens overview; multiple organizations stay in management-only directory", async () => {
  const { OrganizationDirectoryView } = await vite.ssrLoadModule("/features/organizations/organization-directory-view.tsx");
  const render = (workspaces, invitations = []) => renderToStaticMarkup(React.createElement(OrganizationDirectoryView, { session: session(), directory: { workspaces, invitations, loading: false, error: null, reload: async () => {} } }));
  const single = render([organization("a")]);
  assert.match(single, /企业管理内容/);
  assert.match(single, /概览[\s\S]*成员与额度[\s\S]*消费记录[\s\S]*团队资产/);
  const multiple = render([organization("a"), organization("b")]);
  assert.match(multiple, /企业 a/);
  assert.match(multiple, /企业 b/);
  assert.doesNotMatch(multiple, /切换工作区|enterprise-management-sidebar|<aside/);
  assert.match(render([], [{ id: "i", role: "org_member", workspaceName: "邀请企业", expiresAt: "2026-09-20T00:00:00Z" }]), /邀请企业[\s\S]*接受邀请/);
});

test("GG-044 shared shell preserves authorization, creation/polling state and invitation lifecycle", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const hook = await readFile(new URL("../features/organizations/use-workspace-directory.ts", import.meta.url), "utf8");
  const directory = await readFile(new URL("../features/organizations/organization-directory-view.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /WorkspaceSwitcher|mobile-workspace-switcher/);
  assert.match(source, /side-nav-item[\s\S]*handleOrganizationNav[\s\S]*企业管理/);
  assert.match(source, /side-nav-item[\s\S]*handleDistributionNav[\s\S]*分销管理/);
  const handler = source.slice(source.indexOf("const handleOrganizationNav"), source.indexOf("const handleCreditAccountChange"));
  assert.doesNotMatch(handler, /setPrompt|setReferences|setVideoReferences|setGenerationRuns|setCreationBatches|setWorkspace/);
  assert.match(hook, /readWorkspaceDirectory/);
  assert.match(hook, /request !== requestRef.current/);
  assert.match(hook, /onWorkspaceError\(\)/);
  assert.match(directory, /acceptOrganizationInvitation\(invitation.id\)/);
  assert.match(directory, /await directory.reload\(\)/);
  assert.doesNotMatch(directory, /\/workspaces\/|location.assign\([^)]*create/);
  for (const route of ["page.tsx", "[organizationId]/page.tsx", "[organizationId]/members/page.tsx", "[organizationId]/usage/page.tsx", "[organizationId]/assets/page.tsx"]) {
    assert.match(await readFile(new URL(`../app/organizations/${route}`, import.meta.url), "utf8"), /export \{ default \} from "@\/app\/page"/);
  }
});

test("GG-044 compact management uses responsive labeled metrics and context-preserving dialogs", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const management = await readFile(new URL("../features/organizations/organization-management-page.tsx", import.meta.url), "utf8");
  assert.match(css, /\.organization-header h1[^}]*font-size: 20px/);
  assert.match(css, /\.organization-tabs[^}]*display: flex/);
  assert.match(css, /\.organization-members-desktop, \.organization-usage-desktop[^}]*display: none/);
  assert.match(css, /\.organization-members-mobile, \.organization-usage-mobile[^}]*display: grid/);
  for (const label of ["累计额度", "已消费", "预留", "剩余", "企业可用积分", "未分配额度"]) assert.ok(management.includes(label));
  assert.match(management, /className="admin-action-dialog" overlayClassName="admin-action-dialog-overlay"/);
  assert.match(management, /organization-inline-error" role="alert"/);
  assert.match(management, /if \(!open && !mutating\)/);
  assert.match(management, /request !== loadRequestRef.current/);
  assert.doesNotMatch(management, /text-3xl|rounded-3xl|text-red-700|<aside|<main/);
});
