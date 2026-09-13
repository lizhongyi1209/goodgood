import type { OrganizationAssetBatch, OrganizationDashboard, OrganizationMember } from "./http-organization-boundary";

export function overviewMembers(dashboard: OrganizationDashboard): readonly OrganizationMember[] {
  return dashboard.members.filter((member) => member.status === "active").sort((left, right) => {
    const difference = BigInt(right.budget?.settledCredits ?? "0") - BigInt(left.budget?.settledCredits ?? "0");
    return difference === BigInt(0) ? left.email.localeCompare(right.email) : difference > BigInt(0) ? 1 : -1;
  });
}

export type OverviewAttention = Readonly<{
  id: string;
  title: string;
  description: string;
  member?: OrganizationMember;
}>;

export function overviewAttention(dashboard: OrganizationDashboard, now = Date.now()): readonly OverviewAttention[] {
  const items: OverviewAttention[] = [];
  if (!dashboard.account) items.push({
    id: "company-unconfigured", title: "尚未配置企业积分", description: "企业还没有积分账户，请联系站长补充企业积分后使用企业创作。",
  });
  if (dashboard.account?.availableCredits === "0") items.push({
    id: "company-credit", title: "企业暂无可用积分", description: "企业创作暂不可用，请联系站长补充企业积分。",
  });
  for (const member of overviewMembers(dashboard)) {
    if (!member.budget || member.budget.status !== "active" || BigInt(member.budget.remainingCredits) <= BigInt(0)) items.push({
      id: `budget-${member.id}`, title: member.email, member,
      description: !member.budget ? "尚未分配创作额度" : member.budget.status !== "active" ? "创作预算已暂停" : "暂无剩余创作额度（不含在途预留）",
    });
  }
  for (const invitation of dashboard.invitations) {
    const expires = Date.parse(invitation.expiresAt);
    if (invitation.status === "pending" && expires > now && expires <= now + 48 * 60 * 60 * 1000) items.push({
      id: `invite-${invitation.id}`, title: invitation.email, description: "企业邀请将在 48 小时内过期，可前往成员页面查看。",
    });
  }
  return items;
}

export function recentOrganizationOutputs(batches: readonly OrganizationAssetBatch[]) {
  return [...batches].filter((batch) => batch.state === "succeeded")
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .flatMap((batch) => batch.outputs.filter((output) => Boolean(output.previewUrl)).map((output) => ({ batch, output })))
    .slice(0, 6);
}
