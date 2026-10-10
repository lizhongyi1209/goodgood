"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, House, Image as ImageIcon, Images, Library, MessageSquare, Network, SquarePlay, UserCog, UserRound, Workflow } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnouncementCenter } from "@/features/announcements/announcement-center";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { AccountRow, CategoryTabs, CreditPill, EmptyState, MediaTile, NavItem, TemplateCard, type ComposerMode } from "@/features/design-system";
import { HomeAccountMenu, type HomeAccountActions } from "./home-account-menu";
import { HomeComposer, type HomeComposerProps } from "./home-composer";
import { homeDemoEnabled } from "./home-feature-flag.mjs";
import { useHomeLayout } from "./home-layout";
import styles from "./home-page.module.css";

const demoEnabled = homeDemoEnabled(import.meta.env.DEV, import.meta.env.VITE_GG_HOME_DEMO);
type DemoData = typeof import("./home-demo-data");
export type HomePageProps = { session: AuthenticationSession | null | undefined; name: string; avatarUrl?: string | null; balance: string; billingLoading: boolean; billingError: boolean; onProjects: () => void; onAssets: () => void; onCreation: (mode: "image" | "video") => void; accountActions: HomeAccountActions; composer: Omit<HomeComposerProps, "mode" | "showChat"> & { mode: "image" | "video" } };
export function HomePage(props: HomePageProps) {
  const layout = useHomeLayout(), compact = layout === "rail";
  const [demo, setDemo] = useState<DemoData | null>(null), [category, setCategory] = useState("全部"), [visibleCount, setVisibleCount] = useState(8), [area, setArea] = useState<"home" | "batch" | "chat">("home"), [chatPrompt, setChatPrompt] = useState(""), [chatMessages, setChatMessages] = useState<string[]>([]), [selectedMedia, setSelectedMedia] = useState<DemoData["HOME_DISCOVERY"][number] | null>(null);
  const sentinel = useRef<HTMLDivElement>(null), promptRegion = useRef<HTMLDivElement>(null);
  const previewFocus = useRef<HTMLElement | null>(null);
  useEffect(() => { if (demoEnabled) void import("./home-demo-data").then(setDemo); }, []);
  const items = demo?.HOME_DISCOVERY.filter(item => category === "全部" || category === item.category) ?? [];
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !demo || visibleCount >= items.length) return;
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) setVisibleCount(count => count + 8); });
    observer.observe(node); return () => observer.disconnect();
  }, [demo, items.length, visibleCount]);
  const credits = <CreditPill balance={props.balance} loading={props.billingLoading} unavailable={props.billingError} />;
  const home = () => { setArea("home"); };
  const showTemplate = (prompt: string) => { home(); props.composer.onModeChange("image"); props.composer.onPromptChange(prompt); promptRegion.current?.scrollIntoView({ behavior: "auto", block: "center" }); promptRegion.current?.querySelector("textarea")?.focus(); };
  const mode: ComposerMode = area === "chat" ? "chat" : props.composer.mode;
  const changeMode = (next: ComposerMode) => { if (next === "chat") setArea("chat"); else { home(); props.composer.onModeChange(next); } };
  const management = <>{props.session?.account.role === "site_owner" && <NavItem label="站长管理" icon={<UserCog />} compact={compact} onClick={props.accountActions.onManagement} />}{props.accountActions.enterpriseVisible && props.session?.account.role !== "site_owner" && <NavItem label="企业管理" icon={<Building2 />} compact={compact} onClick={props.accountActions.onManagement} />}{props.session?.account.businessRole === "distributor" && <NavItem label="分销管理" icon={<Network />} compact={compact} onClick={props.accountActions.onDistribution} />}</>;
  return <div className={styles.homeShell} data-home-layout={layout} data-home-demo={demoEnabled ? "on" : "off"}>
    {layout !== "mobile" && <aside className={styles.sidebar} aria-label="工作区侧栏"><button className={styles.brand} type="button" onClick={home} aria-label="GoodGood 首页"><img src={compact ? "/goodgood-g-icon.svg" : "/goodgood-wordmark.svg"} alt="" /></button>
      <nav aria-label="主导航"><div className={styles.navigationGroup}><NavItem label="首页" icon={<House />} compact={compact} current={area === "home"} onClick={home} /><NavItem label="项目" icon={<Workflow />} compact={compact} onClick={props.onProjects} /><NavItem label="资产" icon={<Library />} compact={compact} onClick={props.onAssets} /></div>
        <div className={styles.navigationGroup}>{!compact && <span className={styles.groupLabel}>创作</span>}<NavItem label="图片" icon={<ImageIcon />} compact={compact} onClick={() => props.onCreation("image")} /><NavItem label="视频" icon={<SquarePlay />} compact={compact} onClick={() => props.onCreation("video")} />{demoEnabled && <><NavItem label="批量" icon={<Images />} compact={compact} current={area === "batch"} onClick={() => setArea("batch")} /><NavItem label="对话" icon={<MessageSquare />} compact={compact} current={area === "chat"} onClick={() => setArea("chat")} /></>}</div>
        {(props.session?.account.role === "site_owner" || props.accountActions.enterpriseVisible || props.session?.account.businessRole === "distributor") && <div className={styles.navigationGroup}>{!compact && <span className={styles.groupLabel}>管理</span>}{management}</div>}
      </nav>
      <div className={styles.accountFooter}><HomeAccountMenu session={props.session} actions={props.accountActions} trigger={<AccountRow name={props.name} balanceLabel={`积分 ${props.balance}`} compact={compact} avatar={props.avatarUrl ? <img src={props.avatarUrl} alt="" /> : undefined} credit={credits} />} /></div>
    </aside>}
    <div className={styles.main}><header className={styles.topbar}>{layout === "mobile" && <button type="button" onClick={home} className={styles.mobileBrand} aria-label="GoodGood 首页"><img src="/goodgood-g-icon.svg" alt="" /></button>}<div className={styles.headerActions}>{layout !== "desktop" && <CreditPill balance={props.balance} loading={props.billingLoading} unavailable={props.billingError} onClick={props.accountActions.onAccount} />}<AnnouncementCenter session={props.session} iconOnly={layout === "mobile"} className={styles.announcements} /></div></header>
      <div className={styles.content}>
        <section className={styles.start}><h1>{area === "batch" ? "批量创作" : area === "chat" ? "开始对话" : "今天想创作什么？"}</h1>
          {area === "batch" ? <EmptyState icon={<Images />} title="批量创作预览" description="界面示例，准备好素材后继续创作。" actions={<button className={styles.ghostButton} type="button" onClick={home}>返回首页</button>} /> : <div ref={promptRegion} className={styles.composerRegion}><HomeComposer {...props.composer} mode={mode} showChat={demoEnabled} onModeChange={changeMode} prompt={area === "chat" ? chatPrompt : props.composer.prompt} onPromptChange={area === "chat" ? setChatPrompt : props.composer.onPromptChange} onSubmit={area === "chat" ? () => { setChatMessages(messages => [...messages, chatPrompt]); setChatPrompt(""); } : props.composer.onSubmit} references={area === "chat" ? [] : props.composer.references} disabled={area === "chat" ? false : props.composer.disabled} busy={area === "chat" ? false : props.composer.busy} notice={area === "chat" ? "对话界面示例" : props.composer.notice} /></div>}
          {area === "chat" && chatMessages.length > 0 && <div className={styles.chatMessages} aria-label="本地对话示例">{chatMessages.map((message, index) => <p key={index}>{message}</p>)}</div>}
        </section>
        {demoEnabled && demo && area === "home" && <>
          <section className={styles.templates} aria-label="常用模板"><h2>常用模板</h2><div className={styles.templateGrid}>{demo.HOME_TEMPLATES.map(item => <TemplateCard key={item.id} item={item} onUse={() => showTemplate(item.prompt)} />)}</div></section>
          <section className={styles.discovery} aria-label="灵感"><CategoryTabs title="灵感" categories={demo.HOME_CATEGORIES} value={category} onChange={value => { setCategory(value); setVisibleCount(8); }} onViewAll={() => { setCategory("全部"); setVisibleCount(items.length); }} />
            {items.length ? <div className={styles.discoveryGrid}>{items.slice(0, visibleCount).map(item => <MediaTile key={item.id} item={item} onOpen={() => { previewFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSelectedMedia(item); }} onAction={() => showTemplate(item.prompt)} actionLabel="做同款" />)}</div> : <EmptyState icon={<Library />} title="还没有作品" description="选择其他分类继续浏览。" />}
            <div ref={sentinel} aria-hidden="true" />
          </section>
        </>}
      </div>
    </div>
    {layout === "mobile" && <nav className={styles.tabbar} aria-label="底部导航"><NavItem label="首页" icon={<House />} current={area === "home"} onClick={home} /><NavItem label="项目" icon={<Workflow />} onClick={props.onProjects} /><NavItem label="资产" icon={<Library />} onClick={props.onAssets} /><HomeAccountMenu session={props.session} actions={props.accountActions} mobile trigger={<button type="button" className={styles.myTab} aria-label="我的"><UserRound aria-hidden="true" /><span>我的</span></button>} /></nav>}
    <Dialog open={!!selectedMedia} onOpenChange={open => { if (!open) setSelectedMedia(null); }}><DialogContent className={styles.previewDialog} onCloseAutoFocus={event => { event.preventDefault(); previewFocus.current?.focus(); }}><DialogHeader><DialogTitle>{selectedMedia?.title}</DialogTitle><DialogDescription>灵感界面示例</DialogDescription></DialogHeader>{selectedMedia && <><img src={selectedMedia.src} alt={selectedMedia.title} /><button type="button" className={styles.primaryButton} onClick={() => { showTemplate(selectedMedia.prompt); previewFocus.current = promptRegion.current?.querySelector("textarea") ?? null; setSelectedMedia(null); }}>做同款</button></>}</DialogContent></Dialog>
  </div>;
}
