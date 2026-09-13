"use client";

import { ArrowLeft, History, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import { EnterpriseManagementNavigation } from "@/features/organizations/enterprise-management-navigation";
import type { BillingAccountSummary } from "@/shared/contracts/billing";
import type { DistributionChild } from "@/shared/contracts/distribution";
import { DistributionView } from "./distribution-view";
import type { DistributionPreviewData } from "./business-style-fixtures";

export function BusinessManagementView({ context, tab, enabled, organizationId, onAccountChange, onBack, previewData, onNavigateTab }: Readonly<{
  context: "enterprise" | "distributor";
  tab: "children" | "transfers";
  enabled: boolean;
  organizationId?: string;
  onAccountChange: (account: BillingAccountSummary) => void;
  onBack: () => void;
  previewData?: DistributionPreviewData;
  onNavigateTab?: (tab: "children" | "transfers") => void;
}>) {
  const [historyAccount, setHistoryAccount] = useState<Pick<DistributionChild, "id" | "email"> | null>(null);
  const navigateTab = (next: "children" | "transfers") => onNavigateTab ? onNavigateTab(next) : navigateWorkspace(context === "enterprise"
    ? { kind: "enterpriseAccounts", tab: next === "children" ? "accounts" : "transfers" }
    : next === "children" ? { kind: "distribution" } : { kind: "distribution", tab: "transfers" });
  return <section className="organization-view" aria-label={context === "enterprise" ? "企业管理" : "分销管理"}>
    <header className="organization-header">
      <div><h1>{context === "enterprise" ? "企业管理" : "分销管理"}</h1>
        <p>{context === "enterprise" ? "直属账户划拨来自当前个人账户，不使用企业积分池或员工创作额度。" : "管理直属客户与下级账户，分配积分并核对划拨记录。"}</p></div>
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />返回创作</Button>
    </header>
    {context === "enterprise" ? <EnterpriseManagementNavigation organizationId={organizationId}
      activeTab={tab === "children" ? "accounts" : "transfers"} allocationEnabled={enabled} onTransfers={() => setHistoryAccount(null)}
      onAccountTabChange={onNavigateTab ? (next) => navigateTab(next === "accounts" ? "children" : "transfers") : undefined} />
      : <nav className="organization-tabs" aria-label="分销管理内容">
        <button className={tab === "children" ? "active" : ""} aria-current={tab === "children" ? "page" : undefined}
          onClick={() => navigateTab("children")}><Users size={16} />客户与下级</button>
        <button className={tab === "transfers" ? "active" : ""} aria-current={tab === "transfers" ? "page" : undefined}
          onClick={() => { setHistoryAccount(null); navigateTab("transfers"); }}><History size={16} />划拨记录</button>
      </nav>}
    <DistributionView enabled={enabled} tab={tab} context={context} historyAccount={historyAccount} onAccountChange={onAccountChange} previewData={previewData}
      onShowRecords={(child) => { setHistoryAccount({ id: child.id, email: child.email }); navigateTab("transfers"); }}
      onClearRecords={() => setHistoryAccount(null)} />
  </section>;
}
