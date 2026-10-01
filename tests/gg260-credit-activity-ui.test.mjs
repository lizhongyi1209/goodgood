import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
// A delegated worktree can borrow the integration tree's locked dependencies;
// compilation stays in memory and writes no node_modules or build output.
const dependencyRoot = process.env.GOODGOOD_TEST_DEPENDENCY_ROOT || root;
const requireDependency = createRequire(path.join(dependencyRoot, "package.json"));
const React = requireDependency("react");
const { renderToStaticMarkup } = requireDependency("react-dom/server");
const { build } = requireDependency("esbuild");

async function load(file, stubAuth = false) {
  const result = await build({
    entryPoints: [path.join(root, file)], absWorkingDir: root, tsconfig: path.join(root, "tsconfig.json"),
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "in-memory-test-modules", setup(builder) {
      builder.onResolve({ filter: /\.module\.css$/ }, ({ path: target }) => ({ path: target, namespace: "css" }));
      builder.onLoad({ filter: /.*/, namespace: "css" }, () => ({ contents: "export default new Proxy({}, { get: (_, key) => String(key) });", loader: "js" }));
      if (stubAuth) {
        builder.onResolve({ filter: /^@\/features\/auth\/http-auth-boundary$/ }, () => ({ path: "auth", namespace: "stub" }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const goodGoodApiFetch = (...args) => globalThis.__gg260Fetch(...args);", loader: "js" }));
      }
    } }],
  });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(requireDependency, compiled, compiled.exports);
  return compiled.exports;
}
const { CreditActivityView, CreditActivityTableRows, CreditFreeQuotaSummary } = await load("features/billing/credit-activity-view.tsx");
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test("GG-260 SSR keeps all seven headers/filter and bounded loading/disabled states", () => {
  for (const enabled of [false, true]) {
    const html = render(CreditActivityView, { enabled, onAccountChange() {}, variant: "dialog" });
    assert.match(html, /当前积分[\s\S]*今日消耗[\s\S]*本周消耗[\s\S]*本月消耗/);
    assert.match(html, /类型<\/th>[\s\S]*项目<\/th>[\s\S]*模型<\/th>[\s\S]*筛选积分明细状态[\s\S]*日期<\/th>[\s\S]*积分变化<\/th>[\s\S]*任务 ID<\/th>/);
    assert.match(html, /colSpan="7"|colspan="7"/);
    assert.doesNotMatch(html, /加载更多|批次|今日免费图片/);
    assert.match(html, enabled ? /正在读取积分记录[\s\S]*上一页[\s\S]*下一页/ : /积分明细暂不可用/);
  }
});

test("GG-260 task column is last, uses explicit project/model values and exposes full-ID copy", () => {
  const taskId = "12345678-1234-4321-aaaa-123456abcdef";
  const item = { id: "act_1", kind: "generation", category: "image_generation", status: "spent", amount: "-20", occurredAt: "2026-10-01T00:00:00.000Z", taskId, projectName: "项目 A", modelName: "Nano Banana 2", batchReference: "do-not-show" };
  const html = render(CreditActivityTableRows, { items: [item] });
  assert.match(html, /图片生成[\s\S]*项目 A[\s\S]*Nano Banana 2[\s\S]*已消耗[\s\S]*-20[\s\S]*12345678…abcdef/);
  assert.match(html, new RegExp(`aria-label="复制完整任务 ID ${taskId}"`));
  assert.doesNotMatch(html, /do-not-show|批次/);
  const noTask = render(CreditActivityTableRows, { items: [{ ...item, taskId: null, projectName: null, modelName: null }] });
  assert.doesNotMatch(noTask, /复制完整任务|12345678…abcdef|项目 A|Nano Banana 2/);
});

test("GG-260 daily free summary renders only supplied quota numbers and does not add them to credits", () => {
  assert.equal(render(CreditFreeQuotaSummary, {}), "");
  assert.equal(render(CreditFreeQuotaSummary, { quota: null }), "");
  const html = render(CreditFreeQuotaSummary, { quota: { remaining: 3, limit: 10, reserved: 2 } });
  assert.match(html, /今日免费图片[\s\S]*剩余 3 \/ 10 张[\s\S]*2 张生成中/);
  assert.doesNotMatch(html, /当前积分|充值|余额/);
});

test("GG-260 read boundary requests usage/20 and forwards cancellation without network access", async () => {
  const { readCreditActivities } = await load("features/billing/http-billing-boundary.ts", true);
  const calls = [], payload = { account: { availableCredits: "90071992547409931234" }, items: [], nextCursor: null };
  globalThis.__gg260Fetch = async (...args) => { calls.push(args); return new Response(JSON.stringify(payload)); };
  try {
    const controller = new AbortController();
    assert.deepEqual(await readCreditActivities({ filter: "spend", cursor: "cursor-a", signal: controller.signal }), payload);
    const [url, init] = calls[0];
    const query = new URL(url, "https://test.invalid").searchParams;
    assert.equal(query.get("view"), "usage");
    assert.equal(query.get("limit"), "20");
    assert.equal(query.get("filter"), "spend");
    assert.equal(query.get("cursor"), "cursor-a");
    assert.equal(init.signal, controller.signal);
    globalThis.__gg260Fetch = async () => new Response(JSON.stringify({ error: { message: "失败可重试" } }), { status: 503 });
    await assert.rejects(readCreditActivities(), /失败可重试/);
  } finally { delete globalThis.__gg260Fetch; }
});
