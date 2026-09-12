import { randomUUID } from "node:crypto";
import { exactCreditAmount } from "../billing/policy.mjs";
import { organizationIdempotencyConflictError } from "./errors.mjs";
import { runOrganizationTransaction } from "./repository.mjs";
import { resolveWorkspaceAccess } from "./workspace-access.mjs";

export function readOrganizationAssetForDownload(
  pool,
  {
    actorOwnerId,
    assetId,
    idempotencyKey,
    operationHash,
    workspaceId,
  },
) {
  return runOrganizationTransaction(pool, async (client) => {
    const workspace = await resolveWorkspaceAccess(client, {
      manager: true,
      ownerId: actorOwnerId,
      workspaceId,
      write: true,
    });
    const result = await client.query(
      `SELECT a.id, a.object_key, a.creator_owner_id
         FROM assets a
         JOIN generation_jobs j
           ON j.id = a.job_id AND j.workspace_id = a.workspace_id
        WHERE a.id = $1 AND a.workspace_id = $2
          AND j.state = 'succeeded' AND a.moderation_state = 'accepted'
        FOR UPDATE OF a`,
      [assetId, workspace.id],
    );
    const asset = result.rows[0];
    if (!asset) return null;
    const audit = await client.query(
      `INSERT INTO workspace_audit_events (
         id, workspace_id, actor_owner_id, target_owner_id, action_type,
         reason, idempotency_key, operation_hash, metadata
       ) VALUES ($1, $2, $3, $4, 'download_organization_asset',
                 'download organization asset', $5, $6, $7::jsonb)
       ON CONFLICT (actor_owner_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        randomUUID(),
        workspace.id,
        actorOwnerId,
        asset.creator_owner_id,
        idempotencyKey,
        operationHash,
        JSON.stringify({ assetId: asset.id }),
      ],
    );
    if (!audit.rowCount) {
      const replay = await client.query(
        `SELECT workspace_id, action_type, operation_hash, metadata
           FROM workspace_audit_events
          WHERE actor_owner_id = $1 AND idempotency_key = $2`,
        [actorOwnerId, idempotencyKey],
      );
      const event = replay.rows[0];
      if (
        !event ||
        event.workspace_id !== workspace.id ||
        event.action_type !== "download_organization_asset" ||
        event.operation_hash !== operationHash ||
        event.metadata?.assetId !== asset.id
      ) {
        throw organizationIdempotencyConflictError();
      }
    }
    return asset;
  });
}

export async function listOrganizationMemberBudgets(
  pool,
  { actorOwnerId, workspaceId },
) {
  const workspace = await resolveWorkspaceAccess(pool, {
    manager: true,
    ownerId: actorOwnerId,
    workspaceId,
  });
  const result = await pool.query(
    `SELECT m.id AS membership_id, m.owner_id, m.role, m.status,
            COALESCE(eb.display_email, u.email) AS email,
            b.id AS budget_id, b.credit_limit, b.settled_usage,
            b.reserved_usage, b.version, b.status AS budget_status
       FROM workspace_memberships m
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN auth_email_bindings eb ON eb.owner_id = u.id
       LEFT JOIN member_budgets b
         ON b.workspace_id = m.workspace_id AND b.membership_id = m.id
      WHERE m.workspace_id = $1
      ORDER BY CASE m.role
                 WHEN 'org_owner' THEN 0
                 WHEN 'org_admin' THEN 1
                 ELSE 2
               END,
               lower(COALESCE(eb.display_email, u.email)), m.id`,
    [workspace.id],
  );
  return result.rows.map((row) => {
    const creditLimit = exactCreditAmount(row.credit_limit ?? 0);
    const settledUsage = exactCreditAmount(row.settled_usage ?? 0);
    const reservedUsage = exactCreditAmount(row.reserved_usage ?? 0);
    return {
      budgetId: row.budget_id ?? null,
      budgetStatus: row.budget_status ?? null,
      creditLimit,
      email: row.email,
      membershipId: row.membership_id,
      membershipStatus: row.status,
      ownerId: row.owner_id,
      remainingBalance: creditLimit - settledUsage - reservedUsage,
      reservedUsage,
      role: row.role,
      settledUsage,
      version: row.version == null ? null : exactCreditAmount(row.version),
    };
  });
}

export async function listOrganizationUsage(
  pool,
  { actorOwnerId, limit = 100, workspaceId },
) {
  const workspace = await resolveWorkspaceAccess(pool, {
    manager: true,
    ownerId: actorOwnerId,
    workspaceId,
  });
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new TypeError("limit must be an integer from 1 to 500.");
  }
  const result = await pool.query(
    `SELECT e.id, e.related_job_id, -e.amount AS credit_amount,
            e.created_at, m.id AS membership_id, m.owner_id,
            COALESCE(eb.display_email, u.email) AS email,
            j.state AS job_state, b.model_id, b.resolution,
            b.requested_count, b.prompt
       FROM workspace_credit_ledger_entries e
       JOIN member_budgets mb
         ON mb.id = e.member_budget_id AND mb.workspace_id = e.workspace_id
       JOIN workspace_memberships m
         ON m.id = mb.membership_id AND m.workspace_id = mb.workspace_id
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN auth_email_bindings eb ON eb.owner_id = u.id
       JOIN generation_jobs j
         ON j.id = e.related_job_id AND j.workspace_id = e.workspace_id
       JOIN generation_batches b
         ON b.id = j.batch_id AND b.workspace_id = j.workspace_id
      WHERE e.workspace_id = $1 AND e.entry_type = 'settle'
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $2`,
    [workspace.id, limit],
  );
  return result.rows.map((row) => ({
    count: row.requested_count,
    createdAt: new Date(row.created_at).toISOString(),
    creditAmount: exactCreditAmount(row.credit_amount),
    email: row.email,
    id: row.id,
    jobId: row.related_job_id,
    jobState: row.job_state,
    membershipId: row.membership_id,
    modelId: row.model_id,
    ownerId: row.owner_id,
    prompt: row.prompt,
    resolution: row.resolution,
  }));
}
