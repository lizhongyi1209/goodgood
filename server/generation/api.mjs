import { randomUUID } from "node:crypto";
import { dispatchPendingJobs } from "./queue.mjs";
import {
  GenerationPersistenceError,
  createGenerationJob,
  findGenerationJob,
  generationInputFromRow,
  publicGenerationJob,
} from "./repository.mjs";
import {
  connectGenerationQueue,
  getGenerationResources,
} from "./resources.mjs";
import { signAssetRead } from "./storage.mjs";
import { M3_TEST_USER_ID } from "./config.mjs";

const M3_INPUT_CONTRACT = Object.freeze({
  aspectRatio: "4:5",
  count: 1,
  modelId: "nano-banana-2",
  resolution: "2K",
});

export class GenerationRequestError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = "GenerationRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function validateM3GenerationInput(payload) {
  if (!payload || typeof payload !== "object") {
    throw new GenerationRequestError("INVALID_REQUEST", "生成请求格式不正确。");
  }
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt || prompt.length > 4_000) {
    throw new GenerationRequestError(
      "INVALID_PROMPT",
      "请输入 1 至 4000 个字符的画面描述。",
    );
  }
  const references = Array.isArray(payload.references) ? payload.references : [];
  if (references.length) {
    throw new GenerationRequestError(
      "REFERENCES_NOT_AVAILABLE",
      "持久参考图上传将在下一阶段启用；当前生成请先移除参考图。",
    );
  }
  for (const [field, expected] of Object.entries(M3_INPUT_CONTRACT)) {
    if (payload[field] !== expected) {
      throw new GenerationRequestError(
        "M3_SLICE_UNSUPPORTED",
        "当前持久生成链路仅支持 Nano Banana 2、4:5、高清、1 张图片。",
      );
    }
  }

  return {
    ...M3_INPUT_CONTRACT,
    prompt,
    references: [],
  };
}

export function validateIdempotencyKey(value) {
  if (!value || value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new GenerationRequestError(
      "INVALID_IDEMPOTENCY_KEY",
      "生成请求缺少有效的幂等键。",
    );
  }
  return value;
}

async function withPreviewUrl(resources, row) {
  const previewUrl = row.object_key
    ? await signAssetRead({
        bucket: resources.config.objectStorage.bucket,
        key: row.object_key,
        publicStorage: resources.publicStorage,
      })
    : null;
  return publicGenerationJob(row, previewUrl);
}

export async function submitGeneration({ idempotencyKey, input }) {
  const resources = await getGenerationResources();
  const result = await createGenerationJob(resources.pool, {
    idempotencyKey: validateIdempotencyKey(idempotencyKey),
    input: validateM3GenerationInput(input),
    ownerId: M3_TEST_USER_ID,
  });
  try {
    await connectGenerationQueue(resources);
    await dispatchPendingJobs(resources.pool, resources.redis);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "generation.enqueue_deferred",
        jobId: result.row.id,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  return {
    created: result.created,
    job: await withPreviewUrl(resources, result.row),
  };
}

export async function readGeneration(jobId) {
  const resources = await getGenerationResources();
  const row = await findGenerationJob(resources.pool, {
    jobId,
    ownerId: M3_TEST_USER_ID,
  });
  if (!row) {
    throw new GenerationRequestError("GENERATION_NOT_FOUND", "未找到该生成任务。", 404);
  }
  return withPreviewUrl(resources, row);
}

export async function retryGeneration({ idempotencyKey, jobId }) {
  const resources = await getGenerationResources();
  const source = await findGenerationJob(resources.pool, {
    jobId,
    ownerId: M3_TEST_USER_ID,
  });
  if (!source) {
    throw new GenerationRequestError("GENERATION_NOT_FOUND", "未找到该生成任务。", 404);
  }
  const result = await createGenerationJob(resources.pool, {
    idempotencyKey: validateIdempotencyKey(idempotencyKey),
    input: generationInputFromRow(source),
    ownerId: M3_TEST_USER_ID,
    retryOfJobId: jobId,
  });
  try {
    await connectGenerationQueue(resources);
    await dispatchPendingJobs(resources.pool, resources.redis);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "generation.retry_enqueue_deferred",
        jobId: result.row.id,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  return {
    created: result.created,
    job: await withPreviewUrl(resources, result.row),
  };
}

export function generationApiError(error, jobId = "") {
  const requestId = `req_${randomUUID()}`;
  if (
    error instanceof GenerationRequestError ||
    error instanceof GenerationPersistenceError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          jobId: jobId || undefined,
          message: error.message,
          requestId,
          retryable: error.retryable ?? false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "generation.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "INTERNAL_ERROR",
        jobId: jobId || undefined,
        message: "生成服务暂时不可用，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
