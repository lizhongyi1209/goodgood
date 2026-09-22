import vinext from "vinext";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

function loadLocalSeedancePreviewVars(command: string) {
  if (command !== "serve") return {};
  const profile = process.env.USERPROFILE ?? process.env.HOME;
  const keyFile = process.env.GOODGOOD_LOCAL_O1KEY_KEY_FILE?.trim()
    ?? (profile ? path.join(profile, ".claude", "goodgood-local-secrets", "o1key-api-key.txt") : "");
  const absoluteKeyFile = Boolean(
    keyFile && (path.isAbsolute(keyFile) || path.win32.isAbsolute(keyFile)),
  );
  if (!absoluteKeyFile || !keyFile) {
    return {};
  }
  const relative = path.relative(process.cwd(), path.resolve(keyFile));
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("The real Seedance development key must live outside the repository.");
  }
  let apiKey = "";
  try {
    apiKey = readFileSync(keyFile, "utf8").trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new Error("The real Seedance development key must be one non-empty token.");
  return {
    GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
    GOODGOOD_LOCAL_SEEDANCE_KEY_PATH: keyFile,
    ...(apiKey ? { GOODGOOD_LOCAL_SEEDANCE_INJECTED_API_KEY: apiKey } : {}),
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  const localBindingConfig = {
    main: "./worker/index.ts",
    compatibility_flags: ["nodejs_compat"],
    vars: loadLocalSeedancePreviewVars(command),
    d1_databases: d1
      ? [{
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        }]
      : [],
    r2_buckets: r2
      ? [{ binding: r2, bucket_name: "site-creator-r2" }]
      : [],
  };

  return {
    build: {
      rollupOptions: { external: ["sharp"] },
    },
    ssr: {
      external: [
        "@aws-sdk/client-s3",
        "@aws-sdk/s3-request-presigner",
        "pg",
        "redis",
        "sharp",
      ],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
