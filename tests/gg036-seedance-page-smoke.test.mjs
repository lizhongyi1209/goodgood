import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  LocalSeedancePreviewError,
  assertLocalPreviewRequest,
  loadLocalSeedancePreviewClient,
  resolveLocalSeedancePreviewConfig,
  toLocalVideoPreviewResult,
} from "../server/video/local-seedance-preview.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("GG-036 keeps the page smoke API disabled by default and in production", () => {
  assert.throws(
    () => resolveLocalSeedancePreviewConfig({ NODE_ENV: "development" }),
    (error) => error instanceof LocalSeedancePreviewError
      && error.code === "LOCAL_VIDEO_PREVIEW_UNAVAILABLE",
  );
  assert.throws(
    () => resolveLocalSeedancePreviewConfig({
      NODE_ENV: "production",
      GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
      GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: path.resolve("preview-key.txt"),
    }),
    (error) => error instanceof LocalSeedancePreviewError
      && error.code === "LOCAL_VIDEO_PREVIEW_UNAVAILABLE",
  );
});

test("GG-036 reads the provider credential from an explicit file only", async () => {
  const keyFile = path.resolve("preview-key.txt");
  const calls = [];
  const sentinel = Object.freeze({ kind: "client" });
  const client = await loadLocalSeedancePreviewClient({
    environment: {
      NODE_ENV: "development",
      GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
      GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: keyFile,
    },
    readFileImpl: async (...args) => {
      calls.push(["read", ...args]);
      return " file-only-secret \n";
    },
    clientFactory: (options) => {
      calls.push(["client", options]);
      return sentinel;
    },
  });

  assert.equal(client, sentinel);
  assert.deepEqual(calls[0], ["read", keyFile, "utf8"]);
  assert.deepEqual(calls[1], ["client", {
    apiKey: "file-only-secret",
    baseUrl: "https://cf-api.o1key.com",
  }]);
});

test("GG-036 injects the file-read key only into the local Worker binding", async () => {
  const viteConfig = await read("vite.config.ts");
  assert.match(viteConfig, /readFileSync\(keyFile, "utf8"\)\.trim\(\)/);
  assert.match(viteConfig, /GOODGOOD_LOCAL_SEEDANCE_INJECTED_API_KEY: apiKey/);
  assert.doesNotMatch(viteConfig, /process\.env\.GOODGOOD_LOCAL_SEEDANCE_INJECTED_API_KEY/);
});

test("GG-036 only accepts loopback preview requests and rejects cross-origin writes", () => {
  assert.doesNotThrow(() => assertLocalPreviewRequest(new Request("http://127.0.0.1:32138/api/video/preview")));
  assert.throws(
    () => assertLocalPreviewRequest(new Request("https://goodgood.example/api/video/preview")),
    /未启用/,
  );
  assert.throws(
    () => assertLocalPreviewRequest(new Request("http://127.0.0.1:32138/api/video/preview", {
      headers: { origin: "https://malicious.example" },
      method: "POST",
    }), { mutating: true }),
    (error) => error.code === "LOCAL_VIDEO_PREVIEW_ORIGIN_REJECTED",
  );
});

test("GG-036 returns only the page fields needed to poll and play a result", () => {
  assert.deepEqual(toLocalVideoPreviewResult({
    task_id: "task-page-test",
    status: "completed",
    progress: 100,
    metadata: { outputs: ["https://cdn.example/result.mp4"] },
  }), {
    taskId: "task-page-test",
    status: "completed",
    progress: 100,
    resultUrl: "https://cdn.example/result.mp4",
    error: null,
    terminal: true,
  });
});

test("GG-036 connects the current video parameters to one POST and same-task polling", async () => {
  const [route, boundary, page, composer] = await Promise.all([
    read("app/api/video/preview/route.ts"),
    read("features/creation/http-video-preview-boundary.ts"),
    read("app/page.tsx"),
    read("features/creation/video-creation-composer.tsx"),
  ]);

  assert.match(route, /client\.createVideo\(await request\.json\(\)\)/);
  assert.match(route, /client\.getVideo\(\{ taskId \}\)/);
  assert.match(boundary, /method: "POST"/);
  assert.match(boundary, /while \(!job\.terminal\)/);
  assert.match(boundary, /encodeURIComponent\(job\.taskId\)/);
  assert.match(page, /line: videoProviderLine/);
  assert.match(page, /modelId: videoModelId/);
  assert.match(page, /generationMode: videoGenerationMode/);
  assert.match(page, /ratio: videoAspectRatio/);
  assert.match(page, /resolution: videoResolution/);
  assert.match(page, /duration: videoDurationSeconds/);
  assert.match(page, /generateAudio: videoGenerateAudio/);
  assert.match(page, /videoReferences\.length > 0/);
  assert.match(composer, /接口可用/);
  assert.match(composer, /disabled=\{!interfaceAvailable \|\| isGenerating\}/);
  assert.doesNotMatch(boundary, /\/api\/generations/);
});
