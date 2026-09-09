import { createHash } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { BillingPersistenceError } from "../billing/repository.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { newRequestId } from "../observability/http.mjs";
import { DistributionError } from "./errors.mjs";
import {
  createCreditTransfer,
  listCreditTransfers,
  listDirectChildren,
  readDistributionSummary,
} from "./repository.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSFER_ID_PATTERN = /^trf_[0-9a-f]{32}$/;
const MAX_CREDIT_AMOUNT = 9_223_372_036_854_775_807n;

const DEFAULT_REPOSITORY = Object.freeze({
  createCreditTransfer,
  listCreditTransfers,
  listDirectChildren,
  readDistributionSummary,
});

function requireOwner(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function requestError(message) {
  return new DistributionError("CREDIT_TRANSFER_REQUEST_INVALID", message, 400);
}

function requireOwnerId(value) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw requestError("账户标识无效。");
  }
  return value;
}

function requireIdempotencyKey(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw requestError("操作标识无效，请刷新后重试。");
  }
  return value;
}

function requireAmount(value) {
  const text =
    typeof value === "number" && Number.isSafeInteger(value)
      ? String(value)
      : typeof value === "string"
        ? value
        : "";
  if (!/^[1-9]\d*$/.test(text)) throw requestError("积分数量必须是正整数。");
  const amount = BigInt(text);
  if (amount > MAX_CREDIT_AMOUNT) throw requestError("积分数量超出支持范围。");
  return amount;
}

function optionalRemark(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw requestError("备注内容无效。");
  const remark = value.trim();
  if (!remark || remark.length > 200 || /[\u0000-\u001f\u007f]/.test(remark)) {
    throw requestError("备注必须在 1 到 200 个字符之间。");
  }
  return remark;
}

function operationHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function encodeCursor(cursor) {
  return cursor
    ? Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
    : null;
}

function decodeCursor(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length < 4 || value.length > 500) {
    throw requestError("分页标识无效，请刷新后重试。");
  }
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      !cursor ||
      !TRANSFER_ID_PATTERN.test(cursor.publicId) ||
      typeof cursor.createdAt !== "string" ||
      Number.isNaN(Date.parse(cursor.createdAt))
    ) {
      throw new Error("invalid cursor");
    }
    return {
      createdAt: new Date(cursor.createdAt).toISOString(),
      publicId: cursor.publicId,
    };
  } catch {
    throw requestError("分页标识无效，请刷新后重试。");
  }
}

function resourcesFor(resources) {
  return resources ?? getGenerationResources();
}

export async function readDistribution({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = requireOwner(ownerContext);
  const resolved = await resourcesFor(resources);
  return repository.readDistributionSummary(resolved.pool, { ownerId });
}

export async function readDistributionChildren({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = requireOwner(ownerContext);
  const resolved = await resourcesFor(resources);
  return {
    items: await repository.listDirectChildren(resolved.pool, { ownerId }),
  };
}

export async function readDistributionTransfers({
  input = {},
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = requireOwner(ownerContext);
  const limit = input.limit === undefined ? 20 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw requestError("每页记录数必须在 1 到 50 之间。");
  }
  const resolved = await resourcesFor(resources);
  const page = await repository.listCreditTransfers(resolved.pool, {
    cursor: decodeCursor(input.cursor),
    limit,
    ownerId,
  });
  return { items: page.items, nextCursor: encodeCursor(page.next) };
}

export async function createDistributionTransfer({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const ownerId = requireOwner(ownerContext);
  const childOwnerId = requireOwnerId(input?.childOwnerId);
  const amount = requireAmount(input?.amount);
  const remark = optionalRemark(input?.remark);
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = operationHash({
    action: "direct_child_credit_transfer",
    amount: amount.toString(),
    childOwnerId,
    ownerId,
    remark,
  });
  const resolved = await resourcesFor(resources);
  return repository.createCreditTransfer(resolved.pool, {
    amount,
    childOwnerId,
    idempotencyKey: key,
    operationHash: fingerprint,
    ownerId,
    remark,
  });
}

export function distributionApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError || error instanceof DistributionError) {
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
  if (error instanceof BillingPersistenceError) {
    const conflict = error.code === "CREDIT_ACCOUNT_CONFLICT";
    return {
      body: {
        error: {
          code: conflict ? "CREDIT_TRANSFER_CONFLICT" : error.code,
          message: conflict
            ? "积分余额已变化，请刷新后确认。"
            : "积分划拨未完成，请稍后重试。",
          requestId,
          retryable: false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "distribution.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "DISTRIBUTION_UNAVAILABLE",
        message: "分销账户暂时不可用，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
