import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// In-memory fixtures only: no database, queue, provider or account writes.
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { overviewMembers, overviewAttention, recentOrganizationOutputs } = await vite.ssrLoadModule("/features/organizations/organization-overview-model.ts");
const { OrganizationOverviewContent } = await vite.ssrLoadModule("/features/organizations/organization-overview.tsx");
const noop = () => {};
const member = (id, budget = null, status = "active") => ({ id, email: `${id}@example.invalid`, budget, status, role: "org_member" });
const budget = (settledCredits = "12", remainingCredits = "20", status = "active") => ({ settledCredits, remainingCredits, status, reservedCredits: "5" });
const dashboard = { workspace: { id: "company-a" }, account: { availableCredits: "150", unallocatedCredits: "80" },
  members: [member("a", budget())], invitations: [] };
const batch = (id, createdAt = "2026-09-13T01:00:00Z", state = "succeeded", count = 1) => ({
  id, createdAt, state, creator: { email: `${id}@example.invalid`, ownerId: id },
  input: { prompt: `prompt ${id}`, count: 999, modelId: "nano-banana-2", resolution: "1K", aspectRatio: "16:9" },
  outputs: Array.from({ length: count }, (_, index) => ({ id: `${id}-${index}`, previewUrl: `https://example.invalid/${id}-${index}.png`, width: 1024, height: 576 })),
});
const render = (props = {}) => renderToStaticMarkup(React.createElement(OrganizationOverviewContent, {
  dashboard, mutating: false, onAdjustBudget: noop, onMembers: noop, onAssets: noop,
  assets: { batches: [], loading: false, error: null, reload: noop }, ...props,
}));

test("GG-048 core facts distinguish actual zero, unconfigured credit account and unavailable monthly aggregates", () => {
  const html = render();
  assert.match(html, /企业可用积分[\s\S]*150[\s\S]*未分配额度 80/);
  for (const label of ["本月已消费", "本月生成成品", "本月活跃成员"]) {
    assert.match(html, new RegExp(`${label}</span><strong aria-label="${label}暂未接入">—</strong><p>待接入统计`));
  }
  assert.match(render({ dashboard: { ...dashboard, account: { availableCredits: "0", unallocatedCredits: "0" } } }), /企业可用积分<\/span><strong>0<\/strong>/);
  const unknown = render({ dashboard: { ...dashboard, account: null } });
  assert.match(unknown, /企业可用积分<\/span><strong>—<\/strong>[\s\S]*尚未配置企业积分[\s\S]*请联系站长补充企业积分/);
  assert.doesNotMatch(unknown, /团队额度与邀请状态正常|查看邀请/);
});

test("GG-048 attention is actionable, considers only active members and preserves reserved-credit wording", () => {
  const value = { ...dashboard, account: { availableCredits: "0" }, members: [
    member("no-budget"), member("zero", budget("12", "0")), member("paused", budget("12", "20", "paused")),
    member("healthy", budget()), member("removed", null, "removed"), member("suspended", null, "suspended"),
  ] };
  const items = overviewAttention(value);
  assert.deepEqual(items.map((item) => item.id).sort(), ["company-credit", "budget-no-budget", "budget-zero", "budget-paused"].sort());
  assert.match(items.find((item) => item.id === "budget-zero").description, /不含在途预留/);
  assert.equal(items.find((item) => item.id === "budget-no-budget").member, value.members[0]);
});

test("GG-048 invitation deadline uses an explicit clock and excludes expired or revoked invitations", () => {
  const now = Date.parse("2026-09-13T00:00:00Z");
  const invite = (id, hours, status = "pending") => ({ id, email: `${id}@example.invalid`, status, expiresAt: new Date(now + hours * 3600000).toISOString() });
  const value = { ...dashboard, invitations: [invite("soon", 1), invite("boundary", 48), invite("future", 49),
    invite("expired", -1), invite("now", 0), invite("revoked", 2, "revoked"), invite("accepted", 2, "accepted")] };
  assert.deepEqual(overviewAttention(value, now).map((item) => item.id), ["invite-soon", "invite-boundary"]);
});

test("GG-048 member ranking uses exact cumulative integers without changing the source", () => {
  const members = [member("small", budget("9007199254740992")), member("large", budget("9007199254740993")), member("removed", budget("999999999999999999"), "removed")];
  const snapshot = JSON.stringify(members);
  assert.deepEqual(overviewMembers({ ...dashboard, members }).map((item) => item.id), ["large", "small"]);
  assert.equal(JSON.stringify(members), snapshot);
});

test("GG-048 recent outputs use successful actual outputs, newest first, capped at six, never requested count", () => {
  const batches = [batch("old", "2026-09-10T00:00:00Z", "succeeded", 3), batch("failed", "2026-09-14T00:00:00Z", "failed"),
    batch("new", "2026-09-13T00:00:00Z", "succeeded", 4), batch("empty")];
  batches[3].outputs[0].previewUrl = null;
  const snapshot = JSON.stringify(batches);
  assert.deepEqual(recentOrganizationOutputs(batches).map((item) => item.output.id), ["new-0", "new-1", "new-2", "new-3", "old-0", "old-1"]);
  assert.equal(JSON.stringify(batches), snapshot);
  assert.deepEqual(recentOrganizationOutputs([]), []);
});

test("GG-048 populated overview has usage and read-only team previews, not duplicate navigation tiles", () => {
  const html = render({ assets: { batches: [batch("real-team")], loading: false, error: null, reload: noop } });
  assert.match(html, /需要关注[\s\S]*团队额度与邀请状态正常[\s\S]*成员使用概况[\s\S]*按累计消费排序/);
  assert.match(html, /a@example.invalid[\s\S]*12[\s\S]*20[\s\S]*调整额度/);
  assert.match(html, /最近团队成品[\s\S]*不含个人作品[\s\S]*查看 real-team@example.invalid 的成品详情/);
  assert.doesNotMatch(html, /organization-shortcuts|管理成员|查看消费|管理企业资产|999/);
  assert.match(render({ mutating: true }), /disabled=""[\s\S]*调整额度/);
});

test("GG-048 empty, loading and asset failure are local states that retain balance and member facts", () => {
  assert.match(render(), /还没有团队成品[\s\S]*企业创作完成后/);
  assert.match(render({ dashboard: { ...dashboard, members: [] } }), /还没有有效成员/);
  const loading = render({ assets: { batches: [], loading: true, error: null, reload: noop } });
  assert.match(loading, /role="status" aria-label="正在读取最近成品"/);
  assert.doesNotMatch(loading, /还没有团队成品/);
  const failed = render({ assets: { batches: [], loading: false, error: "成品读取失败", reload: noop } });
  assert.match(failed, /企业可用积分[\s\S]*150[\s\S]*a@example.invalid[\s\S]*role="alert"[\s\S]*成品读取失败[\s\S]*重新读取/);
  assert.doesNotMatch(failed, /还没有团队成品/);
});

test("GG-048 scope, stale-read recovery, focused preview and responsive styles stay bounded", async () => {
  const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const hook = await source("features/organizations/use-overview-assets.ts");
  const view = await source("features/organizations/organization-overview.tsx");
  const page = await source("features/organizations/organization-management-page.tsx");
  const css = await source("app/globals.css");
  assert.match(hook, /readOrganizationAssets\(workspaceId\)/);
  assert.match(hook, /request !== requestRef.current/);
  assert.match(hook, /return \(\) =>[\s\S]*requestRef.current \+= 1/);
  assert.doesNotMatch(hook + view, /createGeneration|grantOrganizationCredits|updateOrganizationMemberBudget|readOrganizationUsage|readAssetLibrary|\/api\/video/);
  assert.match(page, /<OrganizationOverview key=\{workspaceId\}[\s\S]*onAdjustBudget=\{openBudget\}/);
  assert.doesNotMatch(page, /organization-shortcuts/);
  assert.match(view, /onCloseAutoFocus[\s\S]*detailTriggerRef.current\?\.focus\(\)/);
  assert.match(view, /objectFit: "contain"[\s\S]*正在加载图片[\s\S]*图片暂时无法加载[\s\S]*刷新成品地址/);
  assert.match(css, /organization-overview-columns \{[\s\S]*grid-template-columns/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*organization-overview/);
});
