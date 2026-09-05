import { rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const outputDirectory = path.resolve(process.cwd(), "runtime-bundle");
await rm(outputDirectory, { force: true, recursive: true });

await build({
  banner: {
    js: 'import { createRequire as __goodgoodCreateRequire } from "node:module"; const require = __goodgoodCreateRequire(import.meta.url);',
  },
  bundle: true,
  entryPoints: {
    "bootstrap-site-owner": "server/runtime/bootstrap-site-owner.mjs",
    "manual-payment": "server/runtime/manual-payment.mjs",
    "mock-generation": "server/runtime/mock-generation.mjs",
    migrate: "server/runtime/migrate.mjs",
    "reference-cleanup": "server/runtime/reference-cleanup.mjs",
    "r2-inventory": "server/runtime/r2-inventory.mjs",
    web: "server/runtime/web.mjs",
    worker: "server/runtime/worker.mjs",
  },
  external: ["sharp", "vinext/*"],
  format: "esm",
  logLevel: "info",
  outdir: outputDirectory,
  outExtension: { ".js": ".mjs" },
  platform: "node",
  target: "node22",
});
