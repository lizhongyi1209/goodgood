import { Readable } from "node:stream";
import { ANNOUNCEMENT_LIMITS } from "../../shared/contracts/announcements.mjs";
import { announcementApiError, invalidAnnouncement } from "./policy.mjs";
import { readAnnouncements, readAnnouncement, mutateAnnouncement, interactWithAnnouncement, announcementStatistics } from "./repository.mjs";
import { announcementStream, broadcastAnnouncement } from "./realtime.mjs";

const JSON_HEADERS = { "cache-control": "private, no-store", "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" };
async function body(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw invalidAnnouncement("请使用JSON格式提交公告。");
  const reader = request.body?.getReader();
  if (!reader) throw invalidAnnouncement();
  let size = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > ANNOUNCEMENT_LIMITS.bodyBytes) { await reader.cancel(); throw invalidAnnouncement("提交的公告过大。"); }
      chunks.push(Buffer.from(value));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw invalidAnnouncement(); }
  } finally { reader.releaseLock(); }
}
export async function handleAnnouncementsHttp(request, { authenticateSession, resources, operations = { readAnnouncements, readAnnouncement, mutateAnnouncement, interactWithAnnouncement, announcementStatistics }, stream = announcementStream, broadcast = broadcastAnnouncement }) {
  const json = (value, status = 200) => Response.json(value, { status, headers: JSON_HEADERS });
  try {
    const ownerContext = await authenticateSession(request);
    const url = new URL(request.url), administrator = url.pathname.startsWith("/api/admin/announcements");
    const base = administrator ? "/api/admin/announcements" : "/api/announcements";
    const args = { pool: resources.pool, ownerContext, administrator };
    if (request.method === "POST" && request.headers.get("x-goodgood-announcement-action") !== "1") {
      return json({ error: { code: "ANNOUNCEMENT_CSRF", message: "请求未通过安全校验，请刷新后重试。" } }, 403);
    }
    if (url.pathname === base && request.method === "GET") return json(await operations.readAnnouncements({ ...args, input: { cursor: url.searchParams.get("cursor"), status: url.searchParams.get("status"), ids: url.searchParams.get("ids") } }));
    if (administrator && url.pathname === base && request.method === "POST") {
      const result = await operations.mutateAnnouncement({ ...args, input: await body(request) });
      if (result.changed && result.notify) await broadcast(resources, result.item);
      return json(result.item);
    }
    if (!administrator && url.pathname === `${base}/stream` && request.method === "GET") return await stream({ request, resources, ownerContext, authenticateSession });
    const relative = url.pathname.slice(base.length);
    const match = relative.match(/^\/([^/]+)(?:\/(like|view|stats))?$/);
    if (match && !match[2] && request.method === "GET") return json(await operations.readAnnouncement({ ...args, id: match[1] }));
    if (match && !administrator && ["like", "view"].includes(match[2]) && request.method === "POST") return json(await operations.interactWithAnnouncement({ ...args, id: match[1], action: match[2], input: await body(request) }));
    if (match && administrator && match[2] === "stats" && request.method === "GET") return json(await operations.announcementStatistics({ ...args, id: match[1] }));
    return json({ error: { code: "ANNOUNCEMENT_METHOD", message: "请求地址或方法无效。" } }, 405);
  } catch (error) { const failure = announcementApiError(error); return json(failure.body, failure.status); }
}
export function createAnnouncementsNodeApiHandler(options) {
  return async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!/^\/api\/(?:admin\/)?announcements(?:\/|$)/.test(pathname)) return false;
    const abort = new AbortController();
    const disconnected = () => abort.abort();
    request.once("aborted", disconnected); response.once("close", disconnected);
    try {
      const ownerContext = await options.authenticateSession(request);
      let initialAuthentication = true;
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      const native = new Request(`http://${request.headers.host ?? "localhost"}${request.url}`, { method: request.method, headers, signal: abort.signal,
        ...(request.method !== "GET" && request.method !== "HEAD" ? { body: Readable.toWeb(request), duplex: "half" } : {}) });
      const result = await handleAnnouncementsHttp(native, { ...options, authenticateSession: async () => {
        if (initialAuthentication) { initialAuthentication = false; return ownerContext; }
        return options.authenticateSession(request);
      } });
      if (abort.signal.aborted) return true;
      response.writeHead(result.status, Object.fromEntries(result.headers));
      if (result.headers.get("content-type")?.startsWith("text/event-stream")) {
        response.flushHeaders();
        const stream = Readable.fromWeb(result.body);
        stream.on("error", () => response.destroy());
        response.once("close", () => stream.destroy());
        stream.pipe(response);
      } else response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      if (!abort.signal.aborted && !response.headersSent) { const failure = announcementApiError(error); response.writeHead(failure.status, JSON_HEADERS); response.end(JSON.stringify(failure.body)); }
    }
    return true;
  };
}
