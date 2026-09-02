export const creditLedgerEntryTypes = [
  "grant",
  "reserve",
  "settle",
  "release",
  "refund",
  "expire",
  "adjust",
] as const;

export type CreditLedgerEntryType = (typeof creditLedgerEntryTypes)[number];
export type CreditActor = "system" | "worker" | "operator" | "payment";

export interface GenerationPriceVersion {
  id: string;
  modelId: string;
  resolution: "1K" | "2K" | "4K";
  count: 1 | 2 | 4;
  planContext: string;
  version: number;
  creditUnit: string;
  creditAmount: bigint;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface CreditAccountSnapshot {
  id: string;
  ownerId: string;
  unit: string;
  availableBalance: bigint;
  reservedBalance: bigint;
  version: bigint;
  status: "active" | "frozen" | "closed";
}

export interface CreditLedgerEntry {
  id: string;
  accountId: string;
  ownerId: string;
  entryType: CreditLedgerEntryType;
  amount: bigint;
  idempotencyKey: string;
  reason: string;
  relatedJobId: string | null;
  relatedPaymentRef: string | null;
  priorEntryId: string | null;
  actor: CreditActor;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: Date;
}

export type SerializedCreditAmount = `${bigint}`;

export interface BillingAccountSummary {
  unit: string;
  availableCredits: SerializedCreditAmount;
  reservedCredits: SerializedCreditAmount;
  version: SerializedCreditAmount;
}

export interface BillingGenerationQuote {
  modelId: "nano-banana-2" | "nano-banana-pro" | "gpt-image-2";
  resolution: "1K" | "2K" | "4K";
  count: 1 | 2 | 4;
  planContext: string;
  priceVersion: number;
  creditUnit: string;
  creditAmount: SerializedCreditAmount;
}

export interface BillingSummary {
  account: BillingAccountSummary;
  quotes: readonly BillingGenerationQuote[];
}

export interface BillingPaymentProduct {
  id: string;
  version: number;
  currency: "CNY";
  moneyAmountMinor: SerializedCreditAmount;
  creditUnit: string;
  creditAmount: SerializedCreditAmount;
}

export interface BillingProducts {
  products: readonly BillingPaymentProduct[];
}

export type PaymentOrderStatus = "pending" | "paid";

export interface PaymentOrderSummary {
  id: string;
  productId: string;
  productVersion: number;
  currency: "CNY";
  moneyAmountMinor: SerializedCreditAmount;
  creditUnit: string;
  creditAmount: SerializedCreditAmount;
  status: PaymentOrderStatus;
  createdAt: string;
  paidAt: string | null;
}
