import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

export type ManagedAccountStatus = "pending" | "active" | "suspended";
export type BusinessRole = "enterprise" | "distributor";

export type ManagedAccount = Readonly<{
  accountTier: "seed";
  availableCredits: string;
  businessRole: BusinessRole | null;
  createdAt: string;
  directParentEmail: string | null;
  directParentId: string | null;
  email: string;
  id: string;
  lastAuthenticatedAt: string | null;
  reservedCredits: string;
  role: "site_owner" | "member";
  status: ManagedAccountStatus;
  transferableCredits: string;
}>;

export type AdministrativeAction = Readonly<{
  actionType:
    | "bootstrap_site_owner"
    | "approve_account"
    | "suspend_account"
    | "restore_account"
    | "grant_test_credits"
    | "set_business_role"
    | "set_direct_parent";
  actorEmail: string;
  createdAt: string;
  creditAmount: string | null;
  id: string;
  previousBusinessRole: BusinessRole | null;
  previousParentEmail: string | null;
  previousStatus: ManagedAccountStatus | null;
  reason: string;
  resultingStatus: ManagedAccountStatus | null;
  resultingBusinessRole: BusinessRole | null;
  resultingParentEmail: string | null;
  targetEmail: string;
}>;

export type EligibleBusinessParent = Readonly<{
  businessRole: BusinessRole;
  email: string;
  id: string;
}>;

export type AdminDashboard = Readonly<{
  accounts: readonly ManagedAccount[];
  counts: Readonly<Record<ManagedAccountStatus, number>>;
  eligibleParents: readonly EligibleBusinessParent[];
  nextCursor: string | null;
  recentActions: readonly AdministrativeAction[];
}>;

type ErrorEnvelope = Readonly<{
  error?: Readonly<{ code?: string; message?: string; requestId?: string }>;
}>;

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-goodgood-admin-action": "1",
};

async function adminJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ErrorEnvelope;
  if (!response.ok) {
    const failure = payload as ErrorEnvelope;
    const message = failure.error?.message ?? "账户管理暂时不可用，请稍后重试。";
    throw new Error(
      failure.error?.requestId
        ? `${message}（请求编号：${failure.error.requestId}）`
        : message,
    );
  }
  return payload as T;
}

export async function readAdminDashboard(input: {
  cursor?: string | null;
  limit?: number;
  query?: string;
  status?: ManagedAccountStatus | null;
}): Promise<AdminDashboard> {
  return adminJson<AdminDashboard>(
    await goodGoodApiFetch("/api/admin/users/query", {
      body: JSON.stringify(input),
      cache: "no-store",
      headers: ADMIN_HEADERS,
      method: "POST",
    }),
  );
}

export async function updateManagedAccountStatus(input: {
  ownerId: string;
  reason: string;
  status: "active" | "suspended";
}) {
  return adminJson<{ actionType: string; created: boolean; status: ManagedAccountStatus }>(
    await goodGoodApiFetch(
      `/api/admin/users/${encodeURIComponent(input.ownerId)}/status`,
      {
        body: JSON.stringify({ reason: input.reason, status: input.status }),
        headers: {
          ...ADMIN_HEADERS,
          "idempotency-key": crypto.randomUUID(),
        },
        method: "POST",
      },
    ),
  );
}

export async function grantManagedAccountTestCredits(input: {
  amount: number;
  ownerId: string;
  reason: string;
}) {
  return adminJson<{
    availableCredits: string;
    created: boolean;
    grantedCredits: string;
    reservedCredits: string;
  }>(
    await goodGoodApiFetch(
      `/api/admin/users/${encodeURIComponent(input.ownerId)}/test-credit-grants`,
      {
        body: JSON.stringify({ amount: input.amount, reason: input.reason }),
        headers: {
          ...ADMIN_HEADERS,
          "idempotency-key": crypto.randomUUID(),
        },
        method: "POST",
      },
    ),
  );
}

export async function updateManagedAccountBusinessRole(input: {
  ownerId: string;
  reason: string;
  role: BusinessRole | null;
}) {
  return adminJson<{
    actionType: "set_business_role";
    businessRole: BusinessRole | null;
    created: boolean;
  }>(
    await goodGoodApiFetch(
      `/api/admin/users/${encodeURIComponent(input.ownerId)}/business-role`,
      {
        body: JSON.stringify({ reason: input.reason, role: input.role }),
        headers: {
          ...ADMIN_HEADERS,
          "idempotency-key": crypto.randomUUID(),
        },
        method: "POST",
      },
    ),
  );
}

export async function updateManagedAccountDirectParent(input: {
  ownerId: string;
  parentOwnerId: string | null;
  reason: string;
}) {
  return adminJson<{
    actionType: "set_direct_parent";
    created: boolean;
    directParentId: string | null;
  }>(
    await goodGoodApiFetch(
      `/api/admin/users/${encodeURIComponent(input.ownerId)}/direct-parent`,
      {
        body: JSON.stringify({
          parentOwnerId: input.parentOwnerId,
          reason: input.reason,
        }),
        headers: {
          ...ADMIN_HEADERS,
          "idempotency-key": crypto.randomUUID(),
        },
        method: "POST",
      },
    ),
  );
}
