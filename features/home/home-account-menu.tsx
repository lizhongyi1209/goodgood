"use client";

import type { ReactNode } from "react";
import { Building2, CreditCard, LogOut, MessageSquare, Network, UserCog, UserRound } from "lucide-react";
import { AccountInvitation } from "@/features/auth/account-invitation";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { Menu, MenuItem, MenuSeparator } from "@/features/design-system";
import styles from "./home-page.module.css";

export type HomeAccountActions = { onAccount: () => void; onFeedback: () => void; onLogout: () => void; onLogin: () => void; onManagement: () => void; onDistribution: () => void; enterpriseVisible: boolean };
export function HomeAccountMenu({ trigger, session, actions, mobile = false }: { trigger: ReactNode; session: AuthenticationSession | null | undefined; actions: HomeAccountActions; mobile?: boolean }) {
  const active = session?.access.status === "active";
  return <Menu trigger={trigger} label="账户菜单">
    {session ? <>
      <MenuItem disabled={!active} onSelect={actions.onAccount}><UserRound aria-hidden="true" />个人信息</MenuItem>
      <MenuItem disabled={!active} onSelect={actions.onAccount}><CreditCard aria-hidden="true" />积分</MenuItem>
      {mobile && session.account.role === "site_owner" && <MenuItem disabled={!active} onSelect={actions.onManagement}><UserCog aria-hidden="true" />站长管理</MenuItem>}
      {mobile && actions.enterpriseVisible && session.account.role !== "site_owner" && <MenuItem disabled={!active} onSelect={actions.onManagement}><Building2 aria-hidden="true" />企业管理</MenuItem>}
      {mobile && session.account.businessRole === "distributor" && <MenuItem disabled={!active} onSelect={actions.onDistribution}><Network aria-hidden="true" />分销管理</MenuItem>}
      <MenuSeparator /><div className={styles.accountDetails}><span>身份</span><strong>{session.account.role === "site_owner" ? "站长" : session.account.businessRole === "enterprise" ? "企业" : session.account.businessRole === "distributor" ? "分销商" : "个人"}</strong><AccountInvitation code={session.account.invitationCode} /></div>
      <MenuItem onSelect={actions.onFeedback}><MessageSquare aria-hidden="true" />问题反馈</MenuItem><MenuSeparator />
      <MenuItem onSelect={actions.onLogout}><LogOut aria-hidden="true" />退出登录</MenuItem>
    </> : <MenuItem onSelect={actions.onLogin}><UserRound aria-hidden="true" />登录 GoodGood</MenuItem>}
  </Menu>;
}
