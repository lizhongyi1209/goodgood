import { randomUUID } from "node:crypto";
import { normalizeEmailAddress } from "../auth/email-policy.mjs";
import {
  OrganizationError,
  invitationUnavailableError,
  organizationAccessDeniedError,
  organizationConflictError,
  organizationIdempotencyConflictError,
} from "./errors.mjs";

const MANAGER_ROLES = new Set(["org_owner", "org_admin"]);
const ORGANIZATION_ROLES = new Set(["org_owner", "org_admin", "org_member"]);
const INVITABLE_ROLES = new Set(["org_admin", "org_member"]);
const MEMBER_STATUSES = new Set(["active", "suspended", "removed"]);

export function normalizeOrganizationEmail(value) {
  try {
    return normalizeEmailAddress(value).normalizedEmail;
  } catch {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "请输入有效的员工邮箱。",
      400,
    );
  }
}

function workspaceFromRow(row) {
  return {
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
    kind: row.kind,
    membershipId: row.membership_id ?? null,
    membershipStatus: row.membership_status ?? null,
    name: row.name,
    role: row.membership_role ?? (row.kind === "personal" ? "personal_owner" : null),
    status: row.status,
  };
}

function membershipFromRow(row) {
  return {
    activatedAt: new Date(row.activated_at).toISOString(),
    email: row.email,
    id: row.id,
    ownerId: row.owner_id,
    role: row.role,
    status: row.status,
    updatedAt: new Date(row.updated_at).toISOString(),
    version: Number(row.version),
    workspaceId: row.workspace_id,
  };
}

function invitationFromRow(row) {
  return {
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    email: row.normalized_email,
    expiresAt: new Date(row.expires_at).toISOString(),
    id: row.id,
    membershipId: row.membership_id ?? null,
    role: row.intended_role,
    status: row.status,
    workspaceId: row.workspace_id,
  };
}

export async function runOrganizationTransaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function lockOperation(client, actorOwnerId, idempotencyKey) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`organization:${actorOwnerId}:${idempotencyKey}`],
  );
}

async function assertSiteOwner(client, actorOwnerId) {
  const result = await client.query(
    `SELECT 1
       FROM system_role_assignments
      WHERE owner_id = $1 AND role = 'site_owner'
      LIMIT 1`,
    [actorOwnerId],
  );
  if (!result.rowCount) throw organizationAccessDeniedError();
}

async function assertOrganizationManager(client, workspaceId, actorOwnerId) {
  const result = await client.query(
    `SELECT w.id AS workspace_id, w.name, w.status AS workspace_status,
            m.id AS membership_id, m.role, m.status AS membership_status
       FROM workspaces w
       JOIN workspace_memberships m ON m.workspace_id = w.id
      WHERE w.id = $1 AND w.kind = 'organization'
        AND m.owner_id = $2
      FOR UPDATE OF w, m`,
    [workspaceId, actorOwnerId],
  );
  const manager = result.rows[0];
  if (
    !manager ||
    manager.workspace_status !== "active" ||
    manager.membership_status !== "active" ||
    !MANAGER_ROLES.has(manager.role)
  ) {
    throw organizationAccessDeniedError();
  }
  return manager;
}

async function existingAudit(client, actorOwnerId, idempotencyKey) {
  const result = await client.query(
    `SELECT *
       FROM workspace_audit_events
      WHERE actor_owner_id = $1 AND idempotency_key = $2`,
    [actorOwnerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function assertReplay(event, operationHash, actionType) {
  if (
    event.operation_hash !== operationHash ||
    event.action_type !== actionType
  ) {
    throw organizationIdempotencyConflictError();
  }
}

async function readWorkspace(client, workspaceId, membershipId = null) {
  const values = [workspaceId, membershipId];
  const result = await client.query(
    `SELECT w.*, m.id AS membership_id, m.role AS membership_role,
            m.status AS membership_status
       FROM workspaces w
       LEFT JOIN workspace_memberships m
         ON m.workspace_id = w.id AND ($2::uuid IS NULL OR m.id = $2)
      WHERE w.id = $1
      ORDER BY m.created_at ASC
      LIMIT 1`,
    values,
  );
  return result.rows[0] ? workspaceFromRow(result.rows[0]) : null;
}

async function readInvitation(client, invitationId) {
  const result = await client.query(
    "SELECT * FROM workspace_invitations WHERE id = $1",
    [invitationId],
  );
  return result.rows[0] ? invitationFromRow(result.rows[0]) : null;
}

async function readMembership(client, membershipId) {
  const result = await client.query(
    `SELECT m.*, COALESCE(b.display_email, u.email) AS email
       FROM workspace_memberships m
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN auth_email_bindings b ON b.owner_id = u.id
      WHERE m.id = $1`,
    [membershipId],
  );
  return result.rows[0] ? membershipFromRow(result.rows[0]) : null;
}

async function readVerifiedOwnerEmail(client, ownerId, { lock = false } = {}) {
  const owner = await client.query(
    `SELECT u.id, u.email, u.status,
            EXISTS (
              SELECT 1 FROM auth_identities i
               WHERE i.owner_id = u.id AND i.issuer <> 'urn:goodgood:email'
            ) AS has_legacy_verified_identity
       FROM users u
      WHERE u.id = $1
      ${lock ? "FOR UPDATE OF u" : ""}`,
    [ownerId],
  );
  if (!owner.rowCount) return null;
  const binding = await client.query(
    `SELECT normalized_email, display_email
       FROM auth_email_bindings
      WHERE owner_id = $1
      ${lock ? "FOR SHARE" : ""}`,
    [ownerId],
  );
  if (binding.rowCount) {
    return {
      displayEmail: binding.rows[0].display_email,
      normalizedEmail: binding.rows[0].normalized_email,
      status: owner.rows[0].status,
    };
  }
  if (!owner.rows[0].has_legacy_verified_identity) return null;
  try {
    const email = normalizeEmailAddress(owner.rows[0].email);
    return {
      displayEmail: email.displayEmail,
      normalizedEmail: email.normalizedEmail,
      status: owner.rows[0].status,
    };
  } catch {
    return null;
  }
}

export function createOrganization(
  pool,
  {
    actorOwnerId,
    idempotencyKey,
    initialOwnerId,
    name,
    operationHash,
    reason,
  },
) {
  return runOrganizationTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await lockOperation(client, actorOwnerId, idempotencyKey);
    const replay = await existingAudit(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertReplay(replay, operationHash, "create_organization");
      return {
        created: false,
        workspace: await readWorkspace(
          client,
          replay.workspace_id,
          replay.membership_id,
        ),
      };
    }

    const target = await client.query(
      `SELECT u.id, u.status,
              EXISTS (SELECT 1 FROM auth_identities i WHERE i.owner_id = u.id)
                AS has_verified_identity
         FROM users u
        WHERE u.id = $1
        FOR UPDATE`,
      [initialOwnerId],
    );
    const principal = target.rows[0];
    if (
      !principal ||
      principal.status !== "active" ||
      !principal.has_verified_identity
    ) {
      throw new OrganizationError(
        "ORGANIZATION_PRINCIPAL_INVALID",
        "企业负责人必须先完成身份验证并通过账户审核。",
        409,
      );
    }

    const workspaceId = randomUUID();
    const membershipId = randomUUID();
    await client.query(
      `INSERT INTO workspaces (
         id, kind, name, status, personal_owner_id, created_by_owner_id
       ) VALUES ($1, 'organization', $2, 'active', NULL, $3)`,
      [workspaceId, name, actorOwnerId],
    );
    await client.query(
      `INSERT INTO workspace_memberships (
         id, workspace_id, owner_id, role, status, invited_by_owner_id
       ) VALUES ($1, $2, $3, 'org_owner', 'active', $4)`,
      [membershipId, workspaceId, initialOwnerId, actorOwnerId],
    );
    await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, target_owner_id, membership_id,
         action_type, reason, idempotency_key, operation_hash, metadata
       ) VALUES ($1, $2, $3, $4, $5, 'create_organization', $6, $7, $8, $9)`,
      [
        randomUUID(),
        workspaceId,
        actorOwnerId,
        initialOwnerId,
        membershipId,
        reason,
        idempotencyKey,
        operationHash,
        { name },
      ],
    );
    return {
      created: true,
      workspace: await readWorkspace(client, workspaceId, membershipId),
    };
  });
}

export async function listOwnerWorkspaces(pool, ownerId) {
  const result = await pool.query(
    `SELECT w.*, m.id AS membership_id, m.role AS membership_role,
            m.status AS membership_status
       FROM workspaces w
       LEFT JOIN workspace_memberships m
         ON m.workspace_id = w.id AND m.owner_id = $1
      WHERE (w.kind = 'personal' AND w.personal_owner_id = $1)
         OR (w.kind = 'organization' AND m.status IN ('active', 'suspended'))
      ORDER BY CASE WHEN w.kind = 'personal' THEN 0 ELSE 1 END,
               lower(w.name), w.id`,
    [ownerId],
  );
  return result.rows.map(workspaceFromRow);
}

export async function listPendingOrganizationInvitations(pool, actorOwnerId) {
  const actor = await readVerifiedOwnerEmail(pool, actorOwnerId);
  if (!actor || actor.status !== "active") return [];
  const result = await pool.query(
    `SELECT i.*, w.name AS workspace_name
       FROM workspace_invitations i
       JOIN workspaces w ON w.id = i.workspace_id
      WHERE i.normalized_email = $1
        AND i.status = 'pending' AND i.expires_at > now()
        AND w.kind = 'organization' AND w.status = 'active'
      ORDER BY i.created_at DESC, i.id DESC`,
    [actor.normalizedEmail],
  );
  return result.rows.map((row) => ({
    ...invitationFromRow(row),
    workspaceName: row.workspace_name,
  }));
}

export function inviteOrganizationMember(
  pool,
  {
    actorOwnerId,
    email,
    expiresAt,
    idempotencyKey,
    intendedRole,
    operationHash,
    reason,
    workspaceId,
  },
) {
  if (!INVITABLE_ROLES.has(intendedRole)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "邀请角色无效。",
      400,
    );
  }
  const normalizedEmail = normalizeOrganizationEmail(email);
  return runOrganizationTransaction(pool, async (client) => {
    await lockOperation(client, actorOwnerId, idempotencyKey);
    await assertOrganizationManager(client, workspaceId, actorOwnerId);
    const replay = await existingAudit(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertReplay(replay, operationHash, "invite_member");
      return {
        created: false,
        invitation: await readInvitation(client, replay.invitation_id),
      };
    }

    await client.query(
      `UPDATE workspace_invitations
          SET status = 'expired', updated_at = now()
        WHERE workspace_id = $1 AND normalized_email = $2
          AND status = 'pending' AND expires_at <= now()`,
      [workspaceId, normalizedEmail],
    );
    const membership = await client.query(
      `SELECT m.status
         FROM users u
         JOIN workspace_memberships m ON m.owner_id = u.id
         LEFT JOIN auth_email_bindings b ON b.owner_id = u.id
        WHERE m.workspace_id = $1
          AND (
            b.normalized_email = $2
            OR (
              b.owner_id IS NULL
              AND lower(btrim(u.email)) = $2
              AND EXISTS (
                SELECT 1 FROM auth_identities i
                 WHERE i.owner_id = u.id AND i.issuer <> 'urn:goodgood:email'
              )
            )
          )
        FOR UPDATE OF m`,
      [workspaceId, normalizedEmail],
    );
    if (membership.rows[0]?.status !== "removed" && membership.rowCount) {
      throw organizationConflictError("该员工已经属于这个企业。");
    }
    const pending = await client.query(
      `SELECT 1 FROM workspace_invitations
        WHERE workspace_id = $1 AND normalized_email = $2
          AND status = 'pending' AND expires_at > now()
        LIMIT 1`,
      [workspaceId, normalizedEmail],
    );
    if (pending.rowCount) {
      throw organizationConflictError("该邮箱已有一份待接受的企业邀请。");
    }

    const invitationId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO workspace_invitations (
         id, workspace_id, normalized_email, intended_role, status,
         invited_by_owner_id, idempotency_key, operation_hash, expires_at
       ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
       RETURNING *`,
      [
        invitationId,
        workspaceId,
        normalizedEmail,
        intendedRole,
        actorOwnerId,
        idempotencyKey,
        operationHash,
        expiresAt,
      ],
    );
    await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, invitation_id, action_type,
         reason, idempotency_key, operation_hash, metadata
       ) VALUES ($1, $2, $3, $4, 'invite_member', $5, $6, $7, $8)`,
      [
        randomUUID(),
        workspaceId,
        actorOwnerId,
        invitationId,
        reason,
        idempotencyKey,
        operationHash,
        { intendedRole },
      ],
    );
    return { created: true, invitation: invitationFromRow(inserted.rows[0]) };
  });
}

export function acceptOrganizationInvitation(
  pool,
  { actorOwnerId, idempotencyKey, invitationId, operationHash },
) {
  return runOrganizationTransaction(pool, async (client) => {
    await lockOperation(client, actorOwnerId, idempotencyKey);
    const replay = await existingAudit(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertReplay(replay, operationHash, "accept_invitation");
      return {
        created: false,
        membership: await readMembership(client, replay.membership_id),
      };
    }

    const inviteResult = await client.query(
      `SELECT i.*, w.kind AS workspace_kind, w.status AS workspace_status
         FROM workspace_invitations i
         JOIN workspaces w ON w.id = i.workspace_id
        WHERE i.id = $1
        FOR UPDATE OF i, w`,
      [invitationId],
    );
    const invitation = inviteResult.rows[0];
    if (
      !invitation ||
      invitation.workspace_kind !== "organization" ||
      invitation.workspace_status !== "active" ||
      invitation.status !== "pending" ||
      new Date(invitation.expires_at).getTime() <= Date.now()
    ) {
      throw invitationUnavailableError();
    }

    const actor = await readVerifiedOwnerEmail(client, actorOwnerId, {
      lock: true,
    });
    if (
      !actor ||
      actor.status !== "active" ||
      actor.normalizedEmail !== invitation.normalized_email
    ) {
      throw invitationUnavailableError();
    }

    const existing = await client.query(
      `SELECT * FROM workspace_memberships
        WHERE workspace_id = $1 AND owner_id = $2
        FOR UPDATE`,
      [invitation.workspace_id, actorOwnerId],
    );
    let membershipId;
    if (!existing.rowCount) {
      membershipId = randomUUID();
      await client.query(
        `INSERT INTO workspace_memberships (
           id, workspace_id, owner_id, role, status, invited_by_owner_id
         ) VALUES ($1, $2, $3, $4, 'active', $5)`,
        [
          membershipId,
          invitation.workspace_id,
          actorOwnerId,
          invitation.intended_role,
          invitation.invited_by_owner_id,
        ],
      );
    } else if (existing.rows[0].status === "removed") {
      membershipId = existing.rows[0].id;
      await client.query(
        `UPDATE workspace_memberships
            SET role = $2, status = 'active', activated_at = now(),
                ended_at = NULL, version = version + 1, updated_at = now()
          WHERE id = $1`,
        [membershipId, invitation.intended_role],
      );
      await client.query(
        `UPDATE member_budgets
            SET status = 'active', version = version + 1, updated_at = now()
          WHERE membership_id = $1 AND status = 'closed'`,
        [membershipId],
      );
    } else {
      throw organizationConflictError("该员工已经属于这个企业。");
    }

    await client.query(
      `UPDATE workspace_invitations
          SET status = 'accepted', accepted_by_owner_id = $2,
              membership_id = $3, accepted_at = now(), updated_at = now()
        WHERE id = $1`,
      [invitationId, actorOwnerId, membershipId],
    );
    await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, target_owner_id, membership_id,
         invitation_id, action_type, reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $3, $4, $5, 'accept_invitation',
                 'accept invitation', $6, $7)`,
      [
        randomUUID(),
        invitation.workspace_id,
        actorOwnerId,
        membershipId,
        invitationId,
        idempotencyKey,
        operationHash,
      ],
    );
    return {
      created: true,
      membership: await readMembership(client, membershipId),
    };
  });
}

export function revokeOrganizationInvitation(
  pool,
  {
    actorOwnerId,
    idempotencyKey,
    invitationId,
    operationHash,
    reason,
    workspaceId,
  },
) {
  return runOrganizationTransaction(pool, async (client) => {
    await lockOperation(client, actorOwnerId, idempotencyKey);
    await assertOrganizationManager(client, workspaceId, actorOwnerId);
    const replay = await existingAudit(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertReplay(replay, operationHash, "revoke_invitation");
      return { created: false, invitation: await readInvitation(client, invitationId) };
    }
    const updated = await client.query(
      `UPDATE workspace_invitations
          SET status = 'revoked', revoked_at = now(), updated_at = now()
        WHERE id = $1 AND workspace_id = $2 AND status = 'pending'
          AND expires_at > now()
      RETURNING *`,
      [invitationId, workspaceId],
    );
    if (!updated.rowCount) throw invitationUnavailableError();
    await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, invitation_id, action_type,
         reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $4, 'revoke_invitation', $5, $6, $7)`,
      [
        randomUUID(),
        workspaceId,
        actorOwnerId,
        invitationId,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    return { created: true, invitation: invitationFromRow(updated.rows[0]) };
  });
}

export function changeOrganizationMembership(
  pool,
  {
    actorOwnerId,
    expectedVersion,
    idempotencyKey,
    membershipId,
    nextRole,
    nextStatus,
    operationHash,
    reason,
    workspaceId,
  },
) {
  if (!ORGANIZATION_ROLES.has(nextRole) || !MEMBER_STATUSES.has(nextStatus)) {
    throw new OrganizationError(
      "ORGANIZATION_REQUEST_INVALID",
      "成员角色或状态无效。",
      400,
    );
  }
  return runOrganizationTransaction(pool, async (client) => {
    await lockOperation(client, actorOwnerId, idempotencyKey);
    const manager = await assertOrganizationManager(
      client,
      workspaceId,
      actorOwnerId,
    );
    const replay = await existingAudit(client, actorOwnerId, idempotencyKey);
    if (replay) {
      const actionType = replay.action_type;
      if (
        replay.operation_hash !== operationHash ||
        !new Set([
          "change_member_role",
          "suspend_member",
          "restore_member",
          "remove_member",
        ]).has(actionType)
      ) {
        throw organizationIdempotencyConflictError();
      }
      return {
        actionType,
        created: false,
        membership: await readMembership(client, replay.membership_id),
      };
    }
    const reusedBudgetKey = await client.query(
      `SELECT 1 FROM member_budget_events
        WHERE workspace_id = $1 AND idempotency_key = $2
        LIMIT 1`,
      [workspaceId, idempotencyKey],
    );
    if (reusedBudgetKey.rowCount) {
      throw organizationIdempotencyConflictError();
    }
    const targetResult = await client.query(
      `SELECT m.*, COALESCE(b.display_email, u.email) AS email
         FROM workspace_memberships m
         JOIN users u ON u.id = m.owner_id
         LEFT JOIN auth_email_bindings b ON b.owner_id = u.id
        WHERE m.id = $1 AND m.workspace_id = $2
        FOR UPDATE OF m`,
      [membershipId, workspaceId],
    );
    const target = targetResult.rows[0];
    if (!target || target.status === "removed") {
      throw organizationAccessDeniedError();
    }
    if (Number(target.version) !== Number(expectedVersion)) {
      throw new OrganizationError(
        "MEMBERSHIP_CONFLICT",
        "成员信息已更新，请刷新后重试。",
        409,
      );
    }
    const roleChanged = target.role !== nextRole;
    const statusChanged = target.status !== nextStatus;
    if (Number(roleChanged) + Number(statusChanged) !== 1) {
      throw organizationConflictError("一次只能修改成员角色或成员状态。");
    }
    if (
      manager.role === "org_admin" &&
      (target.role === "org_owner" || nextRole === "org_owner")
    ) {
      throw organizationAccessDeniedError();
    }
    if (
      target.role === "org_owner" &&
      (nextRole !== "org_owner" || nextStatus !== "active")
    ) {
      const owners = await client.query(
        `SELECT count(*)::integer AS count
           FROM workspace_memberships
          WHERE workspace_id = $1 AND role = 'org_owner'
            AND status = 'active' AND id <> $2`,
        [workspaceId, membershipId],
      );
      if (Number(owners.rows[0]?.count ?? 0) < 1) {
        throw new OrganizationError(
          "ORGANIZATION_OWNER_REQUIRED",
          "企业必须至少保留一名有效负责人。",
          409,
        );
      }
    }
    const actionType = roleChanged
      ? "change_member_role"
      : nextStatus === "active"
        ? "restore_member"
        : nextStatus === "suspended"
          ? "suspend_member"
          : "remove_member";
    const updated = await client.query(
      `UPDATE workspace_memberships
          SET role = $2, status = $3,
              ended_at = CASE WHEN $3 = 'removed' THEN now() ELSE NULL END,
              version = version + 1, updated_at = now()
        WHERE id = $1 AND version = $4
      RETURNING *`,
      [membershipId, nextRole, nextStatus, expectedVersion],
    );
    if (!updated.rowCount) {
      throw new OrganizationError(
        "MEMBERSHIP_CONFLICT",
        "成员信息已更新，请刷新后重试。",
        409,
      );
    }
    if (nextStatus === "removed") {
      const budgetResult = await client.query(
        `SELECT b.*, a.id AS account_id, a.allocated_balance
           FROM member_budgets b
           JOIN workspace_credit_accounts a
             ON a.workspace_id = b.workspace_id AND a.unit = 'credit-cny-cent'
          WHERE b.workspace_id = $1 AND b.membership_id = $2
            AND b.status = 'active'
          FOR UPDATE OF b, a`,
        [workspaceId, membershipId],
      );
      const budget = budgetResult.rows[0];
      if (budget) {
        const reclaimable =
          BigInt(budget.credit_limit) -
          BigInt(budget.settled_usage) -
          BigInt(budget.reserved_usage);
        const accountUpdate = await client.query(
          `UPDATE workspace_credit_accounts
              SET allocated_balance = allocated_balance - $2,
                  version = version + 1, updated_at = now()
            WHERE id = $1 AND allocated_balance >= $2
          RETURNING id`,
          [budget.account_id, reclaimable.toString()],
        );
        if (!accountUpdate.rowCount) {
          throw organizationConflictError("企业额度投影不一致，无法移除成员。");
        }
        await client.query(
          `UPDATE member_budgets
              SET credit_limit = settled_usage + reserved_usage,
                  status = 'closed', version = version + 1, updated_at = now()
            WHERE id = $1`,
          [budget.id],
        );
        if (reclaimable > 0n) {
          await client.query(
            `INSERT INTO member_budget_events (
               id, workspace_id, member_budget_id, event_type, amount,
               actor_owner_id, actor, reason, idempotency_key, operation_hash,
               metadata
             ) VALUES ($1, $2, $3, 'reclaim', $4, $5,
                       'organization_manager', $6, $7, $8, $9::jsonb)`,
            [
              randomUUID(),
              workspaceId,
              budget.id,
              reclaimable.toString(),
              actorOwnerId,
              reason,
              idempotencyKey,
              operationHash,
              JSON.stringify({ cause: "membership_removed" }),
            ],
          );
        }
      }
    }
    await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, target_owner_id, membership_id,
         action_type, reason, idempotency_key, operation_hash, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        workspaceId,
        actorOwnerId,
        target.owner_id,
        membershipId,
        actionType,
        reason,
        idempotencyKey,
        operationHash,
        {
          previousRole: target.role,
          previousStatus: target.status,
          resultingRole: nextRole,
          resultingStatus: nextStatus,
        },
      ],
    );
    return {
      actionType,
      created: true,
      membership: membershipFromRow({ ...target, ...updated.rows[0] }),
    };
  });
}

export async function listOrganizationManagement(pool, { actorOwnerId, workspaceId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const manager = await assertOrganizationManager(
      client,
      workspaceId,
      actorOwnerId,
    );
    const workspace = await readWorkspace(
      client,
      workspaceId,
      manager.membership_id,
    );
    const members = await client.query(
      `SELECT m.*, COALESCE(b.display_email, u.email) AS email
         FROM workspace_memberships m
         JOIN users u ON u.id = m.owner_id
         LEFT JOIN auth_email_bindings b ON b.owner_id = u.id
        WHERE m.workspace_id = $1 AND m.status <> 'removed'
        ORDER BY CASE m.role
                   WHEN 'org_owner' THEN 0
                   WHEN 'org_admin' THEN 1
                   ELSE 2
                 END,
                 lower(COALESCE(b.display_email, u.email)), m.id`,
      [workspaceId],
    );
    const invitations = await client.query(
      `SELECT * FROM workspace_invitations
        WHERE workspace_id = $1 AND status = 'pending'
          AND expires_at > now()
        ORDER BY created_at DESC, id DESC`,
      [workspaceId],
    );
    await client.query("COMMIT");
    return {
      invitations: invitations.rows.map(invitationFromRow),
      members: members.rows.map(membershipFromRow),
      workspace,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
