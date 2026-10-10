"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Megaphone, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ANNOUNCEMENTS_CHANGED_EVENT } from "@/shared/contracts/announcements.mjs";
import type { AnnouncementFeed, AnnouncementMutation, ManagedAnnouncement } from "@/shared/contracts/announcements";
import { announcementFailure, announcementFeed, managedAnnouncement, saveAnnouncement, AnnouncementRequestError } from "./http-announcements";
import { AnnouncementBody } from "./announcement-body";
import { announcementTime } from "./announcement-center";
import styles from "./announcements.module.css";

const statuses = { all: "全部", published: "已发布", draft: "草稿", withdrawn: "已撤回" } as const;
const fresh = (): ManagedAnnouncement => ({ id: crypto.randomUUID(), title: "", body: "", important: false, pinned: false, version: 0, publicationVersion: 0, publishedAt: null, updatedAt: new Date().toISOString(), unread: false, liked: false, status: "draft" });
type Confirm = "close" | "withdraw" | "delete";
export function AnnouncementManagementView() {
  const [list, setList] = useState<AnnouncementFeed<ManagedAnnouncement>>({ items: [], unreadCount: 0, nextCursor: null });
  const [filter, setFilter] = useState<keyof typeof statuses>("all"), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [moreBusy, setMoreBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [original, setOriginal] = useState<ManagedAnnouncement | null>(null), [draft, setDraft] = useState<ManagedAnnouncement | null>(null);
  const [busy, setBusy] = useState(false), [editError, setEditError] = useState(""), [conflict, setConflict] = useState(false), [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const retry = useRef<{ signature: string; input: AnnouncementMutation } | null>(null);
  const active = useRef(true), controllers = useRef(new Set<AbortController>()), operationBusy = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; for (const controller of controllers.current) controller.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); controllers.current.add(controller);
    Promise.resolve().then(() => { setLoading(true); setError(""); });
    void announcementFeed(controller.signal, null, true, filter).then((value) => { if (!controller.signal.aborted) setList(value); }).catch((failure) => { if (!controller.signal.aborted) setError(announcementFailure(failure)); }).finally(() => { controllers.current.delete(controller); if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, revision]);
  const choose = (item: ManagedAnnouncement) => { setOriginal(item); setDraft({ ...item }); setEditError(""); setConflict(false); setPreview(false); retry.current = null; };
  const dirty = Boolean(draft && original && ["title", "body", "pinned", "important"].some((key) => draft[key as keyof ManagedAnnouncement] !== original[key as keyof ManagedAnnouncement]));
  const close = () => { if (operationBusy.current) return; if (dirty) setConfirm("close"); else { setDraft(null); setOriginal(null); } };
  const more = async () => {
    if (!list.nextCursor || moreBusy || loading) return;
    const controller = new AbortController(); controllers.current.add(controller); setMoreBusy(true);
    try { const value = await announcementFeed(controller.signal, list.nextCursor, true, filter); if (active.current && !controller.signal.aborted) setList((current) => ({ ...value, items: [...current.items, ...value.items.filter((item) => !current.items.some((row) => row.id === item.id))] })); }
    catch (failure) { if (active.current) setError(announcementFailure(failure)); }
    finally { controllers.current.delete(controller); if (active.current) setMoreBusy(false); }
  };
  const mutate = async (action: AnnouncementMutation["action"]) => {
    if (!draft || operationBusy.current || conflict) return;
    operationBusy.current = true; setBusy(true); setEditError("");
    const fields = { id: draft.id, expectedVersion: draft.version, action,
      ...(["save", "publish"].includes(action) ? { title: draft.title, body: draft.body, important: draft.important, pinned: draft.pinned } : {}) };
    const signature = JSON.stringify(fields);
    if (retry.current?.signature !== signature) retry.current = { signature, input: { ...fields, mutationId: crypto.randomUUID() } };
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const value = await saveAnnouncement(retry.current.input, controller.signal);
      if (!active.current) return;
      retry.current = null; setConfirm(null); setRevision((current) => current + 1);
      setNotice(action === "publish" ? "公告已发布。" : action === "withdraw" ? "公告已撤回。" : action === "delete" ? "公告已删除。" : "草稿已保存。");
      if (action === "delete") { setDraft(null); setOriginal(null); } else { setDraft(value); setOriginal(value); }
      window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));
    } catch (failure) {
      if (active.current) { setEditError(announcementFailure(failure)); setConfirm(null); setConflict(failure instanceof AnnouncementRequestError && ["ANNOUNCEMENT_CONFLICT", "ANNOUNCEMENT_STATE_CONFLICT", "ANNOUNCEMENT_NOT_FOUND"].includes(failure.code)); }
    } finally { controllers.current.delete(controller); operationBusy.current = false; if (active.current) setBusy(false); }
  };
  const reload = async () => {
    if (!draft || busy) return;
    // Reloading a conflicting edit is explicit: the message names draft loss.
    const controller = new AbortController(); controllers.current.add(controller); setBusy(true);
    try {
      const found = await managedAnnouncement(draft.id, controller.signal);
      if (active.current) { choose(found); setRevision((value) => value + 1); }
    } catch (failure) { if (active.current) { if (failure instanceof AnnouncementRequestError && failure.status === 404) { setDraft(null); setOriginal(null); setRevision((value) => value + 1); } else setEditError(announcementFailure(failure)); } }
    finally { controllers.current.delete(controller); if (active.current) setBusy(false); }
  };
  return <section className={styles.management} aria-label="公告管理">
    <header className={styles.managementHeader}><div><h1>公告</h1><p>发布活动与重要消息，用户在大厅和画布中收到提醒。</p></div><div className={styles.managementActions}>
      <Button variant="ghost" size="icon" aria-label="刷新公告管理" disabled={loading || moreBusy} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={17} /></Button>
      <Button size="sm" onClick={() => { setNotice(""); choose(fresh()); }}><Plus size={16} />写公告</Button>
    </div></header>
    <div className={styles.filters} role="group" aria-label="公告状态筛选">{Object.entries(statuses).map(([value, label]) => <Button key={value} variant="ghost" size="sm" disabled={moreBusy} aria-pressed={filter === value} onClick={() => setFilter(value as keyof typeof statuses)}>{label}</Button>)}</div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading ? <div className={styles.empty} role="status"><LoaderCircle size={19} className="animate-spin" />正在读取公告</div> : <div className={styles.managementList}>{list.items.map((item) => <button key={item.id} type="button" className={styles.managementRow} onClick={() => choose(item)}>
      <div><strong>{item.title || "未命名草稿"}</strong><p>{announcementTime(item.updatedAt)}{item.pinned ? " · 置顶" : ""}{item.important ? " · 重要" : ""}</p></div><span>{item.status === "deleted" ? "已删除" : statuses[item.status]}</span>
    </button>)}{!list.items.length && !error && <div className={styles.empty}><Megaphone size={22} /><strong>{filter === "all" ? "还没有公告" : `暂无${statuses[filter]}公告`}</strong><p>点击「写公告」，先保存草稿或直接发布。</p></div>}</div>}
    {error && <div className={styles.error} role="alert">{error}<Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>重试</Button></div>}
    {list.nextCursor && !loading && <div className={styles.pagination}><Button variant="ghost" size="sm" disabled={moreBusy} onClick={() => void more()}>{moreBusy ? "正在读取" : "加载更多"}</Button></div>}
    <Sheet open={Boolean(draft)} onOpenChange={(value) => { if (!value) close(); }}><SheetContent className={styles.panel} showCloseButton={false} onKeyDown={(event) => event.stopPropagation()}>
      <SheetHeader className={styles.panelHeader}><div><SheetTitle>{draft?.version === 0 ? "写公告" : "编辑公告"}</SheetTitle><SheetDescription className="sr-only">编辑标题与Markdown正文，草稿保存后不会通知用户，发布后对所有用户可见。</SheetDescription></div><SheetClose asChild><Button variant="ghost" size="icon" disabled={busy} aria-label="关闭公告编辑"><X size={17} /></Button></SheetClose></SheetHeader>
      {draft && <><div className={styles.editorBody}>
        <div className={styles.editorField}><label htmlFor="announcement-title">标题</label><Input id="announcement-title" value={draft.title} maxLength={100} disabled={busy || conflict} placeholder="一句话告诉用户发生了什么" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
        <div className={styles.editorField}><label htmlFor="announcement-body">正文</label><Textarea id="announcement-body" value={draft.body} maxLength={12000} disabled={busy || conflict} placeholder="写下活动内容、时间和参与方式…" onChange={(event) => setDraft({ ...draft, body: event.target.value })} /><p className={styles.hint}>支持Markdown标题、列表和链接。正文最多12000字。</p></div>
        <div className={styles.options}><label><Checkbox checked={draft.important} disabled={busy || conflict} onCheckedChange={(value) => setDraft({ ...draft, important: value === true })} />重要公告</label><label><Checkbox checked={draft.pinned} disabled={busy || conflict} onCheckedChange={(value) => setDraft({ ...draft, pinned: value === true })} />置顶</label></div>
        <Button variant="ghost" size="sm" aria-expanded={preview} onClick={() => setPreview((value) => !value)}>{preview ? "收起预览" : "预览正文"}</Button>
        {preview && <div className={styles.preview}><h3>用户看到的内容</h3><h2 className={styles.postTitle}>{draft.title || "公告标题"}</h2><AnnouncementBody body={draft.body} /></div>}
        {editError && <div className={styles.error} role="alert"><p>{editError}</p>{conflict && <><p className={styles.hint}>加载最新版本会放弃这里尚未保存的修改。</p><Button variant="ghost" size="sm" disabled={busy} onClick={() => void reload()}>放弃修改，加载最新</Button></>}</div>}
      </div><footer className={styles.editorFooter}>
        {draft.status === "published" ? <Button variant="ghost" size="sm" disabled={busy || conflict} onClick={() => setConfirm("withdraw")}>撤回</Button> : <Button variant="ghost" size="sm" disabled={busy || conflict || !draft.version} onClick={() => setConfirm("delete")}>删除</Button>}
        {draft.status !== "published" && <Button variant="outline" size="sm" disabled={busy || conflict} onClick={() => void mutate("save")}>保存草稿</Button>}
        <Button size="sm" disabled={busy || conflict || !draft.title.trim() || !draft.body.trim()} onClick={() => void mutate("publish")}>{busy && <LoaderCircle size={14} className="animate-spin" />}{busy ? "正在保存" : draft.status === "published" ? "发布更新" : "发布公告"}</Button>
      </footer></>}
    </SheetContent></Sheet>
    <Dialog open={Boolean(confirm)} onOpenChange={(value) => { if (!value && !busy) setConfirm(null); }}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>{confirm === "close" ? "放弃修改？" : confirm === "withdraw" ? "撤回公告？" : "删除公告？"}</DialogTitle><DialogDescription>{confirm === "close" ? "尚未保存的内容会被放弃。" : confirm === "withdraw" ? "撤回后用户将无法查看这条公告。尚未发布的修改不会保存，之后可以重新发布。" : "删除后这条公告将从管理列表移除，尚未保存的修改会被放弃。"}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>取消</Button><Button disabled={busy} onClick={() => { if (confirm === "close") { setConfirm(null); setDraft(null); setOriginal(null); } else if (confirm) void mutate(confirm); }}>{busy ? "正在保存" : confirm === "close" ? "放弃修改" : confirm === "withdraw" ? "撤回" : "删除"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
