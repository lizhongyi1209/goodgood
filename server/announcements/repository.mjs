import { createHash, randomUUID } from "node:crypto";
import { AnnouncementError, announcementId, announcementCursor, invalidAnnouncement, publicationVersion, validateAnnouncementMutation } from "./policy.mjs";
import { sessionExpiredError } from "../auth/errors.mjs";
import { ANNOUNCEMENT_LIMITS } from "../../shared/contracts/announcements.mjs";

export async function authorizeAnnouncements(client, ownerContext, administrator = false) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  const result = await client.query(`SELECT u.id FROM users u WHERE u.id=$1 AND u.status='active'
    ${administrator ? "AND EXISTS (SELECT 1 FROM system_role_assignments r WHERE r.owner_id=u.id AND r.role='site_owner')" : ""} FOR SHARE OF u`, [ownerContext.ownerId]);
  if (!result.rowCount) throw new AnnouncementError("ANNOUNCEMENTS_FORBIDDEN", administrator ? "只有已启用的站长可以管理公告。" : "当前账户无法读取公告。", 403);
}
async function transaction(pool, action) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await action(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
const iso = (value) => value ? new Date(value).toISOString() : null;
export function announcementDto(row, administrator = false) {
  return { id: row.id, title: row.title, body: row.body, important: row.important, pinned: row.pinned,
    version: row.version, publicationVersion: row.publication_version, publishedAt: iso(row.published_at), updatedAt: iso(row.updated_at),
    unread: Boolean(row.unread), liked: Boolean(row.liked), ...(administrator ? { status: row.status } : {}) };
}
export async function readAnnouncements({ pool, ownerContext, administrator = false, input = {} }) {
  const cursor = announcementCursor(input.cursor, administrator);
  let ids = null;
  if (input.ids !== undefined && input.ids !== null) {
    if (administrator || typeof input.ids !== "string" || input.ids.length > 3700 || input.cursor) throw invalidAnnouncement();
    ids = input.ids.split(",").map(announcementId);
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) throw invalidAnnouncement();
  }
  if (administrator && input.status && !["draft", "published", "withdrawn"].includes(input.status)) throw invalidAnnouncement();
  return transaction(pool, async (client) => {
    await authorizeAnnouncements(client, ownerContext, administrator);
    const limit = ids ? 100 : ANNOUNCEMENT_LIMITS.page;
    const result = administrator
      ? await client.query(`SELECT a.* FROM announcements a WHERE a.status<>'deleted' AND ($1::text IS NULL OR a.status=$1)
          AND ($2::timestamptz IS NULL OR (a.updated_at,a.id)<($2,$3::uuid)) ORDER BY a.updated_at DESC,a.id DESC LIMIT $4`, [input.status || null, cursor?.time || null, cursor?.id || null, limit + 1])
      : await client.query(`SELECT a.*, coalesce(r.publication_version,0)<a.publication_version AS unread,l.owner_id IS NOT NULL AS liked
          FROM announcements a LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.owner_id=$1
          LEFT JOIN announcement_likes l ON l.announcement_id=a.id AND l.owner_id=$1
          WHERE a.status='published' AND ($2::boolean IS NULL OR (a.pinned,a.published_at,a.id)<($2,$3::timestamptz,$4::uuid))
          AND ($6::uuid[] IS NULL OR a.id=ANY($6))
          ORDER BY a.pinned DESC,a.published_at DESC,a.id DESC LIMIT $5`, [ownerContext.ownerId, cursor?.pinned ?? null, cursor?.time || null, cursor?.id || null, limit + 1, ids]);
    const unread = administrator ? null : await client.query(`SELECT count(*) AS count FROM announcements a LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.owner_id=$1
      WHERE a.status='published' AND coalesce(r.publication_version,0)<a.publication_version`, [ownerContext.ownerId]);
    const items = result.rows.slice(0, limit), last = items.at(-1);
    return { items: items.map((row) => announcementDto(row, administrator)), unreadCount: Number(unread?.rows[0]?.count ?? 0),
      nextCursor: result.rows.length > limit ? Buffer.from(JSON.stringify({ id: last.id, time: iso(administrator ? last.updated_at : last.published_at), pinned: last.pinned })).toString("base64url") : null };
  });
}
export async function readAnnouncement({ pool, ownerContext, id, administrator = false }) {
  id = announcementId(id);
  return transaction(pool, async (client) => {
    await authorizeAnnouncements(client, ownerContext, administrator);
    const result = await client.query(`SELECT a.*, coalesce(r.publication_version,0)<a.publication_version AS unread,l.owner_id IS NOT NULL AS liked
      FROM announcements a LEFT JOIN announcement_reads r ON r.announcement_id=a.id AND r.owner_id=$2 LEFT JOIN announcement_likes l ON l.announcement_id=a.id AND l.owner_id=$2
      WHERE a.id=$1 AND ${administrator ? "a.status<>'deleted'" : "a.status='published'"}`, [id, ownerContext.ownerId]);
    if (!result.rowCount) throw new AnnouncementError("ANNOUNCEMENT_NOT_FOUND", "这条公告已撤回或不存在。", 404);
    return announcementDto(result.rows[0], administrator);
  });
}
export async function mutateAnnouncement({ pool, ownerContext, input }) {
  const value = validateAnnouncementMutation(input);
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return transaction(pool, async (client) => {
    await authorizeAnnouncements(client, ownerContext, true);
    // Serialize even the first insert, so an unknown-response retry cannot create two posts.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,337))", [value.id]);
    const existing = (await client.query("SELECT * FROM announcements WHERE id=$1 FOR UPDATE", [value.id])).rows[0];
    if (existing?.last_mutation_id === value.mutationId) {
      if (existing.last_mutation_hash !== hash) throw new AnnouncementError("ANNOUNCEMENT_REQUEST_CONFLICT", "同一操作不能提交不同内容，请重新操作。", 409);
      return { item: announcementDto(existing, true), changed: false };
    }
    if ((!existing && value.expectedVersion !== 0) || (existing && existing.version !== value.expectedVersion)) throw new AnnouncementError("ANNOUNCEMENT_CONFLICT", "公告已被其他人修改，请加载最新版本后重试。", 409);
    if (existing?.status === "deleted") throw new AnnouncementError("ANNOUNCEMENT_NOT_FOUND", "公告已删除。", 404);
    if (!existing && !["save", "publish"].includes(value.action)) throw invalidAnnouncement();
    if (existing?.status === "published" && ["save", "delete"].includes(value.action)) throw new AnnouncementError("ANNOUNCEMENT_STATE_CONFLICT", value.action === "save" ? "已发布的公告请使用发布更新。" : "请先撤回公告，再删除。", 409);
    if (value.action === "withdraw" && existing?.status !== "published") throw new AnnouncementError("ANNOUNCEMENT_STATE_CONFLICT", "只有已发布的公告可以撤回。", 409);
    const status = value.action === "publish" ? "published" : value.action === "withdraw" ? "withdrawn" : value.action === "delete" ? "deleted" : existing?.status ?? "draft";
    const next = existing ? (await client.query(`UPDATE announcements SET title=$2,body=$3,important=$4,pinned=$5,status=$6,version=version+1,
        publication_version=publication_version+$7,published_at=CASE WHEN $7=1 THEN date_trunc('milliseconds',now()) ELSE published_at END,updated_by=$8,last_mutation_id=$9,last_mutation_hash=$10,updated_at=date_trunc('milliseconds',now())
        WHERE id=$1 RETURNING *`, [value.id, value.title ?? existing.title, value.body ?? existing.body, value.important ?? existing.important, value.pinned ?? existing.pinned,
        status, value.action === "publish" ? 1 : 0, ownerContext.ownerId, value.mutationId, hash])).rows[0]
      : (await client.query(`INSERT INTO announcements(id,title,body,important,pinned,status,publication_version,published_at,created_by,updated_by,last_mutation_id,last_mutation_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $7=1 THEN date_trunc('milliseconds',now()) ELSE NULL END,$8,$8,$9,$10) RETURNING *`, [value.id, value.title, value.body, value.important, value.pinned, status,
        value.action === "publish" ? 1 : 0, ownerContext.ownerId, value.mutationId, hash])).rows[0];
    await client.query("INSERT INTO announcement_events(id,announcement_id,actor_id,action,version) VALUES($1,$2,$3,$4,$5)", [randomUUID(), value.id, ownerContext.ownerId, value.action, next.version]);
    return { item: announcementDto(next, true), changed: true, notify: status === "published" || existing?.status === "published" };
  });
}
export async function interactWithAnnouncement({ pool, ownerContext, id, action, input }) {
  id = announcementId(id);
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== (action === "like" ? "liked" : "publicationVersion"))) throw invalidAnnouncement();
  if (action === "like" && typeof input.liked !== "boolean") throw invalidAnnouncement();
  const revision = action === "view" ? publicationVersion(input.publicationVersion) : null;
  return transaction(pool, async (client) => {
    await authorizeAnnouncements(client, ownerContext);
    const row = (await client.query("SELECT publication_version FROM announcements WHERE id=$1 AND status='published' FOR SHARE", [id])).rows[0];
    if (!row) throw new AnnouncementError("ANNOUNCEMENT_NOT_FOUND", "这条公告已撤回或不存在。", 404);
    if (action === "like") {
      if (input.liked) await client.query("INSERT INTO announcement_likes(announcement_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, ownerContext.ownerId]);
      else await client.query("DELETE FROM announcement_likes WHERE announcement_id=$1 AND owner_id=$2", [id, ownerContext.ownerId]);
      return { liked: input.liked };
    }
    if (revision !== row.publication_version) throw new AnnouncementError("ANNOUNCEMENT_CONFLICT", "公告内容已更新，请读取最新内容。", 409);
    await client.query(`INSERT INTO announcement_reads(announcement_id,owner_id,publication_version) VALUES($1,$2,$3) ON CONFLICT(announcement_id,owner_id)
      DO UPDATE SET publication_version=excluded.publication_version,last_read_at=now() WHERE announcement_reads.publication_version<excluded.publication_version`, [id, ownerContext.ownerId, revision]);
    return { id, publicationVersion: revision, read: true };
  });
}
export async function announcementStatistics({ pool, ownerContext, id }) {
  id = announcementId(id);
  return transaction(pool, async (client) => {
    await authorizeAnnouncements(client, ownerContext, true);
    const result = await client.query(`SELECT a.id,(SELECT count(*) FROM announcement_reads r WHERE r.announcement_id=a.id) AS views,
      (SELECT count(*) FROM announcement_likes l WHERE l.announcement_id=a.id) AS likes FROM announcements a WHERE a.id=$1`, [id]);
    if (!result.rowCount) throw new AnnouncementError("ANNOUNCEMENT_NOT_FOUND", "公告不存在。", 404);
    return { id, viewCount: Number(result.rows[0].views), likeCount: Number(result.rows[0].likes) };
  });
}
