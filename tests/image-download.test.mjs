import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

function downloadHarness({ body = "image-bytes", contentType = "image/jpeg" } = {}) {
  const calls = [];
  const scheduled = [];
  const link = {
    click: () => calls.push("click"),
    download: "",
    href: "",
    remove: () => calls.push("remove"),
    style: {},
  };
  let createdBlob;

  return {
    calls,
    dependencies: {
      documentObject: {
        body: { appendChild: (value) => calls.push(["append", value]) },
        createElement: (tag) => {
          assert.equal(tag, "a");
          return link;
        },
      },
      fetchImplementation: async () => {
        calls.push("fetch");
        return {
          arrayBuffer: async () => new TextEncoder().encode(body).buffer,
          headers: new Headers({ "content-type": contentType }),
          ok: true,
          status: 200,
        };
      },
      schedule: (callback, delayMs) => scheduled.push({ callback, delayMs }),
      urlObject: {
        createObjectURL: (blob) => {
          calls.push("createObjectURL");
          createdBlob = blob;
          return "blob:goodgood-download";
        },
        revokeObjectURL: (url) => calls.push(["revoke", url]),
      },
    },
    get createdBlob() {
      return createdBlob;
    },
    link,
    scheduled,
  };
}

test("fetches and validates the image before handing it to the browser download manager", async () => {
  const { imageDownloadFilename, saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  const harness = downloadHarness();
  const result = await saveImageToLocal(
    {
      createdAt: "2026-09-08T14:30:25",
      ordinal: 1,
      previewUrl: "https://assets.invalid/generated/image.jpeg?signature=private",
    },
    harness.dependencies,
  );

  assert.equal(result, "started");
  assert.deepEqual(
    harness.calls.map((call) => Array.isArray(call) ? call[0] : call),
    ["fetch", "createObjectURL", "append", "click", "remove"],
  );
  assert.equal(harness.createdBlob.size, new TextEncoder().encode("image-bytes").byteLength);
  assert.equal(harness.createdBlob.type, "image/jpeg");
  assert.equal(harness.link.href, "blob:goodgood-download");
  assert.equal(harness.link.download, "GoodGood_20260908_143025_01.jpg");
  assert.notEqual(
    harness.link.href,
    "https://assets.invalid/generated/image.jpeg?signature=private",
  );
  assert.equal(
    imageDownloadFilename("2026-09-08T14:30:25", 4, "/generated/output.webp"),
    "GoodGood_20260908_143025_04.webp",
  );
});

test("keeps the object URL alive until after the browser accepts the download", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  const harness = downloadHarness({ body: "png", contentType: "image/png" });

  await saveImageToLocal(
    {
      createdAt: "2026-09-08T14:30:25",
      ordinal: 2,
      previewUrl: "https://assets.invalid/private/output.png?signature=private",
    },
    harness.dependencies,
  );

  assert.equal(harness.scheduled.length, 1);
  assert.equal(harness.scheduled[0].delayMs, 60_000);
  assert.equal(harness.calls.some((call) => Array.isArray(call) && call[0] === "revoke"), false);
  harness.scheduled[0].callback();
  assert.deepEqual(harness.calls.at(-1), ["revoke", "blob:goodgood-download"]);
});

test("rejects an empty image before creating a browser download", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  let objectUrlCreated = false;

  await assert.rejects(
    saveImageToLocal(
      {
        createdAt: "2026-09-08T14:30:25",
        ordinal: 1,
        previewUrl: "https://assets.invalid/private/empty.jpg",
      },
      {
        fetchImplementation: async () => ({
          arrayBuffer: async () => new ArrayBuffer(0),
          headers: new Headers({ "content-type": "image/jpeg" }),
          ok: true,
          status: 200,
        }),
        urlObject: {
          createObjectURL: () => {
            objectUrlCreated = true;
            return "blob:must-not-exist";
          },
          revokeObjectURL: () => undefined,
        },
      },
    ),
    /empty file/,
  );
  assert.equal(objectUrlCreated, false);
});

test("rejects a failed signed-image response before creating a browser download", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  let responseRead = false;

  await assert.rejects(
    saveImageToLocal(
      {
        createdAt: "2026-09-08T14:30:25",
        ordinal: 1,
        previewUrl: "https://assets.invalid/private/missing.jpg",
      },
      {
        fetchImplementation: async () => ({
          arrayBuffer: async () => {
            responseRead = true;
            return new ArrayBuffer(0);
          },
          headers: new Headers(),
          ok: false,
          status: 403,
        }),
      },
    ),
    /status 403/,
  );
  assert.equal(responseRead, false);
});
