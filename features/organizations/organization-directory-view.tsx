"use client";

import { Building2, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import { acceptOrganizationInvitation, type OrganizationInvitation, type WorkspaceRecord } from "./http-organization-boundary";
import { manageableOrganizations } from "./organization-navigation.mjs";
import { OrganizationManagementView } from "./organization-management-page";

export function OrganizationDirectoryView({ directory, session }: Readonly<{
  session: AuthenticationSession | null;
  directory: Readonly<{
    workspaces: readonly WorkspaceRecord[];
    invitations: readonly OrganizationInvitation[];
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
  }>;
}>) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const organizations: readonly WorkspaceRecord[] = manageableOrganizations(directory.workspaces);
  const enabled = Boolean(session && !session.preview && session.access.status === "active");
  const accept = async (invitation: OrganizationInvitation) => {
    setAcceptingId(invitation.id);
    setAcceptError(null);
    try {
      await acceptOrganizationInvitation(invitation.id);
      await directory.reload();
    } catch (failure) {
      setAcceptError(failure instanceof Error ? failure.message : "邀请暂时无法接受，请重试。");
    } finally { setAcceptingId(null); }
  };

  if (directory.loading) return <section className="organization-state" role="status"><LoaderCircle className="animate-spin" size={18} />正在读取企业信息</section>;
  if (directory.error) return <section className="organization-state" role="alert"><p>{directory.error}</p><Button variant="ghost" onClick={() => void directory.reload()}><RefreshCw />重试</Button></section>;
  if (!enabled) return <section className="organization-state">请使用已开通的账户查看企业管理。</section>;
  if (organizations.length === 1 && directory.invitations.length === 0 && !acceptError) {
    return <OrganizationManagementView activeTab="overview" workspaceId={organizations[0].id} enabled={enabled} />;
  }

  return <section className="organization-view" aria-label="企业管理">
    <header className="organization-header"><div><h1>企业管理</h1><p>管理企业成员、创作额度和团队资产，不切换你的个人创作。</p></div></header>
    {acceptError && <p className="organization-inline-error" role="alert">{acceptError}</p>}
    {directory.invitations.length > 0 && <section className="organization-invitations" aria-label="待接受的企业邀请">
      <h2>企业邀请</h2>
      {directory.invitations.map((invitation) => <div className="organization-invitation-row" key={invitation.id}>
        <div><strong>{invitation.workspaceName ?? "企业邀请"}</strong><span>{invitation.role === "org_admin" ? "管理员" : "员工"}邀请 · {new Intl.DateTimeFormat("zh-CN").format(new Date(invitation.expiresAt))} 前有效</span></div>
        <Button variant="ghost" size="sm" disabled={acceptingId !== null} onClick={() => void accept(invitation)}>{acceptingId === invitation.id ? <LoaderCircle className="animate-spin" /> : <Check />}接受邀请</Button>
      </div>)}
    </section>}
    {organizations.length ? <div className="organization-directory-grid">{organizations.map((organization) => <button className="organization-directory-card" key={organization.id}
      onClick={() => navigateWorkspace({ kind: "organizations", organizationId: organization.id, tab: "overview" })}>
      <Building2 size={18} /><strong>{organization.name}</strong><span>{organization.role === "org_owner" ? "负责人" : "管理员"} · 查看与管理</span>
    </button>)}</div> : <div className="organization-state">
      <Building2 size={22} /><p>暂无可管理的企业</p><span>企业身份不会自动授予管理权限，请联系站长开通企业或等待负责人邀请。</span>
      {session?.account.role === "site_owner" && <Button variant="ghost" onClick={() => window.location.assign("/admin/users")}>前往账户管理</Button>}
    </div>}
  </section>;
}
