"use client";

import { useEffect, useRef, useState } from "react";
import { Images, Library } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { CategoryTabs, EmptyState, MediaTile, TemplateCard, type ComposerMode } from "@/features/design-system";
import { WorkspaceShell, type WorkspaceAccountActions } from "@/features/workspace-shell";
import { HomeComposer, type HomeComposerProps } from "./home-composer";
import { homeDemoEnabled } from "./home-feature-flag.mjs";
import styles from "./home-page.module.css";

const demoEnabled = homeDemoEnabled(import.meta.env.DEV, import.meta.env.VITE_GG_HOME_DEMO);
type DemoData = typeof import("./home-demo-data");
export type HomePageProps = { session: AuthenticationSession | null | undefined; name: string; avatarUrl?: string | null; balance: string; billingLoading: boolean; billingError: boolean; onProjects: () => void; onAssets: () => void; onCreation: (mode: "image" | "video") => void; accountActions: WorkspaceAccountActions; composer: Omit<HomeComposerProps, "mode" | "showChat"> & { mode: "image" | "video" } };
export function HomePage(props: HomePageProps) {
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
  const home = () => { setArea("home"); };
  const showTemplate = (prompt: string) => { home(); props.composer.onModeChange("image"); props.composer.onPromptChange(prompt); promptRegion.current?.scrollIntoView({ behavior: "auto", block: "center" }); promptRegion.current?.querySelector("textarea")?.focus(); };
  const mode: ComposerMode = area === "chat" ? "chat" : props.composer.mode;
  const changeMode = (next: ComposerMode) => { if (next === "chat") setArea("chat"); else { home(); props.composer.onModeChange(next); } };
  return <WorkspaceShell
    session={props.session}
    name={props.name}
    avatarUrl={props.avatarUrl}
    balance={props.balance}
    billingLoading={props.billingLoading}
    billingError={props.billingError}
    activeArea={area}
    showDemoNavigation={demoEnabled}
    accountActions={props.accountActions}
    onHome={home}
    onProjects={props.onProjects}
    onAssets={props.onAssets}
    onCreation={props.onCreation}
    onBatch={() => setArea("batch")}
    onChat={() => setArea("chat")}
  >
      <div className={styles.content} data-home-demo={demoEnabled ? "on" : "off"}>
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
    <Dialog open={!!selectedMedia} onOpenChange={open => { if (!open) setSelectedMedia(null); }}><DialogContent className={styles.previewDialog} onCloseAutoFocus={event => { event.preventDefault(); previewFocus.current?.focus(); }}><DialogHeader><DialogTitle>{selectedMedia?.title}</DialogTitle><DialogDescription>灵感界面示例</DialogDescription></DialogHeader>{selectedMedia && <><img src={selectedMedia.src} alt={selectedMedia.title} /><button type="button" className={styles.primaryButton} onClick={() => { showTemplate(selectedMedia.prompt); previewFocus.current = promptRegion.current?.querySelector("textarea") ?? null; setSelectedMedia(null); }}>做同款</button></>}</DialogContent></Dialog>
  </WorkspaceShell>;
}
