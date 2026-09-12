import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  SeedanceProviderError,
  createO1KeySeedanceClient,
} from "./o1key-seedance-adapter.mjs";

const PREVIEW_BASE_URL = "https://cf-api.o1key.com";
const TERMINAL_VIDEO_STATUSES = new Set(["completed", "failed"]);

export class LocalSeedancePreviewError extends Error {
  constructor({ code, message, status = 500 }) {
    super(message);
    this.name = "LocalSeedancePreviewError";
    this.code = code;
    this.status = status;
  }
}

function unavailable(message = "本地 Seedance 实测接口未启用。") {
  throw new LocalSeedancePreviewError({
    code: "LOCAL_VIDEO_PREVIEW_UNAVAILABLE",
    message,
    status: 503,
  });
}

export function isLoopbackPreviewRequest(request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function assertLocalPreviewRequest(request, { mutating = false } = {}) {
  if (!isLoopbackPreviewRequest(request)) unavailable();
  if (!mutating) return;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new LocalSeedancePreviewError({
      code: "LOCAL_VIDEO_PREVIEW_ORIGIN_REJECTED",
      message: "本地 Seedance 实测请求来源无效。",
      status: 403,
    });
  }
}

export function resolveLocalSeedancePreviewConfig(environment = process.env) {
  if (environment.NODE_ENV === "production") {
    unavailable("生产环境禁止启用本地 Seedance 实测接口。");
  }
  if (environment.GOODGOOD_LOCAL_SEEDANCE_PREVIEW !== "true") unavailable();
  const keyFile = (
    environment.GOODGOOD_LOCAL_SEEDANCE_KEY_PATH
    ?? environment.GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE
  )?.trim();
  if (!keyFile || !(path.isAbsolute(keyFile) || path.win32.isAbsolute(keyFile))) {
    unavailable("本地 Seedance 实测密钥文件未配置。");
  }
  return Object.freeze({ baseUrl: PREVIEW_BASE_URL, keyFile });
}

export async function loadLocalSeedancePreviewClient({
  clientFactory = createO1KeySeedanceClient,
  environment = process.env,
  readFileImpl = readFile,
} = {}) {
  const config = resolveLocalSeedancePreviewConfig(environment);
  let apiKey = environment.GOODGOOD_LOCAL_SEEDANCE_INJECTED_API_KEY?.trim();
  if (!apiKey) {
    try {
      apiKey = (await readFileImpl(config.keyFile, "utf8")).trim();
    } catch {
      unavailable("本地 Seedance 实测密钥文件不可读。");
    }
  }
  if (!apiKey || apiKey.length > 8_192) {
    unavailable("本地 Seedance 实测密钥文件无效。");
  }
  return clientFactory({
    apiKey,
    baseUrl: config.baseUrl,
  });
}

export function toLocalVideoPreviewResult(providerResult) {
  const taskId = providerResult?.taskId ?? providerResult?.task_id ?? providerResult?.id;
  const status = providerResult?.status;
  if (typeof taskId !== "string" || typeof status !== "string") {
    throw new LocalSeedancePreviewError({
      code: "LOCAL_VIDEO_PREVIEW_INVALID_RESPONSE",
      message: "Seedance 返回了无法识别的任务状态。",
      status: 502,
    });
  }
  const resultUrl = providerResult?.result_url
    ?? providerResult?.metadata?.url
    ?? providerResult?.metadata?.outputs?.[0]
    ?? null;
  return Object.freeze({
    taskId,
    status,
    progress: Number.isFinite(providerResult.progress) ? providerResult.progress : null,
    resultUrl: typeof resultUrl === "string" && resultUrl ? resultUrl : null,
    error: status === "failed"
      ? String(providerResult?.error?.message ?? providerResult?.error ?? "视频生成失败。")
      : null,
    terminal: TERMINAL_VIDEO_STATUSES.has(status),
  });
}

export function localSeedancePreviewErrorResponse(error) {
  const known = error instanceof LocalSeedancePreviewError || error instanceof SeedanceProviderError;
  return Object.freeze({
    status: known ? error.status : 500,
    body: Object.freeze({
      error: Object.freeze({
        code: known ? error.code : "LOCAL_VIDEO_PREVIEW_ERROR",
        message: known ? error.message.trim() : "本地 Seedance 实测接口暂时不可用。",
      }),
    }),
  });
}
