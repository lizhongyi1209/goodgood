import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import type { Announcement, AnnouncementFeed, AnnouncementMutation, ManagedAnnouncement } from "@/shared/contracts/announcements";

export class AnnouncementRequestError extends Error {
  constructor(message: string, public code: string, public status: number) { super(message); }
}
async function request<T>(url: string, signal?: AbortSignal, input?: unknown): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20_000);
  try {
    const response = await goodGoodApiFetch(url, { cache: "no-store", credentials: "same-origin", signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
      ...(input === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-goodgood-announcement-action": "1" }, body: JSON.stringify(input) }) });
    let payload;
    try { payload = await response.json(); }
    catch { throw new AnnouncementRequestError("公告暂时不可用，请稍后重试。", "ANNOUNCEMENTS_UNAVAILABLE", response.status); }
    const error = payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object"
      ? payload.error as { code?: unknown; message?: unknown }
      : null;
    if (!response.ok) throw new AnnouncementRequestError(
      typeof error?.message === "string" ? error.message : "公告暂时不可用，请稍后重试。",
      typeof error?.code === "string" ? error.code : "ANNOUNCEMENTS_UNAVAILABLE",
      response.status,
    );
    return payload as T;
  } finally { clearTimeout(timer); }
}
export function announcementFeed(signal?: AbortSignal, cursor?: string | null, administrator = false, status?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (status && status !== "all") params.set("status", status);
  return request<AnnouncementFeed<ManagedAnnouncement>>(`/api/${administrator ? "admin/" : ""}announcements?${params}`, signal);
}
export function announcementSnapshot(ids: readonly string[], signal?: AbortSignal) {
  return request<AnnouncementFeed>(`/api/announcements?${new URLSearchParams({ ids: ids.join(",") })}`, signal);
}
export function saveAnnouncement(input: AnnouncementMutation, signal?: AbortSignal) { return request<ManagedAnnouncement>("/api/admin/announcements", signal, input); }
export function managedAnnouncement(id: string, signal?: AbortSignal) { return request<ManagedAnnouncement>(`/api/admin/announcements/${id}`, signal); }
export function likeAnnouncement(item: Announcement, liked: boolean, signal?: AbortSignal) { return request<{ liked: boolean }>(`/api/announcements/${item.id}/like`, signal, { liked }); }
export function viewAnnouncement(item: Announcement, signal?: AbortSignal) { return request<{ read: true }>(`/api/announcements/${item.id}/view`, signal, { publicationVersion: item.publicationVersion }); }
export function announcementFailure(error: unknown) {
  return error instanceof Error && error.name === "AbortError" ? "连接超时，请重试。" : error instanceof Error ? error.message : "公告暂时不可用，请稍后重试。";
}
