import { AdministrationError } from "../admin/errors.mjs";
import { frozenPresetForJob } from '../inspiration/preset.mjs';
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { parsePromptBatch } from "../../shared/contracts/prompt-batch.mjs";
import { BillingPersistenceError } from "../billing/repository.mjs";
import {
  ReferencePersistenceError,
  ReferenceRequestError,
} from "../references/errors.mjs";
import { findReadyReferences } from "../references/repository.mjs";
import { validateReferenceIds } from "../references/validation.mjs";
import { findProject } from "../projects/repository.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";
import { dispatchPendingJobs } from "./queue.mjs";
import {
  isSupportedGenerationInput,
  normalizeGenerationModelOptions,
} from "./capabilities.mjs";
import {
  GenerationPersistenceError,
  createGenerationJob,
  findGenerationJob,
  persistedGenerationInputFromRow,
} from "./repository.mjs";
import { presentGenerationJob } from "./presenter.mjs";
import {
  connectGenerationQueue,
  getGenerationResources,
} from "./resources.mjs";

const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

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
  validateReferenceIds(references);
  const projectId = payload.projectId ?? null;
  if (
    projectId !== null &&
    (typeof projectId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))
  ) {
    throw new GenerationRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  if (payload.catalogModelId !== undefined && (typeof payload.catalogModelId !== "string" || !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(payload.catalogModelId))) throw new GenerationRequestError("INVALID_MODEL", "模型标识无效。");
  if (payload.expectedPriceVersion !== undefined && (!Number.isSafeInteger(payload.expectedPriceVersion) || payload.expectedPriceVersion < 1)) throw new GenerationRequestError("INVALID_QUOTE", "报价版本无效。");
  let composerPrompt;
  if (payload.composerPrompt !== undefined) {
    composerPrompt = typeof payload.composerPrompt === "string" ? payload.composerPrompt.trim() : "";
    if (!projectId || !composerPrompt || composerPrompt.length > 4_000 || !parsePromptBatch(composerPrompt).prompts.includes(prompt)) {
      throw new GenerationRequestError("INVALID_PROMPT", "批量提示词与当前项目输入不一致。");
    }
  }
  if (
    !isSupportedGenerationInput({
      aspectRatio: payload.aspectRatio,
      count: payload.count,
      modelId: payload.modelId,
      resolution: payload.resolution,
    })
  ) {
    throw new GenerationRequestError(
      "M3_SLICE_UNSUPPORTED",
      "当前模型不支持所选比例、分辨率或生成数量。Pro 支持单张输出。",
    );
  }
  const modelOptions = normalizeGenerationModelOptions({
    imageLine: payload.imageLine,
    background: payload.background,
    googleSearch: payload.googleSearch,
    modelId: payload.modelId,
    outputFormat: payload.outputFormat,
    quality: payload.quality,
    thinkingLevel: payload.thinkingLevel,
  });
  if (!modelOptions) {
    throw new GenerationRequestError(
      "M3_SLICE_UNSUPPORTED",
      "当前模型不支持所选生成参数组合。",
    );
  }

  return {
    aspectRatio: payload.aspectRatio,
    count: payload.count,
    modelId: payload.modelId,
    ...(payload.expectedPriceVersion ? { expectedPriceVersion: payload.expectedPriceVersion } : {}),
    ...(payload.catalogModelId ? { catalogModelId: payload.catalogModelId } : {}),
    ...(projectId ? { projectId } : {}),
    prompt,
    ...(composerPrompt ? { composerPrompt } : {}),
    references: references.map((reference) => ({ id: reference.id })),
    resolution: payload.resolution,
    ...modelOptions,
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

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

export async function submitGeneration({
  idempotencyKey,
  input,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
  presetCaseId = null,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  if(presetCaseId!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(presetCaseId)) throw new GenerationRequestError('INSPIRATION_NOT_FOUND','案例标识无效。',404);
  const supplement=presetCaseId?(typeof input?.prompt==='string'?input.prompt.trim():null):null;
  if(presetCaseId&&(supplement===null||supplement.length>4000||input.projectId||input.composerPrompt)) throw new GenerationRequestError('INVALID_PROMPT','补充提示词最多 4000 个字符。');
  const validatedInput = validateM3GenerationInput(presetCaseId?{...input,prompt:supplement||'预设'}:input);
  if (
    validatedInput.projectId &&
    !(await findProject(resources.pool, {
      ownerId,
      projectId: validatedInput.projectId,
      workspaceId,
    }))
  ) {
    throw new GenerationRequestError("PROJECT_NOT_FOUND", "未找到该项目。", 404);
  }
  const readyReferences = await findReadyReferences(resources.pool, {
    ownerId,
    referenceIds: validatedInput.references.map((reference) => reference.id),
    workspaceId,
  });
  if (readyReferences.length !== validatedInput.references.length) {
    throw new GenerationRequestError(
      "REFERENCE_NOT_READY",
      "部分参考图尚未完成上传校验，请等待上传完成或移除失败项。",
      409,
    );
  }
  const result = await createGenerationJob(resources.pool, {
    presetCaseId,presetSupplement:supplement,
    idempotencyKey: validateIdempotencyKey(idempotencyKey),
    input: {
      ...validatedInput,
      references: readyReferences.map((reference) => ({
        id: reference.id,
        name: reference.original_file_name,
        objectKey: reference.object_key,
      })),
    },
    ownerId,
    workspaceId,
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
    job: await presentGenerationJob(resources, result.row),
  };
}

export async function readGeneration({
  jobId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const row = await findGenerationJob(resources.pool, {
    jobId,
    ownerId: ownerIdFromContext(ownerContext),
    workspaceId,
  });
  if (!row) {
    throw new GenerationRequestError("GENERATION_NOT_FOUND", "未找到该生成任务。", 404);
  }
  return presentGenerationJob(resources, row);
}

export async function retryGeneration({
  idempotencyKey,
  jobId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const source = await findGenerationJob(resources.pool, {
    jobId,
    ownerId: ownerIdFromContext(ownerContext),
    workspaceId,
  });
  if (!source) {
    throw new GenerationRequestError("GENERATION_NOT_FOUND", "未找到该生成任务。", 404);
  }
  const frozenPreset=await frozenPresetForJob(resources.pool,jobId);
  const result = await createGenerationJob(resources.pool, {
    frozenPreset,
    idempotencyKey: validateIdempotencyKey(idempotencyKey),
    input: persistedGenerationInputFromRow(source),
    ownerId: ownerIdFromContext(ownerContext),
    retryOfJobId: jobId,
    workspaceId,
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
    job: await presentGenerationJob(resources, result.row),
  };
}

export function generationApiError(error, jobId = "", requestId = newRequestId()) {
  if (
    error instanceof AuthenticationError ||
    error instanceof AdministrationError ||
    error instanceof BillingPersistenceError ||
    error instanceof OrganizationError ||
    error instanceof GenerationRequestError ||
    error instanceof GenerationPersistenceError ||
    error instanceof ReferenceRequestError ||
    error instanceof ReferencePersistenceError
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
