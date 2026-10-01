import test from "node:test";
import assert from "node:assert/strict";
import { canvasAssetFileError, canvasImageLinkUrl, downloadCanvasImageLink } from "../features/canvas/canvas-asset-addition.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "../shared/contracts/upload-limits.mjs";

// GG-245 updates and verifies the link-read contract; no real upload or provider call.
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 1]);
const file = (name, type, size = 1) => ({ name, type, size });
const imageResponse = (bytes = png, type = "image/png") => new Response(bytes, { headers: { "content-type": type } });

test("file selection accepts the four existing formats and their size boundary", () => {
  for (const [name, type] of [["a.JPG", "image/jpeg"], ["a.jpeg", "image/jpeg"], ["a.png", "image/png"], ["a.mp4", "video/mp4"], ["a.mp3", "audio/mpeg"]]) {
    assert.equal(canvasAssetFileError(file(name, type, PRIVATE_IMAGE_UPLOAD_MAX_BYTES)), null);
  }
  assert.match(canvasAssetFileError(file("a.png", "image/png", 0)), /不能为空/);
  assert.match(canvasAssetFileError(file("a.png", "image/png", PRIVATE_IMAGE_UPLOAD_MAX_BYTES + 1)), /20 MB/);
  assert.match(canvasAssetFileError(file("a.gif", "image/gif")), /仅支持/);
  assert.match(canvasAssetFileError(file("a.html", "image/png")), /仅支持/);
});

test("links require complete HTTP(S) and reject credentials and alternate schemes", () => {
  assert.equal(canvasImageLinkUrl(" https://images.example/p.png ").href, "https://images.example/p.png");
  assert.equal(canvasImageLinkUrl("http://images.example/p.jpg").protocol, "http:");
  for (const value of ["", "/p.png", "data:image/png;base64,AA==", "file:///p.png", "ftp://images.example/p.png", "https://user:pass@images.example/p.png"]) {
    assert.throws(() => canvasImageLinkUrl(value), /图片直链/);
  }
});

test("a public image becomes a normal File through the authenticated same-origin endpoint", async () => {
  let request;
  const result = await downloadCanvasImageLink("https://images.example/%E5%9B%BE%E7%89%87.webp?token=x", {
    fetchImplementation: async (url, options) => { request = { url, options }; return imageResponse(); },
  });
  assert.equal(result.name, "图片.png");
  assert.equal(result.type, "image/png");
  assert.equal(result.size, png.length);
  assert.equal(request.url, "/api/references/read-link");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { url: "https://images.example/%E5%9B%BE%E7%89%87.webp?token=x" });
  assert.equal(request.options.credentials, "same-origin");
  assert.equal(request.options.mode, "same-origin");
  assert.equal(request.options.cache, "no-store");
  assert.deepEqual(request.options.headers, { "content-type": "application/json" });
});

test("JPEG MIME parameters and malformed filename escaping use a safe filename", async () => {
  const result = await downloadCanvasImageLink("https://images.example/%ZZ", { fetchImplementation: async () => imageResponse(jpeg, "image/jpeg; charset=binary") });
  assert.equal(result.type, "image/jpeg");
  assert.equal(result.name, "链接图片.jpg");
});

test("HTTP, non-image, empty and forged MIME responses remain failures", async () => {
  const cases = [
    [() => new Response("denied", { status: 403 }), /HTTP 403/],
    [() => imageResponse(png, "text/html"), /直接返回 JPG 或 PNG/],
    [() => imageResponse(new Uint8Array()), /空文件/],
    [() => imageResponse(Uint8Array.from([1, 2, 3])), /不是有效/],
  ];
  for (const [response, expected] of cases) await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", { fetchImplementation: async () => response() }), expected);
});

test("declared oversized responses cancel the body before download", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
    headers: { "content-type": "image/png", "content-length": String(PRIVATE_IMAGE_UPLOAD_MAX_BYTES + 1) },
  });
  await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", { fetchImplementation: async () => response }), /20 MB/);
  assert.equal(cancelled, true);
});

test("chunked downloads enforce actual bytes even without Content-Length", async () => {
  let chunk = 0;
  let cancelled = false;
  const response = new Response(new ReadableStream({
    pull(controller) { controller.enqueue(chunk++ === 0 ? new Uint8Array(PRIVATE_IMAGE_UPLOAD_MAX_BYTES) : Uint8Array.of(1)); },
    cancel() { cancelled = true; },
  }), { headers: { "content-type": "image/png" } });
  await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", { fetchImplementation: async () => response }), /20 MB/);
  assert.equal(cancelled, true);
});

test("network failure offers retry without blaming the public image's CORS headers", async () => {
  await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", { fetchImplementation: async () => { throw new TypeError("Failed to fetch"); } }), /检查网络.*上传文件/);
});

test("structured authorization and unsafe-link errors retain the server's recovery message", async () => {
  for (const [status, message] of [[401, "登录已失效，请重新登录。"], [400, "图片链接须指向公开网络地址。"], [408, "读取图片超时，请重试。"]]) {
    await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", {
      fetchImplementation: async () => Response.json({ error: { message } }, { status }),
    }), { message });
  }
});

test("a timed-out download aborts and permits a later retry", async () => {
  let aborted = false;
  await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", {
    timeoutMs: 1,
    fetchImplementation: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => { aborted = true; reject(options.signal.reason); }, { once: true })),
  }), /超时/);
  assert.equal(aborted, true);
  const retry = await downloadCanvasImageLink("https://images.example/p.png", { fetchImplementation: async () => imageResponse() });
  assert.equal(retry.size, png.length);
});

test("panel cancellation prevents a download request from starting", async () => {
  const controller = new AbortController();
  controller.abort();
  let requested = false;
  await assert.rejects(downloadCanvasImageLink("https://images.example/p.png", { signal: controller.signal, fetchImplementation: async () => { requested = true; return imageResponse(); } }), { name: "AbortError" });
  assert.equal(requested, false);
});
