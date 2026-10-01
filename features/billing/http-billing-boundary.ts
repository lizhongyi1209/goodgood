import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { isSeedreamModel, seedreamQuoteCreditAmount } from "@/shared/contracts/seedream-pricing.mjs";
import type {
  CreditActivityFilter,
  CreditActivityItem,
  CreditActivityPage,
  BillingGenerationQuote,
  BillingProducts,
  BillingSummary,
  PaymentOrderSummary,
} from "@/shared/contracts/billing";
import type {
  GenerationCount,
  GenerationModelId,
  GenerationResolution,
} from "@/shared/contracts/generation";

// Optional fields keep the current verified Web readable while the explicit
// activity-source contract is rolled out. A batch reference is never a task ID.
export type CreditUsageActivityItem = CreditActivityItem & Readonly<{
  taskId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  modelName?: string | null;
}>;
export type CreditUsageDailyFreeQuota = Readonly<{
  day: string;
  timeZone: string;
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
  resetAt: string;
  eligible: readonly unknown[];
}>;
export type CreditUsageActivityPage = Omit<CreditActivityPage, "items" | "dailyFreeQuota"> & Readonly<{
  items: readonly CreditUsageActivityItem[];
  dailyFreeQuota?: CreditUsageDailyFreeQuota | null;
}>;

type BillingApiErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: string;
    message?: string;
    retryable?: boolean;
  }>;
}>;

export class BillingBoundaryError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "BillingBoundaryError";
    this.code = code;
    this.retryable = retryable;
  }
}

export async function readBillingSummary(): Promise<BillingSummary> {
  const response = await goodGoodApiFetch("/api/billing", {
    cache: "no-store",
  });
  const payload = (await response.json()) as
    | BillingSummary
    | BillingApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as BillingApiErrorEnvelope;
    throw new BillingBoundaryError(
      failure.error?.code ?? "BILLING_UNAVAILABLE",
      failure.error?.message ?? "积分信息暂时无法读取，请稍后重试。",
      failure.error?.retryable ?? false,
    );
  }
  return payload as BillingSummary;
}

export async function readCreditActivities({
  cursor = null,
  filter = "all",
  limit = 20,
  signal,
}: Readonly<{
  cursor?: string | null;
  filter?: CreditActivityFilter;
  limit?: number;
  signal?: AbortSignal;
}> = {}): Promise<CreditUsageActivityPage> {
  const search = new URLSearchParams({ filter, limit: String(limit), view: "usage" });
  if (cursor) search.set("cursor", cursor);
  return billingPayload<CreditUsageActivityPage>(
    await goodGoodApiFetch(`/api/billing/activities?${search.toString()}`, {
      cache: "no-store",
      signal,
    }),
  );
}

async function billingPayload<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | BillingApiErrorEnvelope;
  if (!response.ok) {
    const failure = payload as BillingApiErrorEnvelope;
    throw new BillingBoundaryError(
      failure.error?.code ?? "BILLING_UNAVAILABLE",
      failure.error?.message ?? "积分服务暂时不可用，请稍后重试。",
      failure.error?.retryable ?? false,
    );
  }
  return payload as T;
}

export async function readBillingProducts(): Promise<BillingProducts> {
  return billingPayload<BillingProducts>(
    await goodGoodApiFetch("/api/billing/products", { cache: "no-store" }),
  );
}

export async function createPaymentOrder(
  productId: string,
  idempotencyKey: string,
): Promise<PaymentOrderSummary> {
  return billingPayload<PaymentOrderSummary>(
    await goodGoodApiFetch("/api/billing/orders", {
      body: JSON.stringify({ productId }),
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      method: "POST",
    }),
  );
}

export async function readPaymentOrder(
  orderId: string,
): Promise<PaymentOrderSummary> {
  return billingPayload<PaymentOrderSummary>(
    await goodGoodApiFetch(
      `/api/billing/orders/${encodeURIComponent(orderId)}`,
      { cache: "no-store" },
    ),
  );
}

export function findBillingQuote(
  summary: BillingSummary | null,
  {
    count,
    catalogModelId,
    imageLine = "special",
    modelId,
    resolution,
    quality = "auto",
    referenceCount = 0,
  }: Readonly<{
    count: GenerationCount;
    catalogModelId?: string;
    imageLine?: import("@/shared/contracts/generation").BananaLine;
    modelId: GenerationModelId;
    resolution: GenerationResolution;
    quality?: import("@/shared/contracts/generation").GptImageQuality;
    referenceCount?: number;
  }>,
): BillingGenerationQuote | null {
  const quote = (
    summary?.quotes.find(
      (quote) =>
        quote.count === count &&
        (quote.quality === undefined || quote.quality === quality) &&
        (quote.catalogModelId ?? quote.modelId) === (catalogModelId ?? modelId) &&
        quote.modelId === modelId &&
        (quote.imageLine ?? "special") === imageLine &&
        quote.resolution === resolution,
    ) ?? null
  );
  if (!quote || !isSeedreamModel(modelId)) return quote;
  const creditAmount = seedreamQuoteCreditAmount(quote.creditAmount, quote.creditUnit, referenceCount);
  return creditAmount === null ? null : { ...quote, creditAmount, creditUnit: "credit-cny-cent" };
}

export function availableImageCount(
  summary: BillingSummary | null,
  quote: BillingGenerationQuote | null,
) {
  if (!summary || !quote) return null;
  try {
    const available = BigInt(summary.account.availableCredits);
    const price = BigInt(quote.creditAmount);
    if (available < BigInt(0) || price <= BigInt(0)) return null;
    return available / price;
  } catch {
    return null;
  }
}
