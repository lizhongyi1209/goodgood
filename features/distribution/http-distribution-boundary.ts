import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type {
  CreditTransferPage,
  CreditTransferResult,
  DistributionChildren,
  DistributionSummary,
} from "@/shared/contracts/distribution";

type ErrorEnvelope = Readonly<{
  error?: Readonly<{ code?: string; message?: string; requestId?: string }>;
}>;

async function distributionJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ErrorEnvelope;
  if (!response.ok) {
    const failure = payload as ErrorEnvelope;
    const message = failure.error?.message ?? "分销账户暂时不可用，请稍后重试。";
    throw new Error(
      failure.error?.requestId
        ? `${message}（请求编号：${failure.error.requestId}）`
        : message,
    );
  }
  return payload as T;
}

export async function readDistributionSummary(): Promise<DistributionSummary> {
  return distributionJson(
    await goodGoodApiFetch("/api/distribution", { cache: "no-store" }),
  );
}

export async function readDistributionChildren(): Promise<DistributionChildren> {
  return distributionJson(
    await goodGoodApiFetch("/api/distribution/children", { cache: "no-store" }),
  );
}

export async function readDistributionTransfers(input: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<CreditTransferPage> {
  const query = new URLSearchParams();
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.limit) query.set("limit", String(input.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return distributionJson(
    await goodGoodApiFetch(`/api/distribution/transfers${suffix}`, {
      cache: "no-store",
    }),
  );
}

export async function createDistributionTransfer(input: {
  amount: string;
  childOwnerId: string;
  remark?: string | null;
}): Promise<CreditTransferResult> {
  return distributionJson(
    await goodGoodApiFetch("/api/distribution/transfers", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
        "x-goodgood-distribution-action": "1",
      },
      method: "POST",
    }),
  );
}
