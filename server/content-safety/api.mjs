import { createHash } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { newRequestId } from "../observability/http.mjs";
import { ContentSafetyError, contentSafetyAccessDeniedError } from "./errors.mjs";
import {
  CONTENT_POLICY,
  CONTENT_POLICY_DOCUMENT_HASH,
  CONTENT_POLICY_VERSION,
  CONTENT_REPORT_CATEGORIES,
} from "./policy.mjs";
import {
  acceptCurrentContentPolicy,
  createOwnedAssetReport,
  hasAcceptedCurrentContentPolicy,
  openContentReportForReview,
  resolveOpenContentReport,
} from "./repository.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORY_CODES = new Set(CONTENT_REPORT_CATEGORIES.map(({ code }) => code));

const DEFAULT_REPOSITORY = Object.freeze({
  acceptCurrentContentPolicy,
  createOwnedAssetReport,
  hasAcceptedCurrentContentPolicy,
  openContentReportForReview,
  resolveOpenContentReport,
});

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function siteOwnerIdFromContext(ownerContext) {
  const ownerId = ownerIdFromContext(ownerContext);
  if (ownerContext.systemRole !== "site_owner") {
    throw contentSafetyAccessDeniedError();
  }
  return ownerId;
}

function requireText(value, field, minimum, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new ContentSafetyError(
      "CONTENT_SAFETY_REQUEST_INVALID",
      `${field} 必须包含 ${minimum} 到 ${maximum} 个字符。`,
      400,
    );
  }
  return text;
}

function requireUuid(value, field) {
  const id = requireText(value, field, 36, 36);
  if (!UUID_PATTERN.test(id)) {
    throw new ContentSafetyError(
      "CONTENT_SAFETY_REQUEST_INVALID",
      `${field} 无效。`,
      400,
    );
  }
  return id;
}

function requireIdempotencyKey(value) {
  return requireText(value, "Idempotency-Key", 8, 200);
}

function operationHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resourcesFor(resources) {
  return resources ?? getGenerationResources();
}

export async function readContentPolicy({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const resolved = await resourcesFor(resources);
  const acceptedAt = await repository.hasAcceptedCurrentContentPolicy(
    resolved.pool,
    { ownerId },
  );
  return {
    accepted: Boolean(acceptedAt),
    acceptedAt: acceptedAt ? new Date(acceptedAt).toISOString() : null,
    policy: CONTENT_POLICY,
    reportCategories: CONTENT_REPORT_CATEGORIES,
  };
}

export async function acceptContentPolicy({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const key = requireIdempotencyKey(idempotencyKey);
  if (
    input?.version !== CONTENT_POLICY_VERSION ||
    input?.documentHash !== CONTENT_POLICY_DOCUMENT_HASH
  ) {
    throw new ContentSafetyError(
      "CONTENT_POLICY_VERSION_CONFLICT",
      "使用规则已经更新，请刷新后重新阅读。",
      409,
    );
  }
  const resolved = await resourcesFor(resources);
  return repository.acceptCurrentContentPolicy(resolved.pool, {
    idempotencyKey: key,
    ownerId,
  });
}

export async function createContentReport({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = ownerIdFromContext(ownerContext);
  const assetId = requireUuid(input?.assetId, "图片标识");
  const category = input?.category;
  if (!CATEGORY_CODES.has(category)) {
    throw new ContentSafetyError(
      "CONTENT_REPORT_CATEGORY_INVALID",
      "请选择有效的举报类型。",
      400,
    );
  }
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = operationHash({
    action: "create_content_report",
    assetId,
    category,
    ownerId,
  });
  const resolved = await resourcesFor(resources);
  return repository.createOwnedAssetReport(resolved.pool, {
    assetId,
    category,
    idempotencyKey: key,
    operationHash: fingerprint,
    ownerId,
  });
}

export async function readContentReportPreview({
  idempotencyKey,
  ownerContext,
  reportId,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const actorOwnerId = siteOwnerIdFromContext(ownerContext);
  const id = requireUuid(reportId, "举报标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = operationHash({
    action: "open_content_report_preview",
    actorOwnerId,
    reportId: id,
  });
  const resolved = await resourcesFor(resources);
  const report = await repository.openContentReportForReview(resolved.pool, {
    actorOwnerId,
    idempotencyKey: key,
    operationHash: fingerprint,
    reportId: id,
  });
  return {
    aspectRatio: report.aspectRatio,
    assetId: report.assetId,
    category: report.category,
    mimeType: report.mimeType,
    modelId: report.modelId,
    previewUrl: await signAssetRead({
      bucket: resolved.config.objectStorage.bucket,
      key: report.objectKey,
      publicStorage: resolved.publicStorage,
    }),
    prompt: report.prompt,
    reportId: report.reportId,
    requestedCount: report.requestedCount,
  };
}

export async function resolveContentReport({
  idempotencyKey,
  input,
  ownerContext,
  reportId,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const actorOwnerId = siteOwnerIdFromContext(ownerContext);
  const id = requireUuid(reportId, "举报标识");
  const action = input?.action;
  if (!new Set(["restore", "remove"]).has(action)) {
    throw new ContentSafetyError(
      "CONTENT_MODERATION_ACTION_INVALID",
      "内容处理动作无效。",
      400,
    );
  }
  const reason = requireText(input?.reason, "处理原因", 2, 200);
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = operationHash({
    action: `resolve_content_report:${action}`,
    actorOwnerId,
    reason,
    reportId: id,
  });
  const resolved = await resourcesFor(resources);
  return repository.resolveOpenContentReport(resolved.pool, {
    action,
    actorOwnerId,
    deleteObject: async (objectKey) => {
      await resolved.storage.send(
        new DeleteObjectCommand({
          Bucket: resolved.config.objectStorage.bucket,
          Key: objectKey,
        }),
      );
    },
    idempotencyKey: key,
    operationHash: fingerprint,
    reason,
    reportId: id,
  });
}

export function contentSafetyApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError || error instanceof ContentSafetyError) {
    return {
      body: {
        error: {
          code: error.code,
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
      event: "content_safety.api_failed",
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "CONTENT_SAFETY_UNAVAILABLE",
        message: "内容安全服务暂时不可用，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
