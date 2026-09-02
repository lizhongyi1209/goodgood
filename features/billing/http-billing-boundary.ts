import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type {
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
    modelId,
    resolution,
  }: Readonly<{
    count: GenerationCount;
    modelId: GenerationModelId;
    resolution: GenerationResolution;
  }>,
): BillingGenerationQuote | null {
  return (
    summary?.quotes.find(
      (quote) =>
        quote.count === count &&
        quote.modelId === modelId &&
        quote.resolution === resolution,
    ) ?? null
  );
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
