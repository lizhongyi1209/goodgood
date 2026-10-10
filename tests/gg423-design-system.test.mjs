import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const vite = await createServer({ configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
after(() => vite.close());
const system = await vite.ssrLoadModule("/features/design-system/index.ts");
const html = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test("GG-423 composer submits Enter but preserves Shift+Enter and IME composition", () => {
  const submit = system.shouldSubmitComposer;
  assert.equal(submit({ key: "Enter", shiftKey: false, isComposing: false }), true);
  for (const data of [{ key: "Enter", shiftKey: true, isComposing: false }, { key: "Enter", shiftKey: false, isComposing: true }, { key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 }, { key: "a", shiftKey: false, isComposing: false }]) assert.equal(submit(data), false);
});
test("GG-423 empty composer disables submission and has no parameter controls", () => {
  const rendered = html(system.Composer, { mode: "image", prompt: "", onPromptChange() {}, onModeChange() {}, onSubmit() {} });
  assert.match(rendered, /aria-label="画面描述"/);
  assert.match(rendered, /aria-label="生成"[^>]*disabled/);
  assert.doesNotMatch(rendered, /参数|分辨率|模型选择|飞鸿|aria-label="对话"/);
});
test("GG-423 optional chat mode is explicit and loading is accessible", () => {
  const rendered = html(system.Composer, { mode: "chat", prompt: "你好", showChat: true, busy: true, onPromptChange() {}, onModeChange() {}, onSubmit() {} });
  assert.match(rendered, /aria-label="对话"/);
  assert.match(rendered, /aria-label="发送"[^>]*aria-busy="true"/);
});
test("GG-423 navigation, account and credits retain accessible names", () => {
  assert.match(html(system.NavItem, { label: "首页", href: "/", current: true }), /aria-current="page"/);
  assert.match(html(system.AccountRow, { name: "测试", balanceLabel: "积分 200" }), /测试，积分 200，打开账户菜单/);
  assert.match(html(system.CreditPill, { balance: "200" }), /aria-label="积分 200"/);
  assert.match(html(system.CreditPill, { balance: "200", loading: true }), /积分正在读取/);
});
test("GG-423 media retains its aspect ratio and retry state", () => {
  const ready = html(system.MediaTile, { item: { id: "m", title: "作品", src: "/nano-fashion.png", width: 3, height: 4 }, onOpen() {} });
  assert.match(ready, /aspect-ratio:3 \/ 4/);
  assert.match(ready, /aria-label="查看大图 作品"/);
  const failed = html(system.MediaTile, { item: { id: "m", title: "作品", src: "", width: 3, height: 4, state: "failed", error: "读取失败" }, onOpen() {}, onRetry() {} });
  assert.match(failed, /读取失败/); assert.match(failed, /重试/);
});
test("GG-423 all styled custom properties exist and every token agrees with JSON", async () => {
  const css = await readFile(new URL("../app/design-tokens.css", import.meta.url), "utf8");
  const rules = await readFile(new URL("../features/design-system/design-system.module.css", import.meta.url), "utf8");
  const defined = new Set([...css.matchAll(/(--ds-[\w-]+):/g)].map(match => match[1]));
  for (const match of rules.matchAll(/var\((--[\w-]+)/g)) assert.ok(defined.has(match[1]), match[1]);
  assert.doesNotMatch(rules, /#[\da-f]{3,8}\b|rgba?\(/i);
  const json = JSON.parse(await readFile(new URL("../docs/design/tokens.json", import.meta.url), "utf8"));
  for (const group of Object.values(json)) if (Array.isArray(group?.tokens)) for (const token of group.tokens) {
    const match = css.match(new RegExp(`--ds-${token.name}:\\s*([^;]+);`));
    assert.ok(match, token.name); assert.equal(match[1].trim(), token.value, token.name);
  }
});
