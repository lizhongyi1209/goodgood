import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

export type ManagedAccountStatus = "pending" | "active" | "suspended";

export type ManagedAccount = Readonly<{
  accountTier: "seed";
  availableCredits: string;
  createdAt: string;
  email: string;
  id: string;
  lastAuthenticatedAt: string | null;
  reservedCredits: string;
  role: "site_owner" | "member";
  status: ManagedAccountStatus;
}>;

export type AdministrativeAction = Readonly<{
  actionType:
    | "bootstrap_site_owner"
    | "approve_account"
    | "suspend_account"
    | "restore_account"
    | "grant_test_credits";
  actorEmail: string;
  createdAt: string;
  creditAmount: string | null;
  id: string;
  previousStatus: ManagedAccountStatus | null;
  reason: string;
  resultingStatus: ManagedAccountStatus | null;
  targetEmail: string;
}>;

export type AdminDashboard = Readonly<{
  accounts: readonly ManagedAccount[];
  counts: Readonly<Record<ManagedAccountStatus, number>>;
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
