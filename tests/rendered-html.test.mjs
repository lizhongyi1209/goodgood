import assert from "node:assert/strict";
import test from "node:test";

test("renders the new GoodGood home and preserves the existing creation surface", async () => {
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
  assert.match(html, /今天想创作什么？/);
  assert.match(html, /data-home-demo="off"/);
  assert.match(html, /aria-label="画面描述"/);
  assert.match(html, /aria-label="添加参考素材"/);
  assert.doesNotMatch(html, /aria-label="常用模板"|aria-label="灵感"|aria-label="对话"/);
  assert.doesNotMatch(html, />生成记录</);

  const creationResponse = await worker.fetch(new Request("http://localhost/create", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(creationResponse.status, 200);
  const creationHtml = await creationResponse.text();
  assert.match(creationHtml, /aria-label="图像生成区域"/);
  assert.match(creationHtml, /添加参考图片，最多 10 张/);
  assert.match(creationHtml, />Nano Banana 2</);
  assert.match(creationHtml, />描述你想创作的画面</);
  assert.doesNotMatch(creationHtml, /data-home-demo/);

  for (const pathname of ["/login?returnTo=%2Fcreate", "/register?returnTo=%2Fcreate"]) {
    const authenticationResponse = await worker.fetch(
      new Request(`http://localhost${pathname}`, {
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
    assert.equal(authenticationResponse.status, 200);
    assert.match(await authenticationResponse.text(), /正在确认登录状态/);
  }
});
