import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { GenerationJob } from "@/shared/contracts/generation";

export type OrganizationRole = "org_owner" | "org_admin" | "org_member";
export type MembershipStatus = "active" | "suspended" | "removed";

export type WorkspaceCreditSummary = Readonly<{
  account: Readonly<{
    allocatedCredits: string;
    availableCredits: string;
    reservedCredits: string;
    status: string;
    unallocatedCredits: string;
    version: string;
  }> | null;
  budget: MemberBudget | null;
}>;

export type MemberBudget = Readonly<{
  creditLimit: string;
  id: string;
  membershipId: string;
  remainingCredits: string;
  reservedCredits: string;
  settledCredits: string;
  status: string;
  version: string;
}>;

export type WorkspaceRecord = Readonly<{
  createdAt: string;
  credit: WorkspaceCreditSummary | null;
  id: string;
  kind: "personal" | "organization";
  membershipId: string | null;
  membershipStatus: "active" | "suspended" | null;
  name: string;
  role: OrganizationRole | "personal_owner" | null;
  status: "active" | "suspended";
}>;

export type OrganizationInvitation = Readonly<{
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  role: "org_admin" | "org_member";
  status: "pending" | "accepted" | "revoked" | "expired";
  workspaceId: string;
  workspaceName?: string;
}>;

export type OrganizationMember = Readonly<{
  budget: MemberBudget | null;
  email: string;
  id: string;
  ownerId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  updatedAt: string;
  version: number;
  workspaceId: string;
}>;

export type OrganizationDashboard = Readonly<{
  account: WorkspaceCreditSummary["account"];
  currentMembershipId: string;
  invitations: readonly OrganizationInvitation[];
  members: readonly OrganizationMember[];
  workspace: Omit<WorkspaceRecord, "credit">;
}>;

export type OrganizationUsage = Readonly<{
  count: number;
  createdAt: string;
  creditAmount: string;
  email: string;
  id: string;
  jobId: string;
  jobState: string;
  modelId: string;
  ownerId: string;
  prompt: string;
  resolution: string;
}>;

export type OrganizationAssetBatch = GenerationJob &
  Readonly<{ creator: Readonly<{ email: string; ownerId: string }> }>;

type ErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    requestId?: string;
    retryable?: boolean;
  }>;
}>;

export class OrganizationBoundaryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "OrganizationBoundaryError";
    this.code = code;
    this.retryable = retryable;
  }
}

const ACTION_HEADERS = {
  "content-type": "application/json",
  "x-goodgood-organization-action": "1",
};

async function organizationJson<T>(
  response: Response | Promise<Response>,
): Promise<T> {
  const resolved = await response;
  const payload = (await resolved.json()) as T | ErrorEnvelope;
  if (!resolved.ok) {
    const failure = payload as ErrorEnvelope;
    const message = failure.error?.message ?? "企业工作区暂时不可用，请稍后重试。";
    throw new OrganizationBoundaryError(
      failure.error?.code ?? "ORGANIZATION_UNAVAILABLE",
      failure.error?.requestId
        ? `${message}（请求编号：${failure.error.requestId}）`
        : message,
      failure.error?.retryable ?? false,
    );
  }
  return payload as T;
}

function actionHeaders() {
  return {
    ...ACTION_HEADERS,
    "idempotency-key": `organization_${crypto.randomUUID()}`,
  };
}

export function readWorkspaceDirectory() {
  return organizationJson<{
    invitations: readonly OrganizationInvitation[];
    workspaces: readonly WorkspaceRecord[];
  }>(goodGoodApiFetch("/api/workspaces", { cache: "no-store" }));
}

export function acceptOrganizationInvitation(invitationId: string) {
  return organizationJson<{ created: boolean; membership: OrganizationMember }>(
    goodGoodApiFetch(
      `/api/organization-invitations/${encodeURIComponent(invitationId)}/accept`,
      { headers: actionHeaders(), method: "POST" },
    ),
  );
}

export function readOrganizationDashboard(workspaceId: string) {
  return organizationJson<OrganizationDashboard>(
    goodGoodApiFetch(`/api/organizations/${encodeURIComponent(workspaceId)}`, {
      cache: "no-store",
    }),
  );
}

export function inviteOrganizationMember(input: {
  email: string;
  reason: string;
  role: "org_admin" | "org_member";
  workspaceId: string;
}) {
  return organizationJson<{ created: boolean; invitation: OrganizationInvitation }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(input.workspaceId)}/invitations`,
      {
        body: JSON.stringify({
          email: input.email,
          reason: input.reason,
          role: input.role,
        }),
        headers: actionHeaders(),
        method: "POST",
      },
    ),
  );
}

export function revokeOrganizationInvitation(input: {
  invitationId: string;
  reason: string;
  workspaceId: string;
}) {
  return organizationJson<{ created: boolean; invitation: OrganizationInvitation }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(input.workspaceId)}/invitations/${encodeURIComponent(input.invitationId)}/revoke`,
      {
        body: JSON.stringify({ reason: input.reason }),
        headers: actionHeaders(),
        method: "POST",
      },
    ),
  );
}

export function updateOrganizationMember(input: {
  expectedVersion: number;
  membershipId: string;
  reason: string;
  role: OrganizationRole;
  status: MembershipStatus;
  workspaceId: string;
}) {
  return organizationJson<{ created: boolean; membership: OrganizationMember }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(input.workspaceId)}/members/${encodeURIComponent(input.membershipId)}`,
      {
        body: JSON.stringify({
          expectedVersion: input.expectedVersion,
          reason: input.reason,
          role: input.role,
          status: input.status,
        }),
        headers: actionHeaders(),
        method: "PATCH",
      },
    ),
  );
}

export function updateOrganizationMemberBudget(input: {
  creditLimit: number;
  expectedVersion: number;
  membershipId: string;
  reason: string;
  workspaceId: string;
}) {
  return organizationJson<{
    account: OrganizationDashboard["account"];
    budget: MemberBudget;
    created: boolean;
  }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(input.workspaceId)}/members/${encodeURIComponent(input.membershipId)}/budget`,
      {
        body: JSON.stringify({
          creditLimit: input.creditLimit,
          expectedVersion: input.expectedVersion,
          reason: input.reason,
        }),
        headers: actionHeaders(),
        method: "PUT",
      },
    ),
  );
}

export function readOrganizationUsage(workspaceId: string) {
  return organizationJson<{ usage: readonly OrganizationUsage[] }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(workspaceId)}/usage`,
      { cache: "no-store" },
    ),
  );
}

export function readOrganizationAssets(workspaceId: string) {
  return organizationJson<{ batches: readonly OrganizationAssetBatch[] }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(workspaceId)}/assets`,
      { cache: "no-store" },
    ),
  );
}

export async function readOrganizationAssetDownloadUrl(
  workspaceId: string,
  assetId: string,
) {
  const result = await organizationJson<{ url: string }>(
    await goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(workspaceId)}/assets/${encodeURIComponent(assetId)}/download-url`,
      { cache: "no-store", headers: actionHeaders() },
    ),
  );
  return result.url;
}

export function createOrganizationWorkspace(input: {
  initialOwnerId: string;
  name: string;
  reason: string;
}) {
  return organizationJson<{ created: boolean; workspace: WorkspaceRecord }>(
    goodGoodApiFetch("/api/organizations", {
      body: JSON.stringify(input),
      headers: actionHeaders(),
      method: "POST",
    }),
  );
}

export function grantOrganizationCredits(input: {
  amount: number;
  reason: string;
  workspaceId: string;
}) {
  return organizationJson<{
    account: OrganizationDashboard["account"];
    created: boolean;
  }>(
    goodGoodApiFetch(
      `/api/organizations/${encodeURIComponent(input.workspaceId)}/credit-grants`,
      {
        body: JSON.stringify({ amount: input.amount, reason: input.reason }),
        headers: actionHeaders(),
        method: "POST",
      },
    ),
  );
}
