import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root, "next/image": `${root}node_modules/vinext/dist/shims/image.js` } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const noop = () => {};
const header = (text, className) => {
  const start = text.indexOf(`<header className="${className}"`);
  assert.notEqual(start, -1, `missing ${className} header`);
  const end = text.indexOf("</header>", start);
  assert.notEqual(end, -1);
  return text.slice(start, end + "</header>".length);
};
const noReturn = (text) => assert.doesNotMatch(text, /返回创作|企业列表|onBack|ArrowLeft|asset-return-button|credit-activity-back/);

test("GG-050 four workspace page headers retain the accepted absence of return replacements", async () => {
  const cases = [
    ["app/page.tsx", "asset-library-header"],
    ["features/billing/credit-activity-view.tsx", "credit-activity-header"],
    ["features/distribution/business-management-view.tsx", "organization-header"],
    ["features/organizations/organization-management-page.tsx", "organization-header"],
  ];
  for (const [path, className] of cases) {
    const text = header(await source(path), className);
    noReturn(text);
    assert.doesNotMatch(text, /breadcrumb|返回列表|返回上级|history\.back|href="\/create"/);
  }
  const assets = header(await source("app/page.tsx"), "asset-library-header");
  assert.match(assets, /生成图片[\s\S]*上传素材[\s\S]*批次[\s\S]*画廊/);
});

test("GG-057 shared site-owner navigation marks either page and links directly to management and creation", async () => {
  const { AdminManagementHeader } = await vite.ssrLoadModule("/features/admin/admin-management-header.tsx");
  for (const activePage of ["users", "models"]) {
    const html = render(AdminManagementHeader, { activePage, onLogout: noop });
    assert.match(html, /站长管理/);
    assert.match(html, /href="\/admin\/users"/);
    assert.match(html, /href="\/admin\/models"/);
    assert.match(html, new RegExp(`href="/admin/${activePage}" aria-current="page"`));
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(html, /href="\/create"[^>]*>[\s\S]*?返回创作/);
    assert.match(html, /aria-label="退出登录"/);
    assert.doesNotMatch(html, /\/api\/auth\/login|history\.back/);
  }
  for (const [file, activePage] of [["account", "users"], ["model", "models"]]) {
    const text = await source(`features/admin/${file}-management-page.tsx`);
    assert.match(text, new RegExp(`<AdminManagementHeader activePage="${activePage}" onLogout=`));
    assert.ok(text.indexOf('session.account.role !== "site_owner"') < text.indexOf("<AdminManagementHeader"));
  }
});

test("GG-050 removed return callbacks, icons and dedicated styles cannot leave empty controls", async () => {
  for (const path of ["features/billing/credit-activity-view.tsx", "features/distribution/business-management-view.tsx",
    "features/distribution/business-management-style-preview.tsx"]) noReturn(await source(path));
  const page = await source("app/page.tsx");
  assert.doesNotMatch(page, /\bonBack=|asset-return-button/);
  assert.doesNotMatch(await source("app/globals.css"), /asset-return-button|credit-activity-back/);
  for (const path of ["features/admin/account-management-page.tsx", "features/organizations/organization-management-page.tsx"])
    assert.doesNotMatch(await source(path), /\bArrowLeft\b/);
});

test("GG-050 credit/enterprise loading headings and enterprise denial omit returns", async () => {
  const { CreditActivityView } = await vite.ssrLoadModule("/features/billing/credit-activity-view.tsx");
  for (const enabled of [false, true]) {
    const html = render(CreditActivityView, { enabled, onAccountChange: noop });
    noReturn(html);
    assert.match(html, /<h1>积分记录<\/h1>[\s\S]*今日消耗[\s\S]*本周消耗[\s\S]*本月消耗/);
    assert.match(html, /全部[\s\S]*消费[\s\S]*获得[\s\S]*退回/);
  }
  const { OrganizationManagementView } = await vite.ssrLoadModule("/features/organizations/organization-management-page.tsx");
  for (const activeTab of ["overview", "members", "usage", "assets"]) for (const enabled of [false, true]) {
    const html = render(OrganizationManagementView, { activeTab, enabled, workspaceId: "company-a" });
    noReturn(html);
    if (enabled) {
      assert.match(html, /<h1>企业管理<\/h1>[\s\S]*概览[\s\S]*成员与额度[\s\S]*消费记录[\s\S]*团队资产/);
      assert.match(html, /正在加载企业信息/);
    } else {
      assert.match(html, /请使用已开通的账户查看企业管理/);
      assert.doesNotMatch(html, /企业管理内容/);
    }
  }
});

test("GG-050 distributor headers stay return-free in loading, denial, populated and empty tabs", async () => {
  const { BusinessManagementView } = await vite.ssrLoadModule("/features/distribution/business-management-view.tsx");
  const { businessStyleFixtures } = await vite.ssrLoadModule("/features/distribution/business-style-fixtures.ts");
  const fixture = businessStyleFixtures.distributor;
  const empty = { ...fixture, summary: { ...fixture.summary, directChildCount: 0 }, directAccounts: [], transfers: { items: [], nextCursor: null } };
  for (const tab of ["children", "transfers"]) {
    const base = { tab, onAccountChange: noop };
    for (const props of [{ enabled: true }, { enabled: false }, { enabled: true, previewData: fixture }, { enabled: true, previewData: empty }]) {
      const html = render(BusinessManagementView, { ...base, ...props });
      noReturn(html);
      assert.match(html, /<h1>分销管理<\/h1>[\s\S]*客户与下级[\s\S]*划拨记录/);
    }
    assert.match(render(BusinessManagementView, { ...base, enabled: true }), /正在读取分配账户/);
    assert.match(render(BusinessManagementView, { ...base, enabled: false }), /没有积分分配权限/);
    assert.match(render(BusinessManagementView, { ...base, enabled: true, previewData: empty }), tab === "children" ? /还没有直属下级/ : /还没有划拨记录/);
  }
});

test("GG-050 error-body recovery, close, new creation and logout remain explicitly wired", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /onClick=\{handleProjectsNav\}[^>]*>[\s\S]*?返回项目/);
  assert.match(page, /onClick=\{handleAssetNav\}[^>]*>[\s\S]*?返回资产库/);
  assert.match(page, /className="new-creation-button" onClick=\{requestNewCreation\}/);
  assert.match(page, /aria-label="关闭图片详情" onClick=\{closeImageDetail\}/);
  assert.match(page, /返回个人创作/);
  const enterprise = await source("features/organizations/organization-management-page.tsx");
  assert.match(enterprise, /企业信息加载失败[\s\S]*返回企业列表/);
  const admin = await source("features/admin/account-management-page.tsx");
  assert.match(admin, /没有账户管理权限[\s\S]*href="\/create">返回创作/);
  assert.match(admin, /<AdminManagementHeader activePage="users" onLogout=\{\(\) => void logout\(\)\}/);
  assert.match(await source("features/creation/video-preview-detail.tsx"), /aria-label="关闭视频详情" onClick=\{\(\) => onSelect\(null\)\}/);
});
