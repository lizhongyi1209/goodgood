import assert from "node:assert/strict";
import test from "node:test";

test("renders the GoodGood creation entry surface", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();

  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>GoodGood · AI 视觉创作<\/title>/);
  assert.match(html, /aria-label="图像生成区域"/);
  assert.match(html, /上传参考图片，最多 10 张/);
  assert.match(html, />Nano Banana 2</);
  assert.match(html, />描述你想创作的画面</);
  assert.doesNotMatch(html, />生成记录</);
});
