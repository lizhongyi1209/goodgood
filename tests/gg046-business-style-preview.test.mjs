import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { businessStyleFixtures } = await vite.ssrLoadModule("/features/distribution/business-style-fixtures.ts");
const { BusinessManagementView } = await vite.ssrLoadModule("/features/distribution/business-management-view.tsx");
const { BusinessManagementStylePreview } = await vite.ssrLoadModule("/features/distribution/business-management-style-preview.tsx");
const noop = () => {};

test("GG-046 synthetic fixture totals, public IDs and recent timestamps are coherent", () => {
  for (const [context, fixture] of Object.entries(businessStyleFixtures)) {
    assert.equal(fixture.summary.businessRole, context);
    assert.equal(fixture.summary.directChildCount, fixture.directAccounts.length);
    assert.equal(fixture.directAccounts.length, 4);
    const outgoing = fixture.transfers.items.filter((item) => item.direction === "outgoing");
    const incoming = fixture.transfers.items.filter((item) => item.direction === "incoming");
    const sum = (items) => items.reduce((value, item) => value + BigInt(item.amount), 0n);
    assert.equal(sum(incoming) - sum(outgoing), BigInt(fixture.summary.account.transferableCredits));
    assert.ok(BigInt(fixture.summary.account.availableCredits) > BigInt(fixture.summary.account.transferableCredits));
    for (const child of fixture.directAccounts) {
      const rows = outgoing.filter((item) => item.counterpartyId === child.id);
      assert.equal(sum(rows), BigInt(child.allocatedCredits));
      assert.equal(child.lastTransferredAt, rows[0]?.createdAt ?? null);
      assert.match(child.email, /@demo\.example\.invalid$/);
    }
    for (const transfer of fixture.transfers.items) assert.match(transfer.id, /^trf_demo-/);
    assert.equal(fixture.transfers.nextCursor, null);
  }
});

test("GG-046 both contextual mock lists render nonempty through the real shared presentation", () => {
  for (const [context, previewData] of Object.entries(businessStyleFixtures)) {
    const before = JSON.stringify(previewData);
    const html = renderToStaticMarkup(React.createElement(BusinessManagementView, {
      context, tab: "children", enabled: true, previewData, onNavigateTab: noop, onAccountChange: noop, onBack: noop,
    }));
    assert.match(html, context === "enterprise" ? /企业管理/ : /分销管理/);
    assert.match(html, /累计分配[\s\S]*查看记录[\s\S]*分配积分/);
    assert.match(html, /尚未分配/);
    assert.equal((html.match(/>分配积分<\/button>/g) ?? []).length, 4);
    assert.doesNotMatch(html, /正在读取分配账户|还没有直属下级/);
    assert.equal(JSON.stringify(previewData), before);
  }
});

test("GG-046 mock histories show incoming/outgoing, remarks and synthetic support references", () => {
  for (const [context, previewData] of Object.entries(businessStyleFixtures)) {
    const html = renderToStaticMarkup(React.createElement(BusinessManagementView, {
      context, tab: "transfers", enabled: true, previewData, onNavigateTab: noop, onAccountChange: noop, onBack: noop,
    }));
    assert.match(html, /分配给[\s\S]*trf_demo-[\s\S]*9 月创作额度补充/);
    assert.match(html, /收到来自[\s\S]*上级积分划入/);
    assert.doesNotMatch(html, /还没有划拨记录|加载更多/);
  }
});

test("GG-046 demo framing separates visual contexts from account identity and transfers", () => {
  const html = renderToStaticMarkup(React.createElement(BusinessManagementStylePreview));
  assert.match(html, /模拟数据预览[\s\S]*不改变账户身份[\s\S]*不会实际划拨积分/);
  assert.match(html, /aria-pressed="true"[\s\S]*企业呈现/);
  assert.match(html, /aria-pressed="false"[\s\S]*分销呈现/);
  assert.match(html, /6500[\s\S]*9000/);
});

test("GG-046 preview data disables all shared reads, paging and transfer writes", async () => {
  const source = await readFile(new URL("../features/distribution/distribution-view.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!enabled \|\| previewData\) return/);
  assert.match(source, /if \(previewData \|\| !selectedChild \|\| !amountIsValid\) return/);
  assert.match(source, /if \(previewData \|\| !transfers\?\.nextCursor/);
  assert.match(source, /disabled=\{Boolean\(previewData\) \|\| submitting \|\| !amountIsValid\}/);
  assert.match(source, /不会提交实际划拨请求/);
  const preview = await readFile(new URL("../features/distribution/business-management-style-preview.tsx", import.meta.url), "utf8");
  assert.match(preview, /onAccountChange=\{\(\) => \{\}\}/);
  assert.doesNotMatch(preview, /fetch\(|localStorage|sessionStorage|http-distribution-boundary|createDistributionTransfer/);
});

test("GG-046 explicit visual preview is available only in an existing UI-only preview session", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(session\?\.preview\) \{[\s\S]*setBusinessStylePreview\(url.searchParams.get\("business-preview"\) === "1"\)/);
  assert.match(page, /authenticationSession\?\.preview && businessStylePreview \? <BusinessManagementStylePreview/);
  const session = await readFile(new URL("../app/api/auth/session/route.ts", import.meta.url), "utf8");
  assert.match(session, /process.env.NODE_ENV !== "production" && !process.env.GOODGOOD_AUTH_MODE/);
  assert.match(page, /context="enterprise"[\s\S]*businessRole === "enterprise"/);
});
