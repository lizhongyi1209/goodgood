import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root, "next/image": `${root}node_modules/vinext/dist/shims/image.js` } },
  server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { PersonalInformationView, copyAccountInformation } = await vite.ssrLoadModule("/features/profile/personal-information.tsx");
const { normalizeProfileInput, uploadProfileAvatar } = await vite.ssrLoadModule("/features/profile/personal-profile.tsx");
const { AccountManagementPanels } = await vite.ssrLoadModule("/features/billing/credit-usage-dialog.tsx");
const noop = () => {};
const session = { authenticated: true, access: { status: "active" }, user: { id: "account-owner-248", email: "creator@example.invalid" },
  account: { invitationCode: "123456", availableCredits: "100", reservedCredits: "0", role: "member", tier: "seed", unit: "credit-cny-cent", businessRole: null } };
const profile = { displayName: "创作者", handle: "creator248", avatarReferenceId: null, avatarUrl: null, version: 1 };
function render(props = {}) {
  return renderToStaticMarkup(React.createElement(PersonalInformationView,
    { profile, session, loading: false, error: null, onRetry: noop, onSave: async () => profile, ...props }));
}

test("GG-248 account dialog puts personal information first and mounts it as the default panel", () => {
  const html = renderToStaticMarkup(React.createElement(AccountManagementPanels, { onProfileClick: noop, onAccountChange: noop }));
  assert.match(html, /aria-current="page"[^>]*>[\s\S]*?个人信息<\/button>/);
  assert.ok(html.indexOf("个人信息</button>") < html.indexOf("个人主页</button>"));
  assert.ok(html.indexOf("个人主页</button>") < html.indexOf("积分明细</button>"));
  assert.match(html, /<h1>个人信息<\/h1>/);
  assert.doesNotMatch(html, /<h1>积分明细<\/h1>/);
});

test("GG-248 ready information uses real profile/session values and offers identity/invitation copy", () => {
  const html = render();
  for (const value of ["头像", "昵称", "用户名", "登录邮箱", "用户 ID", "邀请码", "创作者", "creator248", session.user.email, session.user.id, session.account.invitationCode]) {
    assert.ok(html.includes(value), `missing ${value}`);
  }
  assert.match(html, /aria-label="复制用户 ID"/);
  assert.match(html, /aria-label="复制邀请码"/);
  assert.doesNotMatch(html, /编辑资料|充值|订阅/);
  assert.match(html, /<form[^>]*aria-label="编辑个人信息"/);
  assert.match(html, /<label[^>]*for="account-information-name"[^>]*>昵称<\/label>/);
  assert.match(html, /id="account-information-name"[^>]*value="创作者"/);
  assert.match(html, /id="account-information-handle"[^>]*value="creator248"/);
  assert.match(html, /更换头像/);
  assert.match(html, /type="submit"[^>]*disabled=""[^>]*>保存资料/);
  assert.match(html, /type="button"[^>]*disabled=""[^>]*>取消/);
});

test("GG-248 loading and read failure preserve a clear state without displaying stale identity", () => {
  const loading = render({ loading: true });
  assert.match(loading, /role="status"[\s\S]*正在读取个人资料/);
  assert.doesNotMatch(loading, /creator@example|account-owner-248/);
  const failure = render({ error: "资料读取失败" });
  assert.match(failure, /role="alert"[\s\S]*资料读取失败[\s\S]*重试/);
  assert.doesNotMatch(failure, /creator@example|account-owner-248/);
});

test("GG-248 missing optional account values stay truthful and disable copying", () => {
  const html = render({ profile: { ...profile, handle: null }, session: { ...session, user: { email: null }, account: {} } });
  assert.match(html, /id="account-information-handle"[^>]*placeholder="设置用户名"[^>]*value=""/);
  assert.match(html, /未提供/);
  assert.equal((html.match(/暂不可用/g) ?? []).length, 2);
  assert.match(html, /disabled="" aria-label="复制用户 ID"/);
  assert.match(html, /disabled="" aria-label="复制邀请码"/);
});

test("GG-250 shared profile edit normalization preserves the saved avatar/version and validates before writes", () => {
  const input = { displayName: "  新昵称  ", handle: " @Creator249 ", avatarReferenceId: null, version: 7 };
  assert.deepEqual(normalizeProfileInput(input), { ...input, displayName: "新昵称", handle: "creator249" });
  for (const value of ["", "ab", "x".repeat(25), "中文", "other/user"]) {
    assert.throws(() => normalizeProfileInput({ ...input, handle: value }), /用户名/);
  }
  for (const value of [" ", "x".repeat(31), "a\u202eb"]) {
    assert.throws(() => normalizeProfileInput({ ...input, displayName: value }), /名称/);
  }
  assert.equal(normalizeProfileInput({ ...input, displayName: "😀".repeat(30) }).displayName.length, 60);
  const avatar = "00000000-0000-4000-8000-000000000249";
  assert.equal(normalizeProfileInput({ ...input, avatarReferenceId: avatar }).avatarReferenceId, avatar);
});

test("GG-250 empty, invalid and oversized avatar files fail before uploading", async () => {
  for (const file of [{ type: "image/png", size: 0 }, { type: "image/gif", size: 10 }, { type: "image/jpeg", size: 20 * 1024 * 1024 + 1 }]) {
    await assert.rejects(uploadProfileAvatar(file), /JPG\/JPEG 或 PNG/);
  }
});

test("GG-248 copy writes the supplied identity and contains unsupported/failing clipboard paths", async () => {
  let copied;
  await copyAccountInformation(session.user.id, { async writeText(value) { copied = value; } });
  assert.equal(copied, session.user.id);
  await assert.rejects(copyAccountInformation("", { async writeText() { assert.fail("empty value must not copy"); } }));
  await assert.rejects(copyAccountInformation("123456"), /手动选择复制/);
  await assert.rejects(copyAccountInformation("123456", { async writeText() { throw new Error("Clipboard denied"); } }), /Clipboard denied/);
});
