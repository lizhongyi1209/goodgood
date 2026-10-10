"use client";

import type { ReactNode } from "react";
import {
  Building2,
  House,
  Image as ImageIcon,
  Images,
  Library,
  MessageSquare,
  Network,
  SquarePlay,
  UserCog,
  UserRound,
  Workflow,
} from "lucide-react";
import { AnnouncementCenter } from "@/features/announcements/announcement-center";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { AccountRow, CreditPill, NavItem } from "@/features/design-system";
import { WorkspaceAccountMenu, type WorkspaceAccountActions } from "./workspace-account-menu";
import { useWorkspaceLayout } from "./workspace-layout";
import styles from "./workspace-shell.module.css";

export type WorkspaceArea = "home" | "image" | "video" | "batch" | "chat";

export type WorkspaceShellProps = Readonly<{
  session: AuthenticationSession | null | undefined;
  name: string;
  avatarUrl?: string | null;
  balance: string;
  billingLoading: boolean;
  billingError: boolean;
  activeArea: WorkspaceArea;
  showDemoNavigation?: boolean;
  accountActions: WorkspaceAccountActions;
  onHome: () => void;
  onProjects: () => void;
  onAssets: () => void;
  onCreation: (mode: "image" | "video") => void;
  onBatch?: () => void;
  onChat?: () => void;
  children: ReactNode;
}>;

export function WorkspaceShell({
  session,
  name,
  avatarUrl,
  balance,
  billingLoading,
  billingError,
  activeArea,
  showDemoNavigation = false,
  accountActions,
  onHome,
  onProjects,
  onAssets,
  onCreation,
  onBatch,
  onChat,
  children,
}: WorkspaceShellProps) {
  const layout = useWorkspaceLayout();
  const compact = layout === "rail";
  const credits = <CreditPill balance={balance} loading={billingLoading} unavailable={billingError} />;
  const management = <>
    {session?.account.role === "site_owner" && <NavItem label="站长管理" icon={<UserCog />} compact={compact} onClick={accountActions.onManagement} />}
    {accountActions.enterpriseVisible && session?.account.role !== "site_owner" && <NavItem label="企业管理" icon={<Building2 />} compact={compact} onClick={accountActions.onManagement} />}
    {session?.account.businessRole === "distributor" && <NavItem label="分销管理" icon={<Network />} compact={compact} onClick={accountActions.onDistribution} />}
  </>;

  return <div className={styles.shell} data-workspace-layout={layout}>
    {layout !== "mobile" && <aside className={styles.sidebar} aria-label="工作区侧栏">
      <button className={styles.brand} type="button" onClick={onHome} aria-label="GoodGood 首页">
        <img src={compact ? "/goodgood-g-icon.svg" : "/goodgood-wordmark.svg"} alt="" />
      </button>
      <nav aria-label="主导航">
        <div className={styles.navigationGroup}>
          <NavItem label="首页" icon={<House />} compact={compact} current={activeArea === "home"} onClick={onHome} />
          <NavItem label="项目" icon={<Workflow />} compact={compact} onClick={onProjects} />
          <NavItem label="资产" icon={<Library />} compact={compact} onClick={onAssets} />
        </div>
        <div className={styles.navigationGroup}>
          {!compact && <span className={styles.groupLabel}>创作</span>}
          <NavItem label="图片" icon={<ImageIcon />} compact={compact} current={activeArea === "image"} onClick={() => onCreation("image")} />
          <NavItem label="视频" icon={<SquarePlay />} compact={compact} current={activeArea === "video"} onClick={() => onCreation("video")} />
          {showDemoNavigation && <>
            <NavItem label="批量" icon={<Images />} compact={compact} current={activeArea === "batch"} onClick={onBatch} />
            <NavItem label="对话" icon={<MessageSquare />} compact={compact} current={activeArea === "chat"} onClick={onChat} />
          </>}
        </div>
        {(session?.account.role === "site_owner" || accountActions.enterpriseVisible || session?.account.businessRole === "distributor") && <div className={styles.navigationGroup}>
          {!compact && <span className={styles.groupLabel}>管理</span>}
          {management}
        </div>}
      </nav>
      <div className={styles.accountFooter}>
        <WorkspaceAccountMenu session={session} actions={accountActions} trigger={<AccountRow name={name} balanceLabel={`积分 ${balance}`} compact={compact} avatar={avatarUrl ? <img src={avatarUrl} alt="" /> : undefined} credit={credits} />} />
      </div>
    </aside>}
    <div className={styles.main}>
      <header className={styles.topbar}>
        {layout === "mobile" && <button type="button" onClick={onHome} className={styles.mobileBrand} aria-label="GoodGood 首页"><img src="/goodgood-g-icon.svg" alt="" /></button>}
        <div className={styles.headerActions}>
          {layout !== "desktop" && <CreditPill balance={balance} loading={billingLoading} unavailable={billingError} onClick={accountActions.onAccount} />}
          <AnnouncementCenter session={session} iconOnly={layout === "mobile"} className={styles.announcements} />
        </div>
      </header>
      {children}
    </div>
    {layout === "mobile" && <nav className={styles.tabbar} aria-label="底部导航">
      <NavItem label="首页" icon={<House />} current={activeArea === "home"} onClick={onHome} />
      <NavItem label="项目" icon={<Workflow />} onClick={onProjects} />
      <NavItem label="资产" icon={<Library />} onClick={onAssets} />
      <WorkspaceAccountMenu session={session} actions={accountActions} mobile trigger={<button type="button" className={styles.myTab} aria-label="我的"><UserRound aria-hidden="true" /><span>我的</span></button>} />
    </nav>}
  </div>;
}
