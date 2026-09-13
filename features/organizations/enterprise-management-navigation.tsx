"use client";

import { Building2, Coins, History, Images, Network, Users } from "lucide-react";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import type { OrganizationManagementTab } from "./organization-management-page";

export function EnterpriseManagementNavigation({ activeTab, organizationId, allocationEnabled = false, onTransfers, onAccountTabChange }: Readonly<{
  activeTab: OrganizationManagementTab | "accounts" | "transfers";
  organizationId?: string;
  allocationEnabled?: boolean;
  onTransfers?: () => void;
  onAccountTabChange?: (tab: "accounts" | "transfers") => void;
}>) {
  const companyTabs = organizationId ? [
    { id: "overview" as const, label: "概览", icon: Building2 },
    { id: "members" as const, label: "成员与额度", icon: Users },
    { id: "usage" as const, label: "消费记录", icon: Coins },
    { id: "assets" as const, label: "团队资产", icon: Images },
  ] : [{ id: "overview" as const, label: "企业概览", icon: Building2 }];
  return <nav className="organization-tabs" aria-label="企业管理内容">
    {companyTabs.map((item) => <button key={item.id} className={activeTab === item.id ? "active" : ""}
      aria-current={activeTab === item.id ? "page" : undefined}
      onClick={() => navigateWorkspace({ kind: "organizations", organizationId, tab: item.id })}>
      <item.icon size={16} />{item.label}
    </button>)}
    {allocationEnabled && <>
      <button className={activeTab === "accounts" ? "active" : ""} aria-current={activeTab === "accounts" ? "page" : undefined}
        onClick={() => onAccountTabChange ? onAccountTabChange("accounts") : navigateWorkspace({ kind: "enterpriseAccounts", tab: "accounts" })}><Network size={16} />直属账户</button>
      <button className={activeTab === "transfers" ? "active" : ""} aria-current={activeTab === "transfers" ? "page" : undefined}
        onClick={() => { onTransfers?.(); if (onAccountTabChange) onAccountTabChange("transfers"); else navigateWorkspace({ kind: "enterpriseAccounts", tab: "transfers" }); }}><History size={16} />划拨记录</button>
    </>}
  </nav>;
}
