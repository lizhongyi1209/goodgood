import { createHash } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { BillingPersistenceError } from "../billing/repository.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { newRequestId } from "../observability/http.mjs";
import { AdministrationError, adminAccessDeniedError } from "./errors.mjs";
import {
  changeAccountAccess,
  grantTestCredits,
  listManagedAccounts,
  listRecentAdministrativeActions,
  readAccountStatusCounts,
} from "./repository.mjs";

const ACCOUNT_STATUSES = new Set(["pending", "active", "suspended"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_REPOSITORY = Object.freeze({
  changeAccountAccess,
  grantTestCredits,
  listManagedAccounts,
  listRecentAdministrativeActions,
  readAccountStatusCounts,
});

function requireOwner(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  if (ownerContext.systemRole !== "site_owner") throw adminAccessDeniedError();
  return ownerContext.ownerId;
}

function requireText(value, fieldName, minimum, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      `${fieldName} 必须包含 ${minimum} 到 ${maximum} 个字符。`,
      400,
    );
  }
  return text;
}

function requireOwnerId(value) {
  const ownerId = requireText(value, "ownerId", 36, 36);
  if (!UUID_PATTERN.test(ownerId)) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "账户标识无效。",
      400,
    );
  }
  return ownerId;
}

function requireIdempotencyKey(value) {
  return requireText(value, "Idempotency-Key", 8, 200);
}

function operationHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function encodeCursor(cursor) {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value) {
  if (value === null || value === undefined || value === "") return null;
  const encoded = requireText(value, "cursor", 4, 500);
  try {
    const cursor = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      !cursor ||
      !UUID_PATTERN.test(cursor.id) ||
      typeof cursor.createdAt !== "string" ||
      Number.isNaN(Date.parse(cursor.createdAt))
    ) {
      throw new Error("invalid cursor");
    }
    return { createdAt: new Date(cursor.createdAt).toISOString(), id: cursor.id };
  } catch {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "分页标识无效，请刷新后重试。",
      400,
    );
  }
}

function resourcesFor(resources) {
  return resources ?? getGenerationResources();
}

export async function readAdminDashboard({
  input = {},
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  requireOwner(ownerContext);
  const status = input?.status ?? null;
  if (status !== null && !ACCOUNT_STATUSES.has(status)) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "账户状态筛选无效。",
      400,
    );
  }
  const queryValue = typeof input?.query === "string" ? input.query.trim() : "";
  if (queryValue.length > 100 || /[\u0000-\u001f\u007f]/.test(queryValue)) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "搜索内容不能超过 100 个字符。",
      400,
    );
  }
  const limit = input?.limit === undefined ? 50 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "每页账户数必须在 1 到 100 之间。",
      400,
    );
  }
  const resolved = await resourcesFor(resources);
  const [accounts, counts, recentActions] = await Promise.all([
    repository.listManagedAccounts(resolved.pool, {
      cursor: decodeCursor(input?.cursor),
      limit,
      query: queryValue || null,
      status,
    }),
    repository.readAccountStatusCounts(resolved.pool),
    repository.listRecentAdministrativeActions(resolved.pool, { limit: 30 }),
  ]);
  return {
    accounts: accounts.items,
    counts,
    nextCursor: encodeCursor(accounts.next),
    recentActions,
  };
}

export async function updateAdminAccountStatus({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  targetOwnerId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const target = requireOwnerId(targetOwnerId);
  const key = requireIdempotencyKey(idempotencyKey);
  const reason = requireText(input?.reason, "操作原因", 2, 200);
  const toStatus = input?.status;
  if (!new Set(["active", "suspended"]).has(toStatus)) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "目标账户状态无效。",
      400,
    );
  }
  const fingerprint = operationHash({
    action: "change_account_access",
    actorOwnerId,
    reason,
    targetOwnerId: target,
    toStatus,
  });
  const resolved = await resourcesFor(resources);
  return repository.changeAccountAccess(resolved.pool, {
    actorOwnerId,
    idempotencyKey: key,
    operationHash: fingerprint,
    reason,
    targetOwnerId: target,
    toStatus,
  });
}

export async function createAdminTestCreditGrant({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  targetOwnerId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const target = requireOwnerId(targetOwnerId);
  const key = requireIdempotencyKey(idempotencyKey);
  const reason = requireText(input?.reason, "赠送原因", 2, 200);
  const amount = Number(input?.amount);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 5_000) {
    throw new AdministrationError(
      "ADMIN_CREDIT_AMOUNT_INVALID",
      "单次测试积分必须是 1 到 5000 之间的整数。",
      400,
    );
  }
  const fingerprint = operationHash({
    action: "grant_test_credits",
    actorOwnerId,
    amount,
    reason,
    targetOwnerId: target,
  });
  const ledgerKey = `admin-grant:v1:${createHash("sha256")
    .update(`${actorOwnerId}:${key}`)
    .digest("hex")}`;
  const resolved = await resourcesFor(resources);
  return repository.grantTestCredits(resolved.pool, {
    actorOwnerId,
    amount,
    idempotencyKey: key,
    ledgerIdempotencyKey: ledgerKey,
    operationHash: fingerprint,
    reason,
    targetOwnerId: target,
  });
}

export function administrationApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError || error instanceof AdministrationError) {
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
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "administration.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "ADMINISTRATION_UNAVAILABLE",
        message: "账户管理暂时不可用，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
