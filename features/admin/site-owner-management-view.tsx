"use client";

import { Building2, ChartNoAxesCombined, Coins, MessageSquare, ListFilter, LoaderCircle, ScrollText, SlidersHorizontal, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { navigateWorkspace, workspaceRouteHref, type WorkspaceRoute } from "@/features/navigation/workspace-route.mjs";
import { AccountManagementPage } from "./account-management-page";
import { ModelManagementPage } from "./model-management-page";
import { AuditLogView } from "./audit-log-view";
import { SiteOperationsDashboard, SiteOperationsLog } from "./site-operations-view";
import { FeedbackManagementView } from '@/features/feedback/feedback-view';
import { JcoinManagementView } from '@/features/jcoin/jcoin-management-view';

const tabs = [
  { id: "operations", label: "运营看板", icon: ChartNoAxesCombined, route: { kind: "admin", tab: "operations" } },
  { id: "feedback", label: "问题反馈", icon: MessageSquare, route: { kind: "admin", tab: "feedback" } },
  { id: "jcoin", label: "平台币", icon: Coins, route: { kind: "admin", tab: "jcoin" } },
  { id: "organizations", label: "企业管理", icon: Building2, route: { kind: "organizations" } },
  { id: "models", label: "模型管理", icon: SlidersHorizontal, route: { kind: "admin", tab: "models" } },
  { id: "users", label: "账户管理", icon: UsersRound, route: { kind: "admin", tab: "users" } },
  { id: "audit", label: "审计日志", icon: ScrollText, route: { kind: "admin", tab: "audit" } },
  { id: "logs", label: "总日志", icon: ListFilter, route: { kind: "admin", tab: "logs" } },
] as const satisfies readonly { id: string; label: string; icon: typeof Building2; route: WorkspaceRoute }[];

export function SiteOwnerManagementView({ session, activeTab, children, onLogin, onManagementChange }: {
  session: AuthenticationSession | null | undefined;
  activeTab: "organizations" | "models" | "users" | "audit" | "operations" | "logs" | "jcoin" | "feedback";
  children?: ReactNode;
  onLogin: () => void;
  onManagementChange?: () => void;
}) {
  if (session === undefined) return <section className="organization-state" role="status"><LoaderCircle className="animate-spin" size={18} />正在确认站长权限</section>;
  if (!session) return <section className="organization-state"><p>请登录站长账户后查看管理内容。</p><Button variant="ghost" onClick={onLogin}>登录 GoodGood</Button></section>;
  if (session.preview || session.access.status !== "active" || session.account.role !== "site_owner") {
    return <section className="organization-state" role="alert"><p>没有站长管理权限</p><span>只有已启用的站长账户可以管理平台。</span></section>;
  }

  return <section className="site-owner-management admin-management-page" aria-label="站长管理工作区">
    <header className="site-owner-management-header">
      <nav aria-label="站长管理功能" className="site-owner-management-tabs">
        {tabs.map(({ id, label, icon: Icon, route }) => <Button key={id} variant="ghost" asChild className={activeTab === id ? "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-zinc-500"}>
          <a href={workspaceRouteHref(route)} aria-current={activeTab === id ? "page" : undefined} onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateWorkspace(route);
          }}><Icon aria-hidden="true" />{label}</a>
        </Button>)}
      </nav>
    </header>
    {activeTab === "operations" ? <SiteOperationsDashboard />
      : activeTab === "feedback" ? <FeedbackManagementView />
      : activeTab === "jcoin" ? <JcoinManagementView />
      : activeTab === "logs" ? <SiteOperationsLog />
      : activeTab === "models" ? <ModelManagementPage workspaceSession={session} embedded onManagementChange={onManagementChange} />
      : activeTab === "users" ? <AccountManagementPage workspaceSession={session} embedded onManagementChange={onManagementChange} />
      : activeTab === "audit" ? <AuditLogView session={session} /> : children}
  </section>;
}
