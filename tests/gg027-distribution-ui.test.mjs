import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseWorkspaceRoute,
  workspaceRouteHref,
} from "../features/navigation/workspace-route.mjs";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("GG-027 distribution is a first-class workspace route", () => {
  assert.deepEqual(parseWorkspaceRoute("/distribution"), {
    kind: "distribution",
  });
  assert.deepEqual(parseWorkspaceRoute("/distribution/"), {
    kind: "distribution",
  });
  assert.equal(workspaceRouteHref({ kind: "distribution" }), "/distribution");
});

test("GG-027 navigation is visible only to an authenticated business role", async () => {
  const page = await source("app/page.tsx");
  assert.match(
    page,
    /authenticationSession\?\.account\.businessRole\s*&&\s*\(\s*<button[\s\S]*?<Network size=\{17\}/,
  );
  assert.match(
    page,
    /access\.status === "active" &&\s*authenticationSession\.account\.businessRole/,
  );
  assert.match(page, /activeView === "distribution"/);
  assert.match(page, /<DistributionView/);
});

test("GG-027 distribution surface keeps offline commerce outside the product", async () => {
  const view = await source("features/distribution/distribution-view.tsx");
  assert.match(view, /只可把充值来源积分分配给直属下级/);
  assert.match(view, /兑换价格与收款由你在线下自行处理/);
  assert.match(view, /仅充值及上级划入来源/);
  assert.match(view, /公开编号可用于对账追溯/);
  assert.match(view, /提交后不可撤回或编辑/);
  assert.doesNotMatch(view, /name=["'](?:price|currency|money|commission)/i);
  assert.doesNotMatch(view, /createPayment|paymentOrder|在线支付/);
});

test("GG-027 distribution surface covers access, loading, empty, error, conflict and confirmation states", async () => {
  const view = await source("features/distribution/distribution-view.tsx");
  assert.match(view, /当前账户没有积分分配权限/);
  assert.match(view, /正在读取分配账户/);
  assert.match(view, /还没有直属下级/);
  assert.match(view, /还没有划拨记录/);
  assert.match(view, /积分分配暂时不可用/);
  assert.match(view, /setSubmitError/);
  assert.match(view, /数量必须为正整数，且不能超过当前可分配积分/);
  assert.match(view, /\[10, 50, 100\]/);
  assert.match(view, /variant=\{amount === String\(preset\) \? "default" : "outline"\}/);
  assert.match(view, /确认划拨/);
});

test("GG-027 station owner controls roles and direct parents with audited reasons", async () => {
  const [admin, boundary, roleRoute, parentRoute] = await Promise.all([
    source("features/admin/account-management-page.tsx"),
    source("features/admin/http-admin-boundary.ts"),
    source("app/api/admin/users/[ownerId]/business-role/route.ts"),
    source("app/api/admin/users/[ownerId]/direct-parent/route.ts"),
  ]);
  assert.match(admin, /调整业务身份/);
  assert.match(admin, /调整直属关系/);
  assert.match(admin, /企业与分销商当前共享直属下级积分分配能力/);
  assert.match(admin, /只列出已启用且具有企业或分销商身份的账户/);
  assert.match(admin, /placeholder="请填写会进入审计记录的原因"/);
  assert.match(boundary, /x-goodgood-admin-action/);
  assert.match(roleRoute, /updateAdminBusinessRole/);
  assert.match(parentRoute, /updateAdminDirectParent/);
});

test("GG-027 account-management selects always open below their triggers", async () => {
  const admin = await source("features/admin/account-management-page.tsx");
  assert.equal((admin.match(/position="popper"/g) ?? []).length, 3);
  assert.equal((admin.match(/side="bottom"/g) ?? []).length, 3);
  assert.equal((admin.match(/avoidCollisions=\{false\}/g) ?? []).length, 3);
  assert.equal((admin.match(/sideOffset=\{6\}/g) ?? []).length, 3);
});

test("GG-027 account management presents one user-facing identity and one status filter", async () => {
  const admin = await source("features/admin/account-management-page.tsx");
  assert.match(admin, /useState<ManagedAccountStatus \| "all">\("all"\)/);
  assert.doesNotMatch(admin, /\(\["pending", "active", "suspended"\] as const\)\.map/);
  assert.match(admin, /if \(account\.role === "site_owner"\) return "站长"/);
  assert.match(admin, /BUSINESS_ROLE_LABELS\[account\.businessRole\] : "个人"/);
  assert.doesNotMatch(admin, /"普通用户"/);
  assert.match(admin, /<SelectItem value="none">个人<\/SelectItem>/);
  assert.doesNotMatch(admin, />无业务身份<\/SelectItem>/);
  assert.equal((admin.match(/account\.role !== "site_owner" && \(/g) ?? []).length, 2);
});

test("GG-027 account identity and direct parent have dedicated display fields", async () => {
  const admin = await source("features/admin/account-management-page.tsx");
  assert.match(admin, /<TableHead className="w-\[90px\]">身份<\/TableHead>/);
  assert.match(admin, /<TableHead className="w-\[220px\]">上级<\/TableHead>/);
  assert.match(admin, />身份<\/span><strong[^>]*>\{accountIdentityLabel\(account\)\}/);
  assert.match(admin, />直属上级<\/span><strong[^>]*title=\{account\.directParentEmail \?\? undefined\}>\{account\.directParentEmail \?\? "—"\}/);
  assert.equal((admin.match(/\{accountIdentityLabel\(account\)\}/g) ?? []).length, 2);
  assert.equal((admin.match(/\{account\.directParentEmail \?\? "—"\}/g) ?? []).length, 2);
  assert.match(admin, /className="divide-y divide-zinc-200 xl:hidden"/);
  assert.match(admin, /className="hidden xl:block"/);
});

test("GG-027 workspace account menu resolves identity and moves balance and logout off the trigger", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /if \(session\.account\.role === "site_owner"\) return "站长"/);
  assert.match(page, /if \(session\.account\.businessRole === "enterprise"\) return "企业"/);
  assert.match(page, /if \(session\.account\.businessRole === "distributor"\) return "分销商"/);
  assert.match(page, /return "个人"/);
  assert.match(page, /<DropdownMenuTrigger asChild>[\s\S]*className="account-card-username"[\s\S]*<\/DropdownMenuTrigger>/);
  assert.match(page, /<DropdownMenuContent[\s\S]*side="right"[\s\S]*<span>身份<\/span>[\s\S]*<span>积分余额<\/span>[\s\S]*<span>退出登录<\/span>[\s\S]*<\/DropdownMenuContent>/);
  assert.doesNotMatch(page, /account-identity-badge|account-credit-balance|account-session-action/);
});

test("GG-027 browser routes keep read operations cacheless and transfer writes CSRF-protected", async () => {
  const [summaryRoute, childRoute, transferRoute] = await Promise.all([
    source("app/api/distribution/route.ts"),
    source("app/api/distribution/children/route.ts"),
    source("app/api/distribution/transfers/route.ts"),
  ]);
  assert.match(summaryRoute, /readDistribution/);
  assert.match(childRoute, /readDistributionChildren/);
  assert.match(transferRoute, /readDistributionTransfers/);
  assert.match(transferRoute, /createDistributionTransfer/);
  assert.match(transferRoute, /x-goodgood-distribution-action/);
  assert.match(transferRoute, /result\.created \? 201 : 200/);
  for (const route of [summaryRoute, childRoute, transferRoute]) {
    assert.match(route, /cache-control": "no-store/);
  }
});

test("GG-027 distribution layout has a single-column narrow-screen contract", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /\.distribution-header \{ min-height: 0;[^}]*flex-direction: column/);
  assert.match(css, /\.distribution-header > button \{ align-self: flex-start/);
  assert.match(css, /\.distribution-summary-grid \{ grid-template-columns: 1fr/);
  assert.match(css, /\.distribution-columns \{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.distribution-child-list article \{ align-items: flex-start; flex-direction: column/);
});
