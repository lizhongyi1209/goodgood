import { organizationAccessDeniedError } from "./errors.mjs";

const MANAGER_ROLES = new Set(["org_owner", "org_admin"]);

export async function resolveWorkspaceAccess(
  client,
  { manager = false, ownerId, workspaceId = null, write = false },
) {
  const result = await client.query(
    `SELECT w.id AS workspace_id, w.kind, w.name, w.status,
            m.id AS membership_id, m.role AS membership_role,
            m.status AS membership_status
       FROM users u
       JOIN workspaces w ON w.id = COALESCE(
         $2::uuid,
         (SELECT pw.id FROM workspaces pw
           WHERE pw.kind = 'personal' AND pw.personal_owner_id = u.id)
       )
       LEFT JOIN workspace_memberships m
         ON m.workspace_id = w.id AND m.owner_id = u.id
      WHERE u.id = $1 AND u.status = 'active' AND w.status = 'active'
        AND (
          (w.kind = 'personal' AND w.personal_owner_id = u.id)
          OR (w.kind = 'organization' AND m.status = 'active')
        )
      ${write ? "FOR UPDATE OF w" : ""}`,
    [ownerId, workspaceId],
  );
  const row = result.rows[0];
  if (
    !row ||
    (manager &&
      (row.kind !== "organization" ||
        !MANAGER_ROLES.has(row.membership_role)))
  ) {
    throw organizationAccessDeniedError();
  }
  return {
    id: row.workspace_id,
    kind: row.kind,
    membershipId: row.membership_id ?? null,
    name: row.name,
    role:
      row.kind === "personal" ? "personal_owner" : row.membership_role,
    status: row.status,
  };
}
