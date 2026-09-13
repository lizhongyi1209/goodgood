import type { SerializedCreditAmount } from "@/shared/contracts/billing";
import type { CreditTransferPage, DistributionChild, DistributionSummary } from "@/shared/contracts/distribution";

export type DistributionPreviewData = Readonly<{
  summary: DistributionSummary;
  directAccounts: readonly DistributionChild[];
  transfers: CreditTransferPage;
}>;

function fixture(context: "distributor", emails: readonly string[], amounts: readonly SerializedCreditAmount[], transferable: SerializedCreditAmount, promotional: SerializedCreditAmount): DistributionPreviewData {
  const dates = ["2026-09-13T02:24:00Z", "2026-09-12T08:10:00Z", "2026-09-11T01:06:00Z"];
  const directAccounts: DistributionChild[] = emails.map((email, index) => ({
    id: `demo-${context}-${index + 1}`, email, allocatedCredits: amounts[index], status: "active",
    lastTransferredAt: amounts[index] === "0" ? null : dates[index],
  }));
  const received = String(BigInt(transferable) + amounts.reduce((sum, amount) => sum + BigInt(amount), BigInt(0))) as SerializedCreditAmount;
  return {
    summary: { businessRole: context, directChildCount: directAccounts.length,
      account: { availableCredits: String(BigInt(transferable) + BigInt(promotional)) as SerializedCreditAmount,
        reservedCredits: "0", transferableCredits: transferable, unit: "credit-cny-cent", version: "1" } },
    directAccounts,
    transfers: { nextCursor: null, items: [
      ...directAccounts.filter((child) => child.allocatedCredits !== "0").map((child, index) => ({
        id: `trf_demo-${context}-${index + 1}` as const, direction: "outgoing" as const,
        amount: child.allocatedCredits, counterpartyEmail: child.email, counterpartyId: child.id,
        createdAt: child.lastTransferredAt!, unit: "credit-cny-cent" as const,
        remark: ["9 月创作额度补充", "项目阶段配额", "首次积分分配"][index],
      })),
      { id: `trf_demo-${context}-incoming`, direction: "incoming", amount: received,
        counterpartyEmail: "upstream@demo.example.invalid", counterpartyId: `demo-${context}-parent`,
        createdAt: "2026-09-10T00:30:00Z", remark: "上级积分划入", unit: "credit-cny-cent" },
    ] },
  };
}

export const businessStyleFixtures = {
  distributor: fixture("distributor", ["creative-agency@demo.example.invalid", "regional-partner@demo.example.invalid", "independent-creator@demo.example.invalid", "new-client@demo.example.invalid"], ["4200", "2800", "2000", "0"], "15000", "500"),
} as const;
