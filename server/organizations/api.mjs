import { createHash, randomUUID } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { findOrganizationAssetGenerationJobs } from "../generation/repository.mjs";
import { presentGenerationJob } from "../generation/presenter.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { newRequestId } from "../observability/http.mjs";
import {
  grantOrganizationCredits,
  readOrganizationCreditSummary,
  setMemberBudget,
} from "./credit-repository.mjs";
import { OrganizationError } from "./errors.mjs";
import {
  listOrganizationMemberBudgets,
  listOrganizationUsage,
  readOrganizationAssetForDownload,
} from "./insights-repository.mjs";
import {
  acceptOrganizationInvitation,
  changeOrganizationMembership,
  createOrganization,
  inviteOrganizationMember,
  listOrganizationManagement,
  listOwnerWorkspaces,
  listPendingOrganizationInvitations,
  revokeOrganizationInvitation,
} from "./repository.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORGANIZATION_ROLES = new Set(["org_owner", "org_admin", "org_member"]);
const INVITABLE_ROLES = new Set(["org_admin", "org_member"]);
const MEMBER_STATUSES = new Set(["active", "suspended", "removed"]);

const DEFAULT_REPOSITORY = Object.freeze({
  acceptOrganizationInvitation,
  changeOrganizationMembership,
  createOrganization,
  findOrganizationAssetGenerationJobs,
  grantOrganizationCredits,
  inviteOrganizationMember,
  listOrganizationManagement,
  listOrganizationMemberBudgets,
  listOrganizationUsage,
  listOwnerWorkspaces,
  listPendingOrganizationInvitations,
  readOrganizationAssetForDownload,
  readOrganizationCreditSummary,
  revokeOrganizationInvitation,
  setMemberBudget,
});

function requireOwner(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

function requireSiteOwner(ownerContext) {
  const ownerId = requireOwner(ownerContext);
  if (ownerContext.systemRole !== "site_owner") {
    throw new OrganizationError(
      "WORKSPACE_ACCESS_DENIED",
      "你没有权限执行这项企业操作。",
      403,
    );
  }
  return ownerId;
}

function requireText(value, fieldName, minimum = 2, maximum = 200) {
  const text = typeof value === "string" ? value.trim() : "";
  if (
    text.length < minimum ||
    text.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      `${fieldName} 必须包含 ${minimum} 到 ${maximum} 个字符。`,
      400,
    );
  }
  return text;
}

function requireUuid(value, fieldName = "标识") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      `${fieldName}无效。`,
      400,
    );
  }
  return value.toLowerCase();
}

function requireIdempotencyKey(value) {
  return requireText(value, "操作标识", 8, 200);
}

function operationHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resourcesFor(resources) {
  return resources ?? getGenerationResources();
}

function presentAccount(account) {
  if (!account) return null;
  return {
    allocatedCredits: account.allocatedBalance.toString(),
    availableCredits: account.availableBalance.toString(),
    reservedCredits: account.reservedBalance.toString(),
    status: account.status,
    unallocatedCredits: account.unallocatedBalance.toString(),
    version: account.version.toString(),
  };
}

function presentBudget(budget) {
  if (!budget) return null;
  return {
    creditLimit: budget.creditLimit.toString(),
    id: budget.id,
    membershipId: budget.membershipId,
    remainingCredits: budget.remainingBalance.toString(),
    reservedCredits: budget.reservedUsage.toString(),
    settledCredits: budget.settledUsage.toString(),
    status: budget.status,
    version: budget.version.toString(),
  };
}

export async function readWorkspaceDirectory({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const resolved = await resourcesFor(resources);
  const [workspaces, invitations] = await Promise.all([
    repository.listOwnerWorkspaces(resolved.pool, actorOwnerId),
    repository.listPendingOrganizationInvitations(resolved.pool, actorOwnerId),
  ]);
  const decorated = await Promise.all(
    workspaces.map(async (workspace) => {
      if (workspace.kind !== "organization" || workspace.membershipStatus !== "active") {
        return { ...workspace, credit: null };
      }
      const summary = await repository.readOrganizationCreditSummary(resolved.pool, {
        actorOwnerId,
        workspaceId: workspace.id,
      });
      return {
        ...workspace,
        credit: {
          account: presentAccount(summary.account),
          budget: presentBudget(summary.budget),
        },
      };
    }),
  );
  return { invitations, workspaces: decorated };
}

export async function readOrganizationDashboard({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const resolved = await resourcesFor(resources);
  const [management, budgets, credit] = await Promise.all([
    repository.listOrganizationManagement(resolved.pool, {
      actorOwnerId,
      workspaceId: id,
    }),
    repository.listOrganizationMemberBudgets(resolved.pool, {
      actorOwnerId,
      workspaceId: id,
    }),
    repository.readOrganizationCreditSummary(resolved.pool, {
      actorOwnerId,
      workspaceId: id,
    }),
  ]);
  const budgetByMembership = new Map(
    budgets.map((item) => [item.membershipId, item]),
  );
  return {
    account: presentAccount(credit.account),
    currentMembershipId: credit.membership.id,
    invitations: management.invitations,
    members: management.members.map((member) => {
      const budget = budgetByMembership.get(member.id);
      return {
        ...member,
        budget: budget?.budgetId
          ? presentBudget({
              creditLimit: budget.creditLimit,
              id: budget.budgetId,
              membershipId: budget.membershipId,
              remainingBalance: budget.remainingBalance,
              reservedUsage: budget.reservedUsage,
              settledUsage: budget.settledUsage,
              status: budget.budgetStatus,
              version: budget.version,
            })
          : null,
      };
    }),
    workspace: management.workspace,
  };
}

export async function createOrganizationWorkspace({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const actorOwnerId = requireSiteOwner(ownerContext);
  const key = requireIdempotencyKey(idempotencyKey);
  const initialOwnerId = requireUuid(input?.initialOwnerId, "负责人账户标识");
  const name = requireText(input?.name, "企业名称", 2, 80);
  const reason = requireText(input?.reason, "操作原因");
  const fingerprint = operationHash({
    action: "create_organization",
    actorOwnerId,
    initialOwnerId,
    name,
    reason,
  });
  const resolved = await resourcesFor(resources);
  return repository.createOrganization(resolved.pool, {
    actorOwnerId,
    idempotencyKey: key,
    initialOwnerId,
    name,
    operationHash: fingerprint,
    reason,
  });
}

export async function createOrganizationInvitation({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const email = requireText(input?.email, "员工邮箱", 3, 320);
  const role = input?.role;
  if (!INVITABLE_ROLES.has(role)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "邀请角色无效。",
      400,
    );
  }
  const reason = requireText(input?.reason, "邀请原因");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const fingerprint = operationHash({
    action: "invite_member",
    actorOwnerId,
    email: email.toLowerCase(),
    reason,
    role,
    workspaceId: id,
  });
  const resolved = await resourcesFor(resources);
  return repository.inviteOrganizationMember(resolved.pool, {
    actorOwnerId,
    email,
    expiresAt,
    idempotencyKey: key,
    intendedRole: role,
    operationHash: fingerprint,
    reason,
    workspaceId: id,
  });
}

export async function acceptInvitation({
  idempotencyKey,
  invitationId,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(invitationId, "邀请标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const resolved = await resourcesFor(resources);
  return repository.acceptOrganizationInvitation(resolved.pool, {
    actorOwnerId,
    idempotencyKey: key,
    invitationId: id,
    operationHash: operationHash({
      action: "accept_invitation",
      actorOwnerId,
      invitationId: id,
    }),
  });
}

export async function revokeInvitation({
  idempotencyKey,
  invitationId,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const inviteId = requireUuid(invitationId, "邀请标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const reason = requireText(input?.reason, "撤销原因");
  const resolved = await resourcesFor(resources);
  return repository.revokeOrganizationInvitation(resolved.pool, {
    actorOwnerId,
    idempotencyKey: key,
    invitationId: inviteId,
    operationHash: operationHash({
      action: "revoke_invitation",
      actorOwnerId,
      invitationId: inviteId,
      reason,
      workspaceId: id,
    }),
    reason,
    workspaceId: id,
  });
}

export async function updateOrganizationMember({
  idempotencyKey,
  input,
  membershipId,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const memberId = requireUuid(membershipId, "成员标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const reason = requireText(input?.reason, "操作原因");
  const expectedVersion = Number(input?.expectedVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "成员版本无效，请刷新后重试。",
      400,
    );
  }
  if (!ORGANIZATION_ROLES.has(input?.role) || !MEMBER_STATUSES.has(input?.status)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "成员角色或状态无效。",
      400,
    );
  }
  const resolved = await resourcesFor(resources);
  return repository.changeOrganizationMembership(resolved.pool, {
    actorOwnerId,
    expectedVersion,
    idempotencyKey: key,
    membershipId: memberId,
    nextRole: input.role,
    nextStatus: input.status,
    operationHash: operationHash({
      action: "change_membership",
      actorOwnerId,
      expectedVersion,
      membershipId: memberId,
      reason,
      role: input.role,
      status: input.status,
      workspaceId: id,
    }),
    reason,
    workspaceId: id,
  });
}

export async function updateOrganizationMemberBudget({
  idempotencyKey,
  input,
  membershipId,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const memberId = requireUuid(membershipId, "成员标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const reason = requireText(input?.reason, "额度调整原因");
  const creditLimit = Number(input?.creditLimit);
  const expectedVersion = Number(input?.expectedVersion);
  if (
    !Number.isSafeInteger(creditLimit) ||
    creditLimit < 0 ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0
  ) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "额度或版本无效。",
      400,
    );
  }
  const resolved = await resourcesFor(resources);
  const result = await repository.setMemberBudget(resolved.pool, {
    actorOwnerId,
    creditLimit,
    expectedVersion,
    idempotencyKey: key,
    membershipId: memberId,
    operationHash: operationHash({
      action: "set_member_budget",
      actorOwnerId,
      creditLimit,
      expectedVersion,
      membershipId: memberId,
      reason,
      workspaceId: id,
    }),
    reason,
    workspaceId: id,
  });
  return {
    account: presentAccount(result.account),
    budget: presentBudget(result.budget),
    created: result.created,
  };
}

export async function createOrganizationCreditGrant({
  idempotencyKey,
  input,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireSiteOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const key = requireIdempotencyKey(idempotencyKey);
  const amount = Number(input?.amount);
  const reason = requireText(input?.reason, "发放原因");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "企业测试积分必须是 1 到 1000000 之间的整数。",
      400,
    );
  }
  const resolved = await resourcesFor(resources);
  const result = await repository.grantOrganizationCredits(resolved.pool, {
    actorOwnerId,
    amount,
    idempotencyKey: key,
    operationHash: operationHash({
      action: "grant_organization_credits",
      actorOwnerId,
      amount,
      reason,
      workspaceId: id,
    }),
    reason,
    workspaceId: id,
  });
  return {
    account: presentAccount(result.account),
    created: result.created,
  };
}

export async function readOrganizationUsage({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const resolved = await resourcesFor(resources);
  const items = await repository.listOrganizationUsage(resolved.pool, {
    actorOwnerId,
    workspaceId: id,
  });
  return {
    usage: items.map((item) => ({
      ...item,
      creditAmount: item.creditAmount.toString(),
    })),
  };
}

export async function readOrganizationAssets({
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const resolved = await resourcesFor(resources);
  const rows = await repository.findOrganizationAssetGenerationJobs(resolved.pool, {
    actorOwnerId,
    workspaceId: id,
  });
  return {
    batches: await Promise.all(
      rows.map(async (row) => ({
        ...(await presentGenerationJob(resolved, row, {
          includeReferenceUrls: false,
        })),
        creator: {
          email: row.creator_email,
          ownerId: row.creator_owner_id,
        },
      })),
    ),
  };
}

export async function readOrganizationAssetDownloadUrl({
  assetId,
  idempotencyKey,
  ownerContext,
  repository = DEFAULT_REPOSITORY,
  resources = null,
  workspaceId,
}) {
  const actorOwnerId = requireOwner(ownerContext);
  const id = requireUuid(workspaceId, "企业标识");
  const targetAssetId = requireUuid(assetId, "资产标识");
  const key = requireIdempotencyKey(idempotencyKey ?? `asset-read-${randomUUID()}`);
  const fingerprint = operationHash({
    action: "download_organization_asset",
    actorOwnerId,
    assetId: targetAssetId,
    workspaceId: id,
  });
  const resolved = await resourcesFor(resources);
  const asset = await repository.readOrganizationAssetForDownload(resolved.pool, {
    actorOwnerId,
    assetId: targetAssetId,
    idempotencyKey: key,
    operationHash: fingerprint,
    workspaceId: id,
  });
  if (!asset) {
    throw new OrganizationError(
      "ORGANIZATION_ASSET_NOT_FOUND",
      "未找到这张企业图片。",
      404,
    );
  }
  return {
    url: await signAssetRead({
      bucket: resolved.config.objectStorage.bucket,
      key: asset.object_key,
      publicStorage: resolved.publicStorage,
    }),
  };
}

export function organizationApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError || error instanceof OrganizationError) {
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
      event: "organization.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "ORGANIZATION_UNAVAILABLE",
        message: "企业工作区暂时不可用，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
