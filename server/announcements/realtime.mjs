import { randomUUID } from "node:crypto";
import { ANNOUNCEMENT_LIMITS } from "../../shared/contracts/announcements.mjs";
import { AnnouncementError } from "./policy.mjs";
import { authorizeAnnouncements } from "./repository.mjs";

const CHANNEL = "goodgood:announcements";
const hubs = new WeakMap();
const encoder = new TextEncoder();
async function announcementHub(resources) {
  let pending = hubs.get(resources);
  if (!pending) {
    pending = (async () => {
      const subscriber = resources.redis.duplicate({ socket: { connectTimeout: 5000, reconnectStrategy: (retries) => retries < 3 ? 500 * (retries + 1) : new Error("announcement_transport_unavailable") } });
      const hub = { subscriber, listeners: new Set(), counts: new Map(), connected: false };
      subscriber.on("error", () => {
        for (const listener of hub.listeners) listener(null);
        if (hub.connected) { hubs.delete(resources); if (subscriber.isOpen) subscriber.destroy(); }
      });
      try {
        await subscriber.connect();
        await subscriber.subscribe(CHANNEL, (message) => {
          try {
            const value = JSON.parse(message);
            if (!/^[0-9a-f-]{36}$/i.test(value.id) || !["published", "withdrawn", "deleted"].includes(value.status) || !Number.isInteger(value.publicationVersion)) return;
            for (const listener of hub.listeners) listener(value);
          } catch { /* Malformed broadcasts never become user content. */ }
        });
        hub.connected = true;
        return hub;
      } catch (error) {
        if (subscriber.isOpen) subscriber.destroy();
        hubs.delete(resources);
        throw error;
      }
    })();
    hubs.set(resources, pending);
  }
  return pending;
}
export async function broadcastAnnouncement(resources, item) {
  // The database write is already committed. An unavailable transport must not
  // report a successful publication as a failed write; reconnect/poll catches up.
  let timer;
  try {
    if (!resources.redis.isReady) throw Error("announcement_transport_unavailable");
    await Promise.race([resources.redis.publish(CHANNEL, JSON.stringify({ id: item.id, status: item.status, publicationVersion: item.publicationVersion })),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error("announcement_transport_timeout")), 2000); })]);
  }
  catch { console.error(JSON.stringify({ event: "announcements.broadcast_unavailable" })); }
  finally { clearTimeout(timer); }
}
export async function announcementStream({ request, resources, ownerContext, authenticateSession }) {
  await authorizeAnnouncements(resources.pool, ownerContext);
  const hub = await announcementHub(resources);
  if (request.signal.aborted) throw new AnnouncementError("ANNOUNCEMENTS_DISCONNECTED", "连接已关闭。", 499);
  const owner = ownerContext.ownerId;
  if ((hub.counts.get(owner) ?? 0) >= ANNOUNCEMENT_LIMITS.streamsPerUser) throw new AnnouncementError("ANNOUNCEMENTS_STREAM_LIMIT", "公告连接过多，请关闭闲置页面。", 429);
  hub.counts.set(owner, (hub.counts.get(owner) ?? 0) + 1);
  let cleanup;
  const body = new ReadableStream({
    start(controller) {
      let ended = false, dirty = false, checking = false;
      const send = (value) => {
        if (ended) return;
        if ((controller.desiredSize ?? 0) <= 0) { dirty = true; return; }
        controller.enqueue(encoder.encode(value));
      };
      const listener = (value) => {
        if (!value) { cleanup(); return; }
        send(`id: ${randomUUID()}\nevent: announcement\ndata: ${JSON.stringify(value)}\n\n`);
      };
      const heartbeat = setInterval(() => {
        if (dirty && (controller.desiredSize ?? 0) > 0) { dirty = false; send("event: refresh\ndata: {}\n\n"); }
        else send(": heartbeat\n\n");
      }, 15_000);
      const authorization = setInterval(async () => {
        if (checking || ended) return;
        checking = true;
        try {
          const current = await authenticateSession(request);
          if (current.ownerId !== owner) throw Error();
          await authorizeAnnouncements(resources.pool, current);
        } catch { cleanup(); }
        finally { checking = false; }
      }, 60_000);
      heartbeat.unref?.(); authorization.unref?.();
      cleanup = (close = true) => {
        if (ended) return;
        ended = true;
        clearInterval(heartbeat); clearInterval(authorization);
        request.signal.removeEventListener("abort", cleanup);
        hub.listeners.delete(listener);
        const count = (hub.counts.get(owner) ?? 1) - 1;
        if (count > 0) hub.counts.set(owner, count); else hub.counts.delete(owner);
        if (close) controller.close();
      };
      hub.listeners.add(listener);
      request.signal.addEventListener("abort", cleanup, { once: true });
      send("retry: 5000\nevent: connected\ndata: {}\n\n");
    },
    cancel() { cleanup?.(false); },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "private, no-store, no-transform", "x-accel-buffering": "no", "x-content-type-options": "nosniff" } });
}
export async function closeAnnouncementStreams(resources) {
  const pending = hubs.get(resources);
  if (!pending) return;
  hubs.delete(resources);
  try {
    const hub = await pending;
    for (const listener of [...hub.listeners]) listener(null);
    if (hub.subscriber.isOpen) await hub.subscriber.quit();
  } catch { /* Shutdown continues when the transport is already unavailable. */ }
}
