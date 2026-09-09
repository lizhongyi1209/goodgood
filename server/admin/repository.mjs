import { randomUUID } from "node:crypto";
import {
  grantCreditsInTransaction,
  runCreditTransaction,
} from "../billing/repository.mjs";
import { AdministrationError, adminAccessDeniedError } from "./errors.mjs";

function accountFromRow(row) {
  return {
    accountTier: row.account_tier,
    availableCredits: String(row.available_balance ?? 0),
    businessRole: row.business_role ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    directParentEmail: row.direct_parent_email ?? null,
    directParentId: row.direct_parent_id ?? null,
    email: row.email,
    id: row.id,
    lastAuthenticatedAt: row.last_authenticated_at
      ? new Date(row.last_authenticated_at).toISOString()
      : null,
    reservedCredits: String(row.reserved_balance ?? 0),
    role: row.is_site_owner ? "site_owner" : "member",
    status: row.status,
    transferableCredits: String(row.payment_funded_available_balance ?? 0),
  };
}

function actionFromRow(row) {
  return {
    actionType: row.action_type,
    actorEmail: row.actor_email,
    createdAt: new Date(row.created_at).toISOString(),
    creditAmount: row.credit_amount === null ? null : String(row.credit_amount),
    id: row.id,
    previousBusinessRole: row.previous_business_role,
    previousParentEmail: row.previous_parent_email ?? null,
    previousStatus: row.previous_status,
    reason: row.reason,
    resultingStatus: row.resulting_status,
    resultingBusinessRole: row.resulting_business_role,
    resultingParentEmail: row.resulting_parent_email ?? null,
    targetEmail: row.target_email,
  };
}

async function assertSiteOwner(client, actorOwnerId) {
  const role = await client.query(
    `SELECT 1
       FROM system_role_assignments
      WHERE owner_id = $1 AND role = 'site_owner'
      LIMIT 1`,
    [actorOwnerId],
  );
  if (!role.rowCount) throw adminAccessDeniedError();
}

export async function listManagedAccounts(
  pool,
  { cursor = null, limit, query = null, status = null },
) {
  const values = [status, query, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1];
  const result = await pool.query(
    `SELECT u.id, u.email, u.status, u.account_tier, u.created_at,
            identity.last_authenticated_at,
            COALESCE(account.available_balance, 0) AS available_balance,
            COALESCE(account.reserved_balance, 0) AS reserved_balance,
            COALESCE(account.payment_funded_available_balance, 0)
              AS payment_funded_available_balance,
            business_role.role AS business_role,
            relationship.parent_owner_id AS direct_parent_id,
            parent.email AS direct_parent_email,
            EXISTS (
              SELECT 1 FROM system_role_assignments role
               WHERE role.owner_id = u.id AND role.role = 'site_owner'
            ) AS is_site_owner
       FROM users u
       LEFT JOIN LATERAL (
         SELECT max(last_authenticated_at) AS last_authenticated_at
           FROM auth_identities
          WHERE owner_id = u.id
       ) identity ON true
       LEFT JOIN credit_accounts account
         ON account.owner_id = u.id AND account.unit = 'credit'
       LEFT JOIN business_role_assignments business_role
         ON business_role.owner_id = u.id AND business_role.ended_at IS NULL
       LEFT JOIN account_relationships relationship
         ON relationship.child_owner_id = u.id AND relationship.ended_at IS NULL
       LEFT JOIN users parent ON parent.id = relationship.parent_owner_id
      WHERE ($1::text IS NULL OR u.status = $1)
        AND ($2::text IS NULL OR lower(u.email) LIKE '%' || lower($2) || '%')
        AND (
          $3::timestamptz IS NULL
          OR (u.created_at, u.id) < ($3::timestamptz, $4::uuid)
        )
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $5`,
    values,
  );
  const hasMore = result.rows.length > limit;
  const selected = result.rows.slice(0, limit);
  return {
    hasMore,
    items: selected.map(accountFromRow),
    next: hasMore
      ? {
          createdAt: new Date(selected.at(-1).created_at).toISOString(),
          id: selected.at(-1).id,
        }
      : null,
  };
}

export async function readAccountStatusCounts(pool) {
  const result = await pool.query(
    `SELECT status, count(*)::integer AS count
       FROM users
      GROUP BY status`,
  );
  const counts = { active: 0, pending: 0, suspended: 0 };
  for (const row of result.rows) counts[row.status] = Number(row.count);
  return counts;
}

export async function listRecentAdministrativeActions(pool, { limit = 30 } = {}) {
  const result = await pool.query(
    `SELECT action.*, actor.email AS actor_email, target.email AS target_email,
            previous_parent.email AS previous_parent_email,
            resulting_parent.email AS resulting_parent_email
       FROM administrative_actions action
       JOIN users actor ON actor.id = action.actor_owner_id
       JOIN users target ON target.id = action.target_owner_id
       LEFT JOIN users previous_parent
         ON previous_parent.id = action.previous_parent_owner_id
       LEFT JOIN users resulting_parent
         ON resulting_parent.id = action.resulting_parent_owner_id
      ORDER BY action.created_at DESC, action.id DESC
      LIMIT $1`,
    [limit],
  );
  return result.rows.map(actionFromRow);
}

function hierarchyReplay(replay) {
  return replay.action_type === "set_business_role"
    ? {
        actionType: replay.action_type,
        businessRole: replay.resulting_business_role,
        created: false,
      }
    : {
        actionType: replay.action_type,
        created: false,
        directParentId: replay.resulting_parent_owner_id,
      };
}

export function setBusinessRole(
  pool,
  { actorOwnerId, businessRole, idempotencyKey, operationHash, reason, targetOwnerId },
) {
  return runCreditTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`administration:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingAction(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertMatchingReplay(replay, operationHash);
      return hierarchyReplay(replay);
    }
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["account-hierarchy:mutate"],
    );

    const target = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [targetOwnerId],
    );
    if (!target.rowCount) {
      throw new AdministrationError(
        "ADMIN_ACCOUNT_NOT_FOUND",
        "没有找到该账户。",
        404,
      );
    }
    const currentResult = await client.query(
      `SELECT * FROM business_role_assignments
        WHERE owner_id = $1 AND ended_at IS NULL
        FOR UPDATE`,
      [targetOwnerId],
    );
    const current = currentResult.rows[0] ?? null;
    if ((current?.role ?? null) === businessRole) {
      throw new AdministrationError(
        "ADMIN_BUSINESS_ROLE_UNCHANGED",
        "该账户已经是这个业务身份，请刷新后重试。",
        409,
      );
    }

    if (current) {
      await client.query(
        `UPDATE business_role_assignments
            SET ended_at = now(), ended_by_owner_id = $2, end_reason = $3,
                ended_idempotency_key = $4, ended_operation_hash = $5
          WHERE id = $1`,
        [current.id, actorOwnerId, reason, idempotencyKey, operationHash],
      );
    }
    const assignmentId = businessRole ? randomUUID() : current.id;
    if (businessRole) {
      await client.query(
        `INSERT INTO business_role_assignments (
           id, owner_id, role, assigned_by_owner_id, assignment_reason,
           assigned_idempotency_key, assigned_operation_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          assignmentId,
          targetOwnerId,
          businessRole,
          actorOwnerId,
          reason,
          idempotencyKey,
          operationHash,
        ],
      );
    }
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         previous_business_role, resulting_business_role,
         business_role_assignment_id, reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, 'set_business_role', $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        actorOwnerId,
        targetOwnerId,
        current?.role ?? null,
        businessRole,
        assignmentId,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    return { actionType: "set_business_role", businessRole, created: true };
  });
}

export function setDirectParent(
  pool,
  {
    actorOwnerId,
    idempotencyKey,
    operationHash,
    parentOwnerId,
    reason,
    targetOwnerId,
  },
) {
  return runCreditTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`administration:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingAction(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertMatchingReplay(replay, operationHash);
      return hierarchyReplay(replay);
    }
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["account-hierarchy:mutate"],
    );

    const ownerIds = parentOwnerId
      ? [targetOwnerId, parentOwnerId].sort()
      : [targetOwnerId];
    const owners = await client.query(
      `SELECT id FROM users WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [ownerIds],
    );
    if (!owners.rows.some((row) => row.id === targetOwnerId)) {
      throw new AdministrationError(
        "ADMIN_ACCOUNT_NOT_FOUND",
        "没有找到该账户。",
        404,
      );
    }
    if (parentOwnerId && !owners.rows.some((row) => row.id === parentOwnerId)) {
      throw new AdministrationError(
        "ADMIN_PARENT_NOT_FOUND",
        "没有找到要设置的直属上级。",
        404,
      );
    }
    if (parentOwnerId === targetOwnerId) {
      throw new AdministrationError(
        "ADMIN_RELATIONSHIP_SELF_FORBIDDEN",
        "账户不能成为自己的直属上级。",
        409,
      );
    }
    if (parentOwnerId) {
      const parentRole = await client.query(
        `SELECT role FROM business_role_assignments
          WHERE owner_id = $1 AND ended_at IS NULL`,
        [parentOwnerId],
      );
      if (!parentRole.rowCount) {
        throw new AdministrationError(
          "ADMIN_PARENT_BUSINESS_ROLE_REQUIRED",
          "直属上级必须先具有企业或分销商业务身份。",
          409,
        );
      }
    }

    const currentResult = await client.query(
      `SELECT * FROM account_relationships
        WHERE child_owner_id = $1 AND ended_at IS NULL
        FOR UPDATE`,
      [targetOwnerId],
    );
    const current = currentResult.rows[0] ?? null;
    if ((current?.parent_owner_id ?? null) === parentOwnerId) {
      throw new AdministrationError(
        "ADMIN_RELATIONSHIP_UNCHANGED",
        "该账户已经属于这个直属上级，请刷新后重试。",
        409,
      );
    }
    if (parentOwnerId) {
      const cycle = await client.query(
        `WITH RECURSIVE descendants(owner_id) AS (
           SELECT child_owner_id
             FROM account_relationships
            WHERE parent_owner_id = $1 AND ended_at IS NULL
           UNION
           SELECT relationship.child_owner_id
             FROM account_relationships relationship
             JOIN descendants
               ON relationship.parent_owner_id = descendants.owner_id
            WHERE relationship.ended_at IS NULL
         )
         SELECT 1 FROM descendants WHERE owner_id = $2 LIMIT 1`,
        [targetOwnerId, parentOwnerId],
      );
      if (cycle.rowCount) {
        throw new AdministrationError(
          "ADMIN_RELATIONSHIP_CYCLE",
          "该直属关系会形成循环，无法保存。",
          409,
        );
      }
    }

    if (current) {
      await client.query(
        `UPDATE account_relationships
            SET ended_at = now(), ended_by_owner_id = $2, end_reason = $3,
                ended_idempotency_key = $4, ended_operation_hash = $5
          WHERE id = $1`,
        [current.id, actorOwnerId, reason, idempotencyKey, operationHash],
      );
    }
    const relationshipId = parentOwnerId ? randomUUID() : current.id;
    if (parentOwnerId) {
      await client.query(
        `INSERT INTO account_relationships (
           id, parent_owner_id, child_owner_id, created_by_owner_id,
           relationship_reason, created_idempotency_key, created_operation_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          relationshipId,
          parentOwnerId,
          targetOwnerId,
          actorOwnerId,
          reason,
          idempotencyKey,
          operationHash,
        ],
      );
    }
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         previous_parent_owner_id, resulting_parent_owner_id,
         account_relationship_id, reason, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, 'set_direct_parent', $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        actorOwnerId,
        targetOwnerId,
        current?.parent_owner_id ?? null,
        parentOwnerId,
        relationshipId,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    return { actionType: "set_direct_parent", created: true, directParentId: parentOwnerId };
  });
}

async function existingAction(client, actorOwnerId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM administrative_actions
      WHERE actor_owner_id = $1 AND idempotency_key = $2`,
    [actorOwnerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

function assertMatchingReplay(existing, operationHash) {
  if (existing.operation_hash !== operationHash) {
    throw new AdministrationError(
      "ADMIN_IDEMPOTENCY_CONFLICT",
      "该操作标识已经用于另一项管理操作。",
      409,
    );
  }
}

export function changeAccountAccess(
  pool,
  { actorOwnerId, idempotencyKey, operationHash, reason, targetOwnerId, toStatus },
) {
  return runCreditTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`administration:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingAction(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertMatchingReplay(replay, operationHash);
      return {
        actionType: replay.action_type,
        created: false,
        status: replay.resulting_status,
      };
    }
    const targetResult = await client.query(
      `SELECT id, status
         FROM users
        WHERE id = $1
        FOR UPDATE`,
      [targetOwnerId],
    );
    const target = targetResult.rows[0];
    if (!target) {
      throw new AdministrationError(
        "ADMIN_ACCOUNT_NOT_FOUND",
        "没有找到该账户。",
        404,
      );
    }
    if (target.id === actorOwnerId && toStatus === "suspended") {
      throw new AdministrationError(
        "ADMIN_SELF_SUSPEND_FORBIDDEN",
        "站长不能暂停自己的账户。",
        409,
      );
    }
    const actionType =
      target.status === "pending" && toStatus === "active"
        ? "approve_account"
        : target.status === "suspended" && toStatus === "active"
          ? "restore_account"
          : target.status === "active" && toStatus === "suspended"
            ? "suspend_account"
            : null;
    if (!actionType) {
      throw new AdministrationError(
        "ADMIN_STATUS_TRANSITION_INVALID",
        "当前账户状态不支持这项操作，请刷新后重试。",
        409,
      );
    }
    await client.query(
      `UPDATE users SET status = $2, updated_at = now() WHERE id = $1`,
      [targetOwnerId, toStatus],
    );
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         previous_status, resulting_status, reason,
         idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        actorOwnerId,
        targetOwnerId,
        actionType,
        target.status,
        toStatus,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    return { actionType, created: true, status: toStatus };
  });
}

export function grantTestCredits(
  pool,
  {
    actorOwnerId,
    amount,
    idempotencyKey,
    ledgerIdempotencyKey,
    operationHash,
    reason,
    targetOwnerId,
  },
) {
  return runCreditTransaction(pool, async (client) => {
    await assertSiteOwner(client, actorOwnerId);
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`administration:${actorOwnerId}:${idempotencyKey}`],
    );
    const replay = await existingAction(client, actorOwnerId, idempotencyKey);
    if (replay) {
      assertMatchingReplay(replay, operationHash);
      const account = await client.query(
        `SELECT available_balance, reserved_balance
           FROM credit_accounts
          WHERE owner_id = $1 AND unit = 'credit'`,
        [targetOwnerId],
      );
      return {
        availableCredits: String(account.rows[0]?.available_balance ?? 0),
        created: false,
        grantedCredits: String(replay.credit_amount),
        reservedCredits: String(account.rows[0]?.reserved_balance ?? 0),
      };
    }
    const target = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [targetOwnerId],
    );
    if (!target.rowCount) {
      throw new AdministrationError(
        "ADMIN_ACCOUNT_NOT_FOUND",
        "没有找到该账户。",
        404,
      );
    }
    const actionId = randomUUID();
    const grant = await grantCreditsInTransaction(client, {
      actor: "operator",
      amount,
      idempotencyKey: ledgerIdempotencyKey,
      metadata: {
        administrativeActionId: actionId,
        actorOwnerId,
        grantKind: "seed_test_credit",
      },
      ownerId: targetOwnerId,
      reason,
    });
    await client.query(
      `INSERT INTO administrative_actions (
         id, actor_owner_id, target_owner_id, action_type,
         credit_amount, credit_ledger_entry_id, reason,
         idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, 'grant_test_credits', $4, $5, $6, $7, $8)`,
      [
        actionId,
        actorOwnerId,
        targetOwnerId,
        String(amount),
        grant.entry.id,
        reason,
        idempotencyKey,
        operationHash,
      ],
    );
    return {
      availableCredits: grant.account.availableBalance.toString(),
      created: true,
      grantedCredits: String(amount),
      reservedCredits: grant.account.reservedBalance.toString(),
    };
  });
}
