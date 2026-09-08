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

function downloadHarness({
  body = "image-bytes",
  contentType = "image/jpeg",
  freshUrl = "https://assets.invalid/fresh/image.jpg?signature=new",
} = {}) {
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
      fetchImplementation: async (url) => {
        calls.push(["fetch", url]);
        return {
          arrayBuffer: async () => new TextEncoder().encode(body).buffer,
          headers: new Headers({ "content-type": contentType }),
          ok: true,
          status: 200,
        };
      },
      resolveDownloadUrl: async (assetId) => {
        calls.push(["resolve", assetId]);
        return freshUrl;
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
      assetId: "10000000-0000-4000-8000-000000000001",
      createdAt: "2026-09-08T14:30:25",
      ordinal: 1,
      previewUrl: "https://assets.invalid/generated/image.jpeg?signature=expired",
    },
    harness.dependencies,
  );

  assert.equal(result, "started");
  assert.deepEqual(
    harness.calls.map((call) => Array.isArray(call) ? call[0] : call),
    ["resolve", "fetch", "createObjectURL", "append", "click", "remove"],
  );
  assert.deepEqual(harness.calls[0], [
    "resolve",
    "10000000-0000-4000-8000-000000000001",
  ]);
  assert.deepEqual(harness.calls[1], [
    "fetch",
    "https://assets.invalid/fresh/image.jpg?signature=new",
  ]);
  assert.equal(harness.createdBlob.size, new TextEncoder().encode("image-bytes").byteLength);
  assert.equal(harness.createdBlob.type, "image/jpeg");
  assert.equal(harness.link.href, "blob:goodgood-download");
  assert.equal(harness.link.download, "GoodGood_20260908_143025_01.jpg");
  assert.notEqual(
    harness.link.href,
    "https://assets.invalid/generated/image.jpeg?signature=expired",
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
      assetId: "10000000-0000-4000-8000-000000000002",
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

test("reports the exact stage when a fresh download URL cannot be resolved", async () => {
  const { ImageDownloadError, saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );

  await assert.rejects(
    saveImageToLocal(
      {
        assetId: "10000000-0000-4000-8000-000000000005",
        createdAt: "2026-09-08T14:30:25",
        ordinal: 1,
        previewUrl: "https://assets.invalid/private/stale.jpg",
      },
      {
        resolveDownloadUrl: async () => {
          throw new Error("session expired");
        },
      },
    ),
    (error) =>
      error instanceof ImageDownloadError &&
      error.stage === "resolve-url" &&
      /could not be refreshed/.test(error.message),
  );
});

test("rejects an empty image before creating a browser download", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  let objectUrlCreated = false;

  await assert.rejects(
    saveImageToLocal(
      {
        assetId: "10000000-0000-4000-8000-000000000003",
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
        resolveDownloadUrl: async () => "https://assets.invalid/fresh/empty.jpg",
        urlObject: {
          createObjectURL: () => {
            objectUrlCreated = true;
            return "blob:must-not-exist";
          },
          revokeObjectURL: () => undefined,
        },
      },
    ),
    (error) => error.stage === "validate" && /empty file/.test(error.message),
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
        assetId: "10000000-0000-4000-8000-000000000004",
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
        resolveDownloadUrl: async () => "https://assets.invalid/fresh/missing.jpg",
      },
    ),
    (error) => error.stage === "fetch" && /status 403/.test(error.message),
  );
  assert.equal(responseRead, false);
});
