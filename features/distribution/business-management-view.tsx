"use client";

import { ArrowLeft, History, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import type { BillingAccountSummary } from "@/shared/contracts/billing";
import type { DistributionChild } from "@/shared/contracts/distribution";
import { DistributionView } from "./distribution-view";
import type { DistributionPreviewData } from "./business-style-fixtures";

export function BusinessManagementView({ tab, enabled, onAccountChange, onBack, previewData, onNavigateTab }: Readonly<{
  tab: "children" | "transfers";
  enabled: boolean;
  onAccountChange: (account: BillingAccountSummary) => void;
  onBack: () => void;
  previewData?: DistributionPreviewData;
  onNavigateTab?: (tab: "children" | "transfers") => void;
}>) {
  const [historyAccount, setHistoryAccount] = useState<Pick<DistributionChild, "id" | "email"> | null>(null);
  const navigateTab = (next: "children" | "transfers") => onNavigateTab ? onNavigateTab(next) : navigateWorkspace(
    next === "children" ? { kind: "distribution" } : { kind: "distribution", tab: "transfers" });
  return <section className="organization-view" aria-label="分销管理">
    <header className="organization-header">
      <div><h1>分销管理</h1><p>管理直属客户与下级账户，分配积分并核对划拨记录。</p></div>
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />返回创作</Button>
    </header>
    <nav className="organization-tabs" aria-label="分销管理内容">
        <button className={tab === "children" ? "active" : ""} aria-current={tab === "children" ? "page" : undefined}
          onClick={() => navigateTab("children")}><Users size={16} />客户与下级</button>
        <button className={tab === "transfers" ? "active" : ""} aria-current={tab === "transfers" ? "page" : undefined}
          onClick={() => { setHistoryAccount(null); navigateTab("transfers"); }}><History size={16} />划拨记录</button>
    </nav>
    <DistributionView enabled={enabled} tab={tab} historyAccount={historyAccount} onAccountChange={onAccountChange} previewData={previewData}
      onShowRecords={(child) => { setHistoryAccount({ id: child.id, email: child.email }); navigateTab("transfers"); }}
      onClearRecords={() => setHistoryAccount(null)} />
  </section>;
}
