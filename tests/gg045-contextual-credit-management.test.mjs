import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { canonicalBusinessRoute } from "../features/distribution/business-route.mjs";
import { transfersForCounterparty } from "../features/distribution/transfer-history.mjs";
import { parseWorkspaceRoute, workspaceRouteHref } from "../features/navigation/workspace-route.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { BusinessAccountContent, DistributionView } = await vite.ssrLoadModule("/features/distribution/distribution-view.tsx");
const { EnterpriseManagementNavigation } = await vite.ssrLoadModule("/features/organizations/enterprise-management-navigation.tsx");
const { BusinessManagementView } = await vite.ssrLoadModule("/features/distribution/business-management-view.tsx");
const { transferAndRefresh } = await vite.ssrLoadModule("/features/distribution/transfer-and-refresh.ts");
const noop = () => {};
const child = { id: "child-a", email: "a@example.invalid", allocatedCredits: "50", lastTransferredAt: null, status: "active", privateBalance: "hidden-balance" };
const transfer = { id: "trf_public1", counterpartyId: child.id, counterpartyEmail: child.email,
  direction: "outgoing", amount: "50", createdAt: "2026-09-13T02:00:00Z", remark: "核对说明", unit: "credit" };
const base = { summary: { account: { availableCredits: "110", transferableCredits: "60" }, directChildCount: 1, businessRole: "distributor" },
  directAccounts: [child], transfers: { items: [transfer], nextCursor: null }, tab: "children", historyAccount: null,
  onTransfer: noop, onShowRecords: noop, onClearRecords: noop, onLoadMore: noop, loadingMore: false, loadMoreError: null };
const render = (props = {}) => renderToStaticMarkup(React.createElement(BusinessAccountContent, { ...base, ...props }));

test("GG-045 contextual routes round-trip and static account paths never become company IDs", async () => {
  for (const route of [{ kind: "enterpriseAccounts", tab: "accounts" }, { kind: "enterpriseAccounts", tab: "transfers" },
    { kind: "distribution" }, { kind: "distribution", tab: "transfers" }]) {
    assert.deepEqual(parseWorkspaceRoute(`${workspaceRouteHref(route)}/`), route);
  }
  for (const route of ["organizations/accounts", "organizations/transfers", "distribution/transfers"]) {
    assert.match(await readFile(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8"), /export \{ default \} from "@\/app\/page"/);
  }
  assert.deepEqual(parseWorkspaceRoute("/organizations/a/members"), { kind: "organizations", organizationId: "a", tab: "members" });
  assert.deepEqual(parseWorkspaceRoute("/distribution/unknown"), { kind: "create" });
});

test("GG-045 legacy enterprise allocation links canonicalize without changing other scopes", () => {
  assert.deepEqual(canonicalBusinessRoute({ kind: "distribution" }, "enterprise"), { kind: "organizations" });
  assert.deepEqual(canonicalBusinessRoute({ kind: "distribution", tab: "transfers" }, "enterprise"), { kind: "organizations" });
  for (const role of ["distributor", null]) for (const route of [{ kind: "distribution" }, { kind: "create" }, { kind: "organizations", organizationId: "a", tab: "members" }]) {
    assert.equal(canonicalBusinessRoute(route, role), route);
  }
});

test("GG-045 enterprise navigation excludes distributor allocation after ADR 0060", () => {
  const nav = (props) => renderToStaticMarkup(React.createElement(EnterpriseManagementNavigation, { activeTab: "members", organizationId: "company-a", ...props }));
  assert.match(nav({}), /成员与额度[\s\S]*消费记录[\s\S]*团队资产/);
  assert.doesNotMatch(nav({}), /直属账户|划拨记录/);
  assert.doesNotMatch(nav({ allocationEnabled: true }), /直属账户|划拨记录/);
  assert.match(nav({ organizationId: undefined, allocationEnabled: true }), /企业概览/);
  assert.doesNotMatch(nav({ organizationId: undefined, allocationEnabled: true }), /成员与额度/);
});

test("GG-045 row actions and compact own-account facts do not expose downstream balances", () => {
  const html = render();
  assert.match(html, /当前个人账户[\s\S]*可分配积分[\s\S]*60[\s\S]*个人可用积分[\s\S]*110/);
  assert.match(html, /a@example.invalid[\s\S]*累计分配 50[\s\S]*查看记录[\s\S]*分配积分/);
  assert.doesNotMatch(html, /hidden-balance|还没有划拨记录|trf_public1/);
  assert.match(render(), /客户与下级/);
  assert.match(render({ directAccounts: [] }), /还没有直属下级[\s\S]*站长/);
});

test("GG-045 history keeps public references, signed direction, remarks and all-record recovery", () => {
  const incoming = { ...transfer, id: "trf_public2", direction: "incoming", counterpartyId: "parent-b", counterpartyEmail: null };
  const html = render({ tab: "transfers", transfers: { items: [transfer, incoming], nextCursor: null } });
  assert.match(html, /分配给[\s\S]*trf_public1[\s\S]*核对说明[\s\S]*−50/);
  assert.match(html, /收到来自[\s\S]*账户不可用[\s\S]*trf_public2[\s\S]*\+50/);
  const scoped = render({ tab: "transfers", historyAccount: child, transfers: { items: [transfer, incoming], nextCursor: null } });
  assert.match(scoped, /全部记录[\s\S]*已加载全部记录/);
  assert.doesNotMatch(scoped, /trf_public2/);
  assert.deepEqual(transfersForCounterparty([transfer, incoming], child.id), [transfer]);
  assert.deepEqual(transfersForCounterparty([], child.id), []);
  assert.equal(transfersForCounterparty(base.transfers.items, null), base.transfers.items);
});

test("GG-045 filtered empty pages retain load-more, range disclosure, loading and retry errors", () => {
  const props = { tab: "transfers", historyAccount: { id: "missing", email: "missing@example.invalid" },
    transfers: { items: [transfer], nextCursor: "opaque-next" } };
  const html = render(props);
  assert.match(html, /仅筛选已加载记录[\s\S]*已加载记录中暂无此账户划拨[\s\S]*这不代表全部历史为空[\s\S]*加载更多/);
  assert.match(render({ ...props, loadingMore: true }), /disabled=""[\s\S]*加载更多/);
  assert.match(render({ ...props, loadMoreError: "读取失败" }), /role="alert">读取失败[\s\S]*加载更多/);
  const exhausted = render({ ...props, transfers: { items: [], nextCursor: null } });
  assert.match(exhausted, /此账户暂无划拨记录/);
  assert.doesNotMatch(exhausted, /加载更多|这不代表/);
  assert.match(render({ tab: "transfers", transfers: { items: [], nextCursor: null } }), /还没有划拨记录/);
});

test("GG-045 shared allocation content has access denial/loading and distinct contextual shells", () => {
  const props = { ...base, enabled: false, onAccountChange: noop };
  assert.match(renderToStaticMarkup(React.createElement(DistributionView, props)), /没有积分分配权限[\s\S]*仅分销商身份[\s\S]*企业身份使用成员创作额度/);
  assert.match(renderToStaticMarkup(React.createElement(DistributionView, { ...props, enabled: true })), /role="status"[\s\S]*正在读取分配账户/);
  const shell = renderToStaticMarkup(React.createElement(BusinessManagementView, { tab: "children", enabled: true, onAccountChange: noop, onBack: noop }));
  assert.match(shell, /分销管理[\s\S]*客户与下级[\s\S]*划拨记录/);
  assert.doesNotMatch(shell, /企业管理|GOODGOOD DISTRIBUTION|<aside|<h1>积分分配/);
});

test("GG-045 accepted transfer updates once before refreshing, with no second mutation", async () => {
  const calls = [];
  const result = { account: base.summary.account, transfer, created: true };
  const input = { childOwnerId: child.id, amount: "50", remark: null };
  const refreshed = await transferAndRefresh(input, {
    create: async (value) => { calls.push("create"); assert.deepEqual(value, input); return result; },
    onAccepted: (value) => { calls.push("accepted"); assert.equal(value, result); },
    readChildren: async () => { calls.push("children"); return { items: [child] }; },
    readTransfers: async () => { calls.push("transfers"); return base.transfers; },
  });
  assert.deepEqual(calls, ["create", "accepted", "children", "transfers"]);
  assert.equal(refreshed.refreshError, null);
  assert.deepEqual(refreshed.children.items, [child]);
});

test("GG-045 refresh failure preserves known accepted transfer; mutation failure propagates without acceptance", async () => {
  let accepted = 0, writes = 0;
  const dependencies = { create: async () => { writes += 1; return { account: base.summary.account, transfer }; },
    onAccepted: () => { accepted += 1; }, readChildren: async () => { throw Error("read failed"); }, readTransfers: async () => base.transfers };
  const refreshed = await transferAndRefresh({ childOwnerId: child.id, amount: "50", remark: null }, dependencies);
  assert.equal(accepted, 1); assert.equal(writes, 1);
  assert.equal(refreshed.children, null);
  assert.match(refreshed.refreshError, /trf_public1 已完成[\s\S]*不要重复分配/);
  await assert.rejects(transferAndRefresh({ childOwnerId: child.id, amount: "50", remark: null }, {
    ...dependencies, create: async () => { throw Error("insufficient transferable balance"); },
  }), /insufficient transferable balance/);
  assert.equal(accepted, 1);
});

test("GG-045 shared shell retains exact role gates, history-only routes and creation state", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const view = await readFile(new URL("../features/distribution/distribution-view.tsx", import.meta.url), "utf8");
  assert.equal((page.match(/businessRole === "distributor" && \(/g) ?? []).length, 2);
  assert.doesNotMatch(page, /<span>积分分配<\/span>|aria-label="积分分配"/);
  assert.doesNotMatch(page, /context="enterprise"|allocationEnabled|enterpriseAccountTab/);
  assert.match(page, /canonicalBusinessRoute[\s\S]*replace: true/);
  const effect = page.slice(page.indexOf("const canonicalize ="), page.indexOf("const applyWorkspaceRoute ="));
  assert.doesNotMatch(effect, /location.assign|setPrompt|setReferences|setGenerationRuns|setCreationBatches/);
  assert.match(view, /request !== loadRequestRef.current/);
  assert.match(view, /onOpenChange=\{\(open\) => !open && !submitting/);
  assert.match(view, /childOwnerId: selectedChild.id/);
  assert.match(view, /if \(loading && \(!summary \|\| !transfers\)\)/);
  assert.doesNotMatch(view, /if \(error \|\| !summary/);
  assert.match(view, /refreshError \?\? error/);
  const load = view.slice(view.indexOf("const load = useCallback"), view.indexOf("const amountIsValid"));
  assert.ok(load.indexOf("setRefreshError(null)") > load.indexOf("setTransfers(nextTransfers)"), "confirmed notice clears only after successful refreshed reads");
});
