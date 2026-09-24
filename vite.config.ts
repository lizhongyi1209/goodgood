import vinext from "vinext";
import { defineConfig, type Plugin, type ProxyOptions } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";
import { loadGenerationConfig } from "./server/generation/config.mjs";

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

function loadLocalLiveDevVars(command: string) {
  if (command !== "serve" || process.env.GOODGOOD_LOCAL_LIVE_DEV !== "true") return {};
  const generation = loadGenerationConfig(process.env);
  const database = new URL(generation.databaseUrl);
  const publicOrigin = new URL(process.env.GOODGOOD_AUTH_PUBLIC_ORIGIN ?? "");
  if (database.hostname !== "127.0.0.1" || database.port !== "54449" ||
      database.pathname !== "/goodgood" ||
      generation.objectStorage.endpoint !== "http://127.0.0.1:58049" ||
      publicOrigin.hostname !== "127.0.0.1" ||
      process.env.GOODGOOD_AUTH_MODE !== "email_otp") {
    throw new Error("Live Vite development requires the isolated loopback workspace.");
  }
  const names = [
    "GOODGOOD_AUTH_MODE", "GOODGOOD_ALLOW_LOCAL_AUTH", "GOODGOOD_AUTH_ISSUER",
    "GOODGOOD_AUTH_COOKIE_NAME", "GOODGOOD_AUTH_PUBLIC_ORIGIN",
    "GOODGOOD_EMAIL_OTP_SECRET", "GOODGOOD_EMAIL_FROM",
    "GOODGOOD_EMAIL_SMTP_HOST", "GOODGOOD_EMAIL_SMTP_PORT",
    "GOODGOOD_EMAIL_SMTP_SECURE", "GOODGOOD_EMAIL_SENDING_ENABLED",
    "GOODGOOD_EMAIL_REGISTRATION_ENABLED", "GOODGOOD_FAKE_PAYMENT_ENABLED",
    "GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME", "GOODGOOD_LOCAL_SEEDANCE_PREVIEW",
    "WORKER_HEALTH_HOST", "WORKER_HEALTH_PORT",
  ] as const;
  const auth = Object.fromEntries(names.flatMap((name) =>
    process.env[name] === undefined ? [] : [[name, process.env[name]]],
  ));
  return {
    ...auth,
    DATABASE_URL: generation.databaseUrl,
    REDIS_URL: generation.redisUrl,
    OBJECT_STORAGE_ACCESS_KEY_ID: generation.objectStorage.accessKeyId,
    OBJECT_STORAGE_SECRET_ACCESS_KEY: generation.objectStorage.secretAccessKey,
    OBJECT_STORAGE_BUCKET: generation.objectStorage.bucket,
    OBJECT_STORAGE_ENDPOINT: generation.objectStorage.endpoint,
    OBJECT_STORAGE_PUBLIC_ENDPOINT: generation.objectStorage.publicEndpoint,
    OBJECT_STORAGE_REGION: generation.objectStorage.region,
    OBJECT_STORAGE_FORCE_PATH_STYLE: String(generation.objectStorage.forcePathStyle),
    OBJECT_STORAGE_PROVISIONING_MODE: generation.objectStorage.provisioningMode,
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: generation.objectStorage.uploadAllowedOrigins.join(","),
    GENERATION_PROVIDER_KIND: generation.provider.kind,
    GENERATION_API_BASE_URL: generation.provider.baseUrl,
    GENERATION_API_KEY: generation.provider.apiKey,
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
function localWorkspaceApiProxy(origin: string): ProxyOptions {
  return {
    target: "http://127.0.0.1:32131",
    changeOrigin: true,
    bypass(request, response) {
      if (request.method !== "GET" && request.headers.origin !== origin) {
        response?.writeHead(403, { "cache-control": "no-store" });
        response?.end();
        return request.url ?? "/";
      }
    },
    configure(proxy) {
      proxy.on("proxyReq", (request) => {
        request.setHeader("origin", "http://127.0.0.1:32131");
      });
    },
  };
}

function legacyLiveDepPaths(): Plugin {
  return {
    name: "goodgood-legacy-live-dep-paths",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.startsWith("/node_modules/.vite/deps/")) {
          const url = new URL(request.url, "http://127.0.0.1");
          url.pathname = url.pathname.replace(
            "/node_modules/.vite/deps/",
            "/node_modules/.vite-workspace/deps/",
          );
          // The former optimizer hash is no longer valid after the cache move.
          url.searchParams.delete("v");
          request.url = url.pathname + url.search;
        }
        next();
      });
    },
  };
}

export default defineConfig(async ({ command }) => {
  const liveDev = command === "serve" && process.env.GOODGOOD_LOCAL_LIVE_DEV === "true";
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
    vars: { ...loadLocalSeedancePreviewVars(command), ...loadLocalLiveDevVars(command) },
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
    // Builds used by check:local re-optimize the default cache. Keep the live
    // workspace cache separate so an open browser never sees stale dep URLs.
    cacheDir: liveDev ? "node_modules/.vite-workspace" : undefined,
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
      host: liveDev ? "127.0.0.1" : "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(liveDev
        ? {
            proxy: {
              "/api": localWorkspaceApiProxy(process.env.GOODGOOD_AUTH_PUBLIC_ORIGIN!),
            },
          }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      ...(liveDev ? [legacyLiveDepPaths()] : []),
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
