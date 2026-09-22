import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  LocalSeedancePreviewError,
  resolveLocalSeedancePreviewConfig,
} from "../server/video/local-seedance-preview.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("GG-102 built local runtime can use real Seedance while production remains closed", () => {
  const keyFile = path.resolve("external-development-key.txt");
  assert.deepEqual(resolveLocalSeedancePreviewConfig({
    NODE_ENV: "production",
    GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME: "true",
    GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
    GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: keyFile,
  }), { baseUrl: "https://cf-api.o1key.com", keyFile });

  assert.throws(() => resolveLocalSeedancePreviewConfig({
    NODE_ENV: "production",
    GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
    GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: keyFile,
  }), (error) => error instanceof LocalSeedancePreviewError
    && error.code === "LOCAL_VIDEO_PREVIEW_UNAVAILABLE");
});

test("GG-102 local launchers attach the real provider key to video without a separate operator switch", async () => {
  const [checkpoint, compose, vite] = await Promise.all([
    read("scripts/local-checkpoint.mjs"),
    read("compose.o1key-local.yaml"),
    read("vite.config.ts"),
  ]);
  assert.match(checkpoint, /GENERATION_API_KEY_FILE: providerFile/);
  assert.match(checkpoint, /GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: providerFile/);
  assert.match(compose, /GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: \/run\/secrets\/goodgood_o1key_api_key/);
  assert.match(vite, /if \(command !== "serve"\) return \{\}/);
  assert.match(vite, /GOODGOOD_LOCAL_O1KEY_KEY_FILE/);
  assert.doesNotMatch(vite, /process\.env\.GOODGOOD_LOCAL_SEEDANCE_PREVIEW/);
});
