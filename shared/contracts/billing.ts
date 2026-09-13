export const creditLedgerEntryTypes = [
  "grant",
  "reserve",
  "settle",
  "release",
  "refund",
  "expire",
  "adjust",
  "transfer_out",
  "transfer_in",
] as const;

export type CreditLedgerEntryType = (typeof creditLedgerEntryTypes)[number];
export type CreditActor = "system" | "worker" | "operator" | "payment" | "owner";

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
  paymentFundedAvailableBalance: bigint;
  paymentFundedReservedBalance: bigint;
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
  paymentFundedAmount: bigint;
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
  transferableCredits: SerializedCreditAmount;
  version: SerializedCreditAmount;
}

export interface BillingGenerationQuote {
  imageLine?: import("./generation").BananaLine;
  catalogModelId?: string;
  modelId:
    | "nano-banana-2"
    | "nano-banana-pro"
    | "gpt-image-2.5-sunburst"
    | "gpt-image-2"
    | "gpt-image-2.5-flare";
  resolution: "1K" | "2K" | "4K";
  count: 1 | 2 | 4;
  planContext: string;
  priceVersion: number;
  creditUnit: string;
  creditAmount: SerializedCreditAmount;
}

export interface BillingSummary {
  models?: readonly import("./model-management").ManagedModel[];
  account: BillingAccountSummary;
  quotes: readonly BillingGenerationQuote[];
}

export const creditActivityFilters = [
  "all",
  "spend",
  "receive",
  "return",
] as const;

export type CreditActivityFilter = (typeof creditActivityFilters)[number];

export type CreditActivityKind =
  | "generation"
  | "welcome"
  | "promotion"
  | "purchase"
  | "refund"
  | "adjustment"
  | "expiration"
  | "transfer_out"
  | "transfer_in"
  | "credit";

export type CreditActivityStatus =
  | "processing"
  | "spent"
  | "released"
  | "credited"
  | "refunded"
  | "adjusted"
  | "expired";

export type CreditActivityCategory =
  | "image_generation"
  | "video_generation"
  | "other";

export interface CreditActivitySpendSummary {
  today: SerializedCreditAmount;
  thisWeek: SerializedCreditAmount;
  thisMonth: SerializedCreditAmount;
}

export interface CreditActivityItem {
  id: string;
  kind: CreditActivityKind;
  status: CreditActivityStatus;
  category: CreditActivityCategory;
  batchReference: string | null;
  amount: SerializedCreditAmount;
  creditAmount: SerializedCreditAmount;
  unit: string;
  occurredAt: string;
  completedAt: string | null;
}

export interface CreditActivityPage {
  account: BillingAccountSummary;
  spendSummary: CreditActivitySpendSummary;
  items: readonly CreditActivityItem[];
  nextCursor: string | null;
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
