import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getGenerationResources } from "../generation/resources.mjs";
import {
  AdministrationError,
  adminAccessDeniedError,
} from "../admin/errors.mjs";

export function invitationDigest(value) {
  if (typeof value !== "string" || !/^GG-[A-Za-z0-9_-]{24}$/.test(value.trim()))
    return null;
  return createHash("sha256").update(value.trim()).digest("hex");
}

async function assertAdministrator(client, ownerContext) {
  if (
    !ownerContext?.ownerId ||
    ownerContext.systemRole !== "site_owner" ||
    ownerContext.accessStatus !== "active"
  )
    throw adminAccessDeniedError();
  const found = await client.query(
    `SELECT u.id FROM users u WHERE u.id=$1 AND u.status='active'
    AND EXISTS(SELECT 1 FROM system_role_assignments r WHERE r.owner_id=u.id AND r.role='site_owner') FOR SHARE`,
    [ownerContext.ownerId],
  );
  if (!found.rowCount) throw adminAccessDeniedError();
}

function publicInvitation(row) {
  return {
    id: row.id,
    hint: row.code_hint,
    createdAt: new Date(row.created_at).toISOString(),
    status: row.used_at ? "used" : row.revoked_at ? "revoked" : "available",
    usedAt: row.used_at ? new Date(row.used_at).toISOString() : null,
  };
}

export async function manageInvitations({
  action,
  input = {},
  ownerContext,
  idempotencyKey,
  resources = null,
}) {
  if (!["query", "create", "revoke"].includes(action))
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "邀请码操作无效。");
  if (
    action === "create" &&
    (typeof idempotencyKey !== "string" ||
      !/^[A-Za-z0-9_:-]{8,200}$/.test(idempotencyKey))
  )
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "邀请码操作标识无效。",
    );
  if (
    action === "revoke" &&
    (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id))
  )
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "邀请码标识无效。");
  const resolved = resources ?? (await getGenerationResources()),
    client = await resolved.pool.connect();
  try {
    await client.query("BEGIN");
    await assertAdministrator(client, ownerContext);
    if (action === "query") {
      const rows = await client.query(
        "SELECT * FROM registration_invitations ORDER BY created_at DESC,id DESC LIMIT 100",
      );
      const counts =
        await client.query(`SELECT count(*) FILTER(WHERE used_at IS NULL AND revoked_at IS NULL)::int AS available,
        count(*) FILTER(WHERE used_at IS NOT NULL)::int AS used,count(*) FILTER(WHERE revoked_at IS NOT NULL)::int AS revoked FROM registration_invitations`);
      await client.query("COMMIT");
      return { items: rows.rows.map(publicInvitation), counts: counts.rows[0] };
    }
    if (action === "create") {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`registration-invite:${ownerContext.ownerId}:${idempotencyKey}`],
      );
      const old = await client.query(
        "SELECT * FROM registration_invitations WHERE created_by=$1 AND idempotency_key=$2",
        [ownerContext.ownerId, idempotencyKey],
      );
      if (old.rowCount) {
        await client.query("COMMIT");
        return {
          invitation: publicInvitation(old.rows[0]),
          code: null,
          replayed: true,
        };
      }
      const code = "GG-" + randomBytes(18).toString("base64url");
      const result = await client.query(
        `INSERT INTO registration_invitations(id,code_digest,code_hint,created_by,idempotency_key)
        VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [
          randomUUID(),
          invitationDigest(code),
          code.slice(-6),
          ownerContext.ownerId,
          idempotencyKey,
        ],
      );
      await client.query("COMMIT");
      return {
        invitation: publicInvitation(result.rows[0]),
        code,
        replayed: false,
      };
    }
    const row = await client.query(
      "SELECT * FROM registration_invitations WHERE id=$1 FOR UPDATE",
      [input.id],
    );
    if (!row.rowCount)
      throw new AdministrationError(
        "INVITATION_NOT_FOUND",
        "邀请码不存在。",
        404,
      );
    if (row.rows[0].used_at)
      throw new AdministrationError(
        "INVITATION_ALREADY_USED",
        "邀请码已使用，无法停用。",
        409,
      );
    await client.query(
      "UPDATE registration_invitations SET revoked_at=COALESCE(revoked_at,now()),revoked_by=COALESCE(revoked_by,$2) WHERE id=$1",
      [input.id, ownerContext.ownerId],
    );
    await client.query("COMMIT");
    return { revoked: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
