"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ANNOUNCEMENTS_CHANGED_EVENT } from "@/shared/contracts/announcements.mjs";
import type { Announcement, AnnouncementFeed } from "@/shared/contracts/announcements";
import { announcementFeed, announcementSnapshot, announcementFailure, AnnouncementRequestError, likeAnnouncement, viewAnnouncement } from "./http-announcements";

const empty: AnnouncementFeed = { items: [], nextCursor: null, unreadCount: 0 };
export function useAnnouncements(owner: string, readingAway: RefObject<boolean>) {
  const [feed, setFeed] = useState<AnnouncementFeed>(empty);
  const [pending, setPending] = useState<AnnouncementFeed | null>(null);
  const [notice, setNotice] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true), [ready, setReady] = useState(false);
  const [error, setError] = useState(""), [syncing, setSyncing] = useState(false), [moreBusy, setMoreBusy] = useState(false);
  const [busyLikes, setBusyLikes] = useState<ReadonlySet<string>>(new Set());
  const state = useRef({ active: true, feed: empty, refreshing: false, refreshAgain: false, moreBusy: false, initialized: false, interactions: 0, dataRevision: 0, controllers: new Set<AbortController>(), likes: new Set<string>(), seen: new Set<string>() });
  const commit = useCallback((value: AnnouncementFeed) => { state.current.feed = value; setFeed(value); }, []);
  const run = useCallback(async <T,>(action: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController(); state.current.controllers.add(controller);
    try { return await action(controller.signal); }
    finally { state.current.controllers.delete(controller); }
  }, []);
  const announce = useCallback((head: AnnouncementFeed) => {
    const latest = [...head.items].filter((item) => item.unread && !state.current.seen.has(`${item.id}:${item.publicationVersion}`)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];
    if (!latest) return;
    // Notification dismissal and actual reading are separate: unread is durable.
    for (const item of head.items) state.current.seen.add(`${item.id}:${item.publicationVersion}`);
    const seen = [...state.current.seen].slice(-200); state.current.seen = new Set(seen);
    try { localStorage.setItem(`goodgood:announcement-notices:${owner}`, JSON.stringify(seen)); } catch { /* The badge still works without browser storage. */ }
    setNotice(latest);
  }, [owner]);
  const refresh = useCallback(async () => {
    const current = state.current;
    if (!current.active) return;
    if (current.refreshing || current.moreBusy || current.interactions) { current.refreshAgain = true; return; }
    const dataRevision = current.dataRevision;
    current.refreshing = true; setSyncing(true);
    try {
      const head = await run((signal) => announcementFeed(signal));
      if (!current.active) return;
      if (dataRevision !== current.dataRevision) { current.refreshAgain = true; return; }
      if (readingAway.current && current.initialized) {
        // Reconcile every visible/loaded post after a lost broadcast, without
        // inserting new rows above the reader or retaining withdrawn content.
        const ids = current.feed.items.map((item) => item.id), existing = new Map<string, Announcement>();
        for (let start = 0; start < ids.length; start += 100) {
          const snapshot = await run((signal) => announcementSnapshot(ids.slice(start, start + 100), signal));
          for (const item of snapshot.items) existing.set(item.id, item);
        }
        if (!current.active) return;
        if (dataRevision !== current.dataRevision) { current.refreshAgain = true; return; }
        const changed = head.items.some((item, index) => current.feed.items[index]?.id !== item.id || current.feed.items[index]?.publicationVersion !== item.publicationVersion);
        commit({ ...current.feed, items: current.feed.items.flatMap((item) => {
          const updated = existing.get(item.id);
          return updated ? [updated.publicationVersion === item.publicationVersion ? updated : item] : [];
        }), unreadCount: head.unreadCount });
        setPending(changed ? head : null);
      } else { commit(head); setPending(null); }
      announce(head); current.initialized = true; setReady(true); setError("");
    } catch (failure) { if (current.active) setError(announcementFailure(failure)); }
    finally {
      current.refreshing = false;
      if (current.active) { setLoading(false); setSyncing(false); if (current.refreshAgain) { current.refreshAgain = false; void refresh(); } }
    }
  }, [announce, commit, readingAway, run]);
  useEffect(() => {
    const current = state.current; current.active = true;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`goodgood:announcement-notices:${owner}`) ?? "[]");
      if (Array.isArray(stored)) current.seen = new Set(stored.filter((value): value is string => typeof value === "string").slice(-200));
    } catch { /* Private browsing falls back to memory. */ }
    void refresh();
    return () => { current.active = false; for (const controller of current.controllers) controller.abort(); };
  }, [owner, refresh]);
  useEffect(() => {
    if (!ready) return;
    let connection: EventSource | null = null, disposed = false;
    const disconnect = () => { connection?.close(); connection = null; };
    const connect = () => {
      if (disposed || document.visibilityState !== "visible" || !navigator.onLine || connection) return;
      connection = new EventSource("/api/announcements/stream", { withCredentials: true });
      connection.onopen = () => { void refresh(); }; // Closes the list/subscribe race.
      connection.addEventListener("refresh", () => { void refresh(); });
      connection.addEventListener("announcement", (event) => {
        try {
          const change = JSON.parse((event as MessageEvent<string>).data);
          state.current.dataRevision++;
          if (change.status === "withdrawn" || change.status === "deleted") {
            commit({ ...state.current.feed, items: state.current.feed.items.filter((item) => item.id !== change.id) });
            setPending((value) => value ? { ...value, items: value.items.filter((item) => item.id !== change.id) } : null);
            setNotice((value) => value?.id === change.id ? null : value);
          }
        } catch { /* Fetch the authorized feed even if a change marker is malformed. */ }
        void refresh();
      });
      connection.onerror = () => { disconnect(); }; // Poll below is bounded and only runs in a visible page.
    };
    const resume = () => { if (document.visibilityState === "visible" && navigator.onLine) { void refresh(); connect(); } else disconnect(); };
    const poll = setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) { void refresh(); connect(); } }, 30_000);
    document.addEventListener("visibilitychange", resume); window.addEventListener("online", resume); window.addEventListener("offline", resume);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, resume); connect();
    return () => { disposed = true; clearInterval(poll); disconnect(); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", resume); window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, resume); };
  }, [ready, refresh, commit]);
  const more = async () => {
    const current = state.current, cursor = current.feed.nextCursor;
    if (!cursor || current.moreBusy || current.refreshing) return;
    current.moreBusy = true; setMoreBusy(true);
    try {
      const page = await run((signal) => announcementFeed(signal, cursor));
      if (current.active) { const ids = new Set(current.feed.items.map((item) => item.id)); commit({ ...current.feed, items: [...current.feed.items, ...page.items.filter((item) => !ids.has(item.id))], nextCursor: page.nextCursor }); setError(""); }
    } catch (failure) { if (current.active) setError(announcementFailure(failure)); }
    finally { current.moreBusy = false; if (current.active) { setMoreBusy(false); if (current.refreshAgain) { current.refreshAgain = false; void refresh(); } } }
  };
  const updatePost = (id: string, update: (item: Announcement) => Announcement) => {
    commit({ ...state.current.feed, items: state.current.feed.items.map((item) => item.id === id ? update(item) : item) });
    setPending((head) => head ? { ...head, items: head.items.map((item) => item.id === id ? update(item) : item) } : null);
  };
  const like = async (item: Announcement) => {
    const current = state.current; if (current.likes.has(item.id)) return;
    current.likes.add(item.id); current.interactions++; current.dataRevision++; setBusyLikes(new Set(current.likes));
    try { const result = await run((signal) => likeAnnouncement(item, !item.liked, signal)); if (current.active) { updatePost(item.id, (value) => ({ ...value, liked: result.liked })); setError(""); } }
    catch (failure) { if (current.active) setError(announcementFailure(failure)); }
    finally { current.likes.delete(item.id); current.interactions--; current.dataRevision++; if (current.active) { setBusyLikes(new Set(current.likes)); if (current.refreshAgain) { current.refreshAgain = false; void refresh(); } } }
  };
  const view = async (item: Announcement) => {
    const current = state.current; current.interactions++; current.dataRevision++;
    try {
      await run((signal) => viewAnnouncement(item, signal));
      if (!state.current.active) return false;
      const wasUnread = state.current.feed.items.some((value) => value.id === item.id && value.publicationVersion === item.publicationVersion && value.unread);
      updatePost(item.id, (value) => value.publicationVersion === item.publicationVersion ? { ...value, unread: false } : value);
      if (wasUnread) commit({ ...state.current.feed, unreadCount: Math.max(0, state.current.feed.unreadCount - 1) });
      return true;
    } catch (failure) {
      if (state.current.active && failure instanceof AnnouncementRequestError && [404, 409].includes(failure.status)) void refresh();
      return false;
    } finally { current.interactions--; current.dataRevision++; if (current.active && current.refreshAgain) { current.refreshAgain = false; void refresh(); } }
  };
  const showLatest = () => { if (pending) { commit(pending); setPending(null); } void refresh(); };
  return { feed, pending, notice, setNotice, loading, error, syncing, moreBusy, busyLikes, refresh, more, like, view, showLatest };
}
