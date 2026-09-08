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

test("uses the native save picker before fetching and writes the downloaded bytes", async () => {
  const { imageDownloadFilename, saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  const calls = [];
  const blob = new Blob(["image-bytes"], { type: "image/jpeg" });
  const result = await saveImageToLocal(
    {
      createdAt: "2026-09-08T14:30:25",
      ordinal: 1,
      previewUrl: "https://assets.invalid/generated/image.jpeg?signature=private",
    },
    {
      fetchImplementation: async () => {
        calls.push("fetch");
        return { blob: async () => blob, ok: true, status: 200 };
      },
      saveFilePicker: async (options) => {
        calls.push(["picker", options.suggestedName]);
        return {
          createWritable: async () => ({
            close: async () => calls.push("close"),
            write: async (value) => calls.push(["write", value]),
          }),
        };
      },
    },
  );

  assert.equal(result, "saved");
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "picker",
    "fetch",
    "write",
    "close",
  ]);
  assert.equal(calls[0][1], "GoodGood_20260908_143025_01.jpg");
  assert.equal(calls[2][1], blob);
  assert.equal(
    imageDownloadFilename("2026-09-08T14:30:25", 4, "/generated/output.webp"),
    "GoodGood_20260908_143025_04.webp",
  );
});

test("falls back to a Blob download without navigating to the signed URL", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  const calls = [];
  const link = {
    click: () => calls.push("click"),
    download: "",
    href: "",
    remove: () => calls.push("remove"),
    style: {},
  };
  const result = await saveImageToLocal(
    {
      createdAt: "2026-09-08T14:30:25",
      ordinal: 2,
      previewUrl: "https://assets.invalid/private/output.png?signature=private",
    },
    {
      documentObject: {
        body: { appendChild: (value) => calls.push(["append", value]) },
        createElement: (tag) => {
          assert.equal(tag, "a");
          return link;
        },
      },
      fetchImplementation: async () => ({
        blob: async () => new Blob(["png"]),
        ok: true,
        status: 200,
      }),
      saveFilePicker: null,
      urlObject: {
        createObjectURL: () => "blob:goodgood-download",
        revokeObjectURL: (url) => calls.push(["revoke", url]),
      },
    },
  );

  assert.equal(result, "saved");
  assert.equal(link.href, "blob:goodgood-download");
  assert.equal(link.download, "GoodGood_20260908_143025_02.png");
  assert.notEqual(link.href, "https://assets.invalid/private/output.png?signature=private");
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "append",
    "click",
    "remove",
    "revoke",
  ]);
});

test("treats cancelling the native picker as a quiet cancellation", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  let fetched = false;
  const result = await saveImageToLocal(
    {
      createdAt: "2026-09-08T14:30:25",
      ordinal: 1,
      previewUrl: "/asset.png",
    },
    {
      fetchImplementation: async () => {
        fetched = true;
        throw new Error("must not fetch after cancellation");
      },
      saveFilePicker: async () => {
        throw new DOMException("cancelled", "AbortError");
      },
    },
  );

  assert.equal(result, "cancelled");
  assert.equal(fetched, false);
});

test("rejects an empty image response before opening a writable file", async () => {
  const { saveImageToLocal } = await vite.ssrLoadModule(
    "/features/assets/image-download.ts",
  );
  let writableOpened = false;

  await assert.rejects(
    saveImageToLocal(
      {
        createdAt: "2026-09-08T14:30:25",
        ordinal: 1,
        previewUrl: "https://assets.invalid/private/empty.jpg",
      },
      {
        fetchImplementation: async () => ({
          blob: async () => new Blob([], { type: "image/jpeg" }),
          ok: true,
          status: 200,
        }),
        saveFilePicker: async () => ({
          createWritable: async () => {
            writableOpened = true;
            throw new Error("must not open a writable for empty bytes");
          },
        }),
      },
    ),
    /empty file/,
  );
  assert.equal(writableOpened, false);
});
