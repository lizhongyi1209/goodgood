"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Bell, ChevronUp, Heart, LoaderCircle, Megaphone, Pin, RefreshCw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Item, ItemContent, ItemGroup, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthenticationSession } from "@/features/auth/http-auth-boundary";
import type { Announcement } from "@/shared/contracts/announcements";
import { AnnouncementBody } from "./announcement-body";
import { useAnnouncements } from "./use-announcements";
import styles from "./announcements.module.css";

const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
export function announcementTime(value: string | null) { return value ? date.format(new Date(value)) : "草稿"; }
function AnnouncementPost({ item, root, active, busy, onView, onLike }: { item: Announcement; root: RefObject<HTMLDivElement | null>; active: boolean; busy: boolean; onView: (item: Announcement) => Promise<boolean>; onLike: (item: Announcement) => void }) {
  const element = useRef<HTMLElement | null>(null), viewed = useRef("");
  const view = useRef(onView);
  useEffect(() => { view.current = onView; }, [onView]);
  useEffect(() => {
    const node = element.current, revision = `${item.id}:${item.publicationVersion}`;
    if (!active || !node || viewed.current === revision) return;
    let timer: ReturnType<typeof setTimeout> | undefined, visible = false, disposed = false, recording = false, attempts = 0;
    const cancel = () => { clearTimeout(timer); timer = undefined; };
    const record = () => {
      cancel();
      if (!visible || disposed || recording || viewed.current === revision || document.visibilityState !== "visible" || attempts >= 3) return;
      timer = setTimeout(async () => {
        recording = true; attempts++;
        const success = await view.current(item);
        recording = false;
        if (disposed) return;
        if (success) viewed.current = revision;
        else if (visible && attempts < 3) timer = setTimeout(record, 5000);
      }, 800);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRect.height >= Math.min(140, entry.boundingClientRect.height * .5);
      record();
    }, { root: root.current, threshold: [0, .25, .5, .75, 1] });
    observer.observe(node); document.addEventListener("visibilitychange", record);
    return () => { disposed = true; cancel(); observer.disconnect(); document.removeEventListener("visibilitychange", record); };
  }, [active, item.id, item.publicationVersion, root]);
  return <Item asChild className={styles.post}><article ref={element} role="listitem" aria-label={item.title}>
    <ItemMedia className={styles.avatar}><img src="/goodgood-g-icon.svg" alt="" width={30} height={30} /></ItemMedia>
    <ItemContent className={styles.postContent}>
      <header className={styles.postMeta}><strong>GoodGood</strong><span>官方公告</span><time dateTime={item.publishedAt ?? undefined}>{announcementTime(item.publishedAt)}</time></header>
      {(item.pinned || item.important || item.unread) && <div className={styles.tags}>
        {item.pinned && <span><Pin size={11} />置顶</span>}{item.important && <span>重要</span>}{item.unread && <span className={styles.newTag}>新</span>}
      </div>}
      <h2 className={styles.postTitle}>{item.title}</h2>
      <AnnouncementBody body={item.body} />
      <footer className={styles.postFooter}><Button variant="ghost" size="sm" className={styles.like} aria-label={item.liked ? "取消点赞" : "点赞"} aria-pressed={item.liked} disabled={busy} onClick={() => onLike(item)}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Heart size={16} fill={item.liked ? "currentColor" : "none"} />}<span>{item.liked ? "已点赞" : "点赞"}</span>
      </Button></footer>
    </ItemContent>
  </article></Item>;
}
function ConnectedAnnouncementCenter({ owner, administrator, className, iconOnly = false }: { owner: string; administrator: boolean; className?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false), [paused, setPaused] = useState(false);
  const readingAway = useRef(false), scroll = useRef<HTMLDivElement | null>(null);
  const announcements = useAnnouncements(owner, readingAway);
  const { feed, notice, pending, loading, error, syncing, moreBusy, busyLikes, refresh, more, like, view, showLatest, setNotice } = announcements;
  const [arrival, setArrival] = useState(false);
  useEffect(() => { if (!notice) return; Promise.resolve().then(() => setArrival(true)); const timer = setTimeout(() => setArrival(false), 2800); return () => clearTimeout(timer); }, [notice?.id, notice?.publicationVersion]);
  useEffect(() => { if (!notice || paused) return; const timer = setTimeout(() => setNotice(null), 6000); return () => clearTimeout(timer); }, [notice, paused, setNotice]);
  const latest = () => { readingAway.current = false; scroll.current?.scrollTo({ top: 0, behavior: "auto" }); showLatest(); };
  const changeOpen = (value: boolean) => {
    setOpen(value); readingAway.current = false; setNotice(null); setPaused(false);
    if (value) void refresh();
  };
  return <div className={`${styles.entry} ${className ?? ""}`}>
    <Sheet modal={false} open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild><Button type="button" variant="ghost" size="sm" className={`${styles.trigger} ${iconOnly ? styles.iconOnly : ""}`} data-arrival={arrival || undefined} aria-label={feed.unreadCount ? "打开公告，有未读公告" : "打开公告"}>
        <Bell size={17} />{!iconOnly && <span className={styles.triggerText}>公告</span>}{feed.unreadCount > 0 && <span className={styles.unreadDot} aria-hidden="true" />}
      </Button></SheetTrigger>
      <SheetContent showCloseButton={false} className={styles.panel} onKeyDown={(event) => event.stopPropagation()} onKeyUp={(event) => event.stopPropagation()}>
        <SheetHeader className={styles.panelHeader}>
          <div><SheetTitle>公告</SheetTitle><SheetDescription className="sr-only">GoodGood活动与重要信息，按帖子阅读。</SheetDescription></div>
          <div className={styles.headerActions}>
            {administrator && <Button asChild variant="ghost" size="icon" aria-label="管理公告"><a href="/admin/announcements"><Settings2 size={16} /></a></Button>}
            <Button variant="ghost" size="icon" aria-label="刷新公告" disabled={syncing || moreBusy} onClick={() => void refresh()}><RefreshCw size={16} className={syncing ? "animate-spin" : undefined} /></Button>
            <SheetClose asChild><Button variant="ghost" size="icon" aria-label="关闭公告"><X size={18} /></Button></SheetClose>
          </div>
        </SheetHeader>
        {pending && <div className={styles.latestRow}><Button size="sm" onClick={latest}><ChevronUp size={14} />查看新公告</Button></div>}
        <div ref={scroll} className={styles.feed} onScroll={(event) => { readingAway.current = open && event.currentTarget.scrollTop > 32; }}>
          {loading ? <div className={styles.skeletons} role="status" aria-label="正在读取公告">{[0, 1, 2].map((value) => <div key={value}><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-3 w-32" /><Skeleton className="mt-4 h-4 w-3/4" /><Skeleton className="mt-3 h-20 w-full" /></div></div>)}</div>
            : feed.items.length ? <ItemGroup>{feed.items.map((item) => <AnnouncementPost key={item.id} item={item} root={scroll} active={open} busy={busyLikes.has(item.id)} onView={view} onLike={(value) => void like(value)} />)}</ItemGroup>
              : !error && <div className={styles.empty}><Megaphone size={24} strokeWidth={1.5} /><strong>还没有公告</strong><p>新的活动与重要消息会出现在这里。</p></div>}
          {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="ghost" size="sm" disabled={syncing} onClick={() => void refresh()}>重试读取</Button></div>}
          {feed.nextCursor && !loading && <div className={styles.pagination}><Button variant="ghost" size="sm" disabled={moreBusy || syncing} onClick={() => void more()}>{moreBusy && <LoaderCircle size={14} className="animate-spin" />}{moreBusy ? "正在读取" : "查看更早公告"}</Button></div>}
        </div>
      </SheetContent>
    </Sheet>
    {notice && !open && <div key={`${notice.id}:${notice.publicationVersion}`} className={styles.arrival} role="status" aria-live="polite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
      <Bell size={17} /><div><span>{notice.important ? "重要公告" : "新公告"}</span><strong>{notice.title}</strong><button type="button" onClick={() => { changeOpen(true); latest(); }}>查看公告</button></div>
      <button type="button" className={styles.dismiss} aria-label="关闭公告提醒" onClick={() => setNotice(null)}><X size={14} /></button>
    </div>}
  </div>;
}
export function AnnouncementCenter({ session, className, iconOnly = false }: { session: AuthenticationSession | null | undefined; className?: string; iconOnly?: boolean }) {
  if (!session || session.preview || session.access.status !== "active") return null;
  const owner = session.user.id ?? session.user.email;
  if (!owner) return null;
  return <ConnectedAnnouncementCenter key={owner} owner={owner} administrator={session.account.role === "site_owner"} className={className} iconOnly={iconOnly} />;
}
