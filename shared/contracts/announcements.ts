export type Announcement = Readonly<{
  id: string; title: string; body: string; important: boolean; pinned: boolean;
  version: number; publicationVersion: number; publishedAt: string | null;
  updatedAt: string; unread: boolean; liked: boolean;
}>;
export type ManagedAnnouncement = Announcement & Readonly<{ status: "draft" | "published" | "withdrawn" | "deleted" }>;
export type AnnouncementFeed<T = Announcement> = Readonly<{ items: readonly T[]; nextCursor: string | null; unreadCount: number }>;
export type AnnouncementMutation = Readonly<{
  id: string; expectedVersion: number; mutationId: string;
  action: "save" | "publish" | "withdraw" | "delete";
  title?: string; body?: string; important?: boolean; pinned?: boolean;
}>;
