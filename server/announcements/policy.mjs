import { ANNOUNCEMENT_ACTIONS, ANNOUNCEMENT_LIMITS } from "../../shared/contracts/announcements.mjs";
import { AuthenticationError } from "../auth/errors.mjs";
import { randomUUID } from "node:crypto";

export class AnnouncementError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export const invalidAnnouncement = (message = "公告内容无效，请检查后重试。") => new AnnouncementError("ANNOUNCEMENT_INVALID", message);
export function announcementId(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw invalidAnnouncement("公告标识无效。");
  return value.toLowerCase();
}
export function publicationVersion(value) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483646) throw invalidAnnouncement("公告版本无效，请重新读取。");
  return value;
}
export function validateAnnouncementMutation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["id", "expectedVersion", "mutationId", "action", "title", "body", "important", "pinned"].includes(key))) throw invalidAnnouncement();
  if (!ANNOUNCEMENT_ACTIONS.includes(input.action) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0 || input.expectedVersion > 2147483646) throw invalidAnnouncement();
  const value = { id: announcementId(input.id), mutationId: announcementId(input.mutationId), expectedVersion: input.expectedVersion, action: input.action };
  if (["save", "publish"].includes(input.action)) {
    if (typeof input.title !== "string" || typeof input.body !== "string" || typeof input.important !== "boolean" || typeof input.pinned !== "boolean") throw invalidAnnouncement();
    const title = input.title.trim(), body = input.body.trim();
    if (Array.from(title).length > ANNOUNCEMENT_LIMITS.title || /[\u0000-\u001f\u007f]/.test(title) || Array.from(body).length > ANNOUNCEMENT_LIMITS.body || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) throw invalidAnnouncement("标题最多100字，正文最多12000字。");
    if (input.action === "publish" && (!title || !body)) throw invalidAnnouncement("发布前请填写标题和正文。");
    Object.assign(value, { title, body, important: input.important, pinned: input.pinned });
  } else if (input.expectedVersion === 0 || ["title", "body", "important", "pinned"].some((key) => Object.hasOwn(input, key))) throw invalidAnnouncement();
  return value;
}
export function announcementCursor(value, administrator = false) {
  if (!value) return null;
  try {
    if (typeof value !== "string" || value.length > 256) throw Error();
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const time = new Date(cursor.time);
    if (!Number.isFinite(time.getTime()) || time.toISOString() !== cursor.time || (!administrator && typeof cursor.pinned !== "boolean")) throw Error();
    return { id: announcementId(cursor.id), time: cursor.time, pinned: administrator ? false : cursor.pinned };
  } catch { throw invalidAnnouncement("公告分页已失效，请重新读取。"); }
}
export function announcementApiError(error) {
  const requestId = randomUUID();
  if (error instanceof AnnouncementError || error instanceof AuthenticationError) return { status: error.status, body: { error: { code: error.code, message: error.message, requestId } } };
  return { status: 503, body: { error: { code: "ANNOUNCEMENTS_UNAVAILABLE", message: "公告暂时不可用，请稍后重试。", requestId } } };
}
