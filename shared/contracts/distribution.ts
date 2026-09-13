import type { BillingAccountSummary, SerializedCreditAmount } from "./billing";

export type BusinessRole = "enterprise" | "distributor";

export interface DistributionSummary {
  account: BillingAccountSummary;
  businessRole: "distributor";
  directChildCount: number;
}

export interface DistributionChild {
  allocatedCredits: SerializedCreditAmount;
  email: string;
  id: string;
  lastTransferredAt: string | null;
  status: "active";
}

export interface DistributionChildren {
  items: readonly DistributionChild[];
}

export interface CreditTransferSummary {
  amount: SerializedCreditAmount;
  counterpartyEmail: string | null;
  counterpartyId: string;
  createdAt: string;
  direction: "outgoing" | "incoming";
  id: `trf_${string}`;
  remark: string | null;
  unit: "credit-cny-cent";
}

export interface CreditTransferPage {
  items: readonly CreditTransferSummary[];
  nextCursor: string | null;
}

export interface CreditTransferResult {
  account: BillingAccountSummary;
  created: boolean;
  transfer: CreditTransferSummary;
}
