import { randomUUID } from "node:crypto";
import {
  exactCreditAmount,
  positiveCreditAmount,
} from "../billing/policy.mjs";
import {
  OrganizationError,
  memberBudgetConflictError,
  memberBudgetInsufficientError,
  memberBudgetUnavailableError,
  organizationAccessDeniedError,
  organizationCreditInsufficientError,
  organizationCreditReservationClosedError,
  organizationCreditUnavailableError,
  organizationIdempotencyConflictError,
} from "./errors.mjs";
import { runOrganizationTransaction } from "./repository.mjs";

const MANAGER_ROLES = new Set(["org_owner", "org_admin"]);
const SETTLEMENT_ACTORS = new Set(["system", "worker"]);

function requireText(value, fieldName, minimum = 1, maximum = 200) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw new TypeError(
      `${fieldName} must contain ${minimum} to ${maximum} characters.`,
    );
  }
  return value;
}

function requireIdempotencyKey(value) {
  return requireText(value, "idempotencyKey", 8, 200);
}

function requireOperationHash(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new TypeError("operationHash must be a 64-character hexadecimal hash.");
  }
  return value;
}

function nonnegativeCreditAmount(value, fieldName) {
  const amount = exactCreditAmount(value, fieldName);
  if (amount < 0n) throw new RangeError(`${fieldName} cannot be negative.`);
  return amount;
}

function requireSettlementActor(value) {
  const actor = value ?? "worker";
  if (!SETTLEMENT_ACTORS.has(actor)) {
    throw new TypeError("Enterprise credit settlement requires a worker actor.");
  }
  return actor;
}

function accountFromRow(row) {
  if (!row) return null;
  const availableBalance = exactCreditAmount(row.available_balance);
  const reservedBalance = exactCreditAmount(row.reserved_balance);
  const allocatedBalance = exactCreditAmount(row.allocated_balance);
  return {
    allocatedBalance,
    availableBalance,
    createdAt: new Date(row.created_at),
    id: row.id,
    reservedBalance,
    status: row.status,
    unallocatedBalance:
      availableBalance + reservedBalance - allocatedBalance,
    unit: row.unit,
    updatedAt: new Date(row.updated_at),
    version: exactCreditAmount(row.version),
    workspaceId: row.workspace_id,
  };
}

function budgetFromRow(row) {
  if (!row) return null;
  const creditLimit = exactCreditAmount(row.credit_limit);
  const reservedUsage = exactCreditAmount(row.reserved_usage);
  const settledUsage = exactCreditAmount(row.settled_usage);
  return {
    createdAt: new Date(row.created_at),
    creditLimit,
    id: row.id,
    membershipId: row.membership_id,
    remainingBalance: creditLimit - settledUsage - reservedUsage,
    reservedUsage,
    settledUsage,
    status: row.status,
    updatedAt: new Date(row.updated_at),
    version: exactCreditAmount(row.version),
    workspaceId: row.workspace_id,
  };
}

function ledgerEntryFromRow(row) {
  if (!row) return null;
  return {
    accountId: row.account_id,
    actor: row.actor,
    amount: exactCreditAmount(row.amount),
    createdAt: new Date(row.created_at),
    entryType: row.entry_type,
    id: row.id,
    idempotencyKey: row.idempotency_key,
    memberBudgetId: row.member_budget_id ?? null,
    metadata: row.metadata ?? {},
    priorEntryId: row.prior_entry_id ?? null,
    reason: row.reason,
    relatedJobId: row.related_job_id ?? null,
    workspaceId: row.workspace_id,
  };
}

async function advisoryLock(client, scope) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    scope,
  ]);
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

async function lockOrganizationWorkspace(
  client,
  workspaceId,
  { requireActive = true } = {},
) {
  const result = await client.query(
    `SELECT * FROM workspaces
      WHERE id = $1 AND kind = 'organization'
      FOR UPDATE`,
    [workspaceId],
  );
  const workspace = result.rows[0];
  if (!workspace) throw organizationAccessDeniedError();
  if (requireActive && workspace.status !== "active") {
    throw organizationCreditUnavailableError();
  }
  return workspace;
}

async function lockMembership(client, workspaceId, ownerId) {
  const result = await client.query(
    `SELECT * FROM workspace_memberships
      WHERE workspace_id = $1 AND owner_id = $2
      FOR UPDATE`,
    [workspaceId, ownerId],
  );
  const membership = result.rows[0];
  if (!membership || membership.status !== "active") {
    throw organizationAccessDeniedError();
  }
  return membership;
}

async function lockManagerMembership(client, workspaceId, ownerId) {
  const membership = await lockMembership(client, workspaceId, ownerId);
  if (!MANAGER_ROLES.has(membership.role)) {
    throw organizationAccessDeniedError();
  }
  return membership;
}

async function lockAccount(client, workspaceId, { create = false } = {}) {
  if (create) {
    await client.query(
      `INSERT INTO workspace_credit_accounts (id, workspace_id, unit)
       VALUES ($1, $2, 'credit')
       ON CONFLICT (workspace_id, unit) DO NOTHING`,
      [randomUUID(), workspaceId],
    );
  }
  const result = await client.query(
    `SELECT * FROM workspace_credit_accounts
      WHERE workspace_id = $1 AND unit = 'credit'
      FOR UPDATE`,
    [workspaceId],
  );
  const account = result.rows[0];
  if (!account || account.status !== "active") {
    throw organizationCreditUnavailableError();
  }
  return account;
}

async function lockBudget(client, workspaceId, membershipId, { create = false } = {}) {
  if (create) {
    await client.query(
      `INSERT INTO member_budgets (id, workspace_id, membership_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (membership_id) DO NOTHING`,
      [randomUUID(), workspaceId, membershipId],
    );
  }
  const result = await client.query(
    `SELECT * FROM member_budgets
      WHERE workspace_id = $1 AND membership_id = $2
      FOR UPDATE`,
    [workspaceId, membershipId],
  );
  const budget = result.rows[0];
  if (!budget || budget.status !== "active") {
    throw memberBudgetUnavailableError();
  }
  return budget;
}

async function findLedgerReplay(client, accountId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM workspace_credit_ledger_entries
      WHERE account_id = $1 AND idempotency_key = $2`,
    [accountId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

async function findBudgetReplay(client, workspaceId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM member_budget_events
      WHERE workspace_id = $1 AND idempotency_key = $2`,
    [workspaceId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

async function assertNoConflictingWorkspaceAudit(
  client,
  actorOwnerId,
  idempotencyKey,
) {
  const result = await client.query(
    `SELECT 1 FROM workspace_audit_events
      WHERE actor_owner_id = $1 AND idempotency_key = $2
      LIMIT 1`,
    [actorOwnerId, idempotencyKey],
  );
  if (result.rowCount) throw organizationIdempotencyConflictError();
}

function assertLedgerReplay(
  entry,
  { entryType, memberBudgetId = null, operationHash, priorEntryId = null, relatedJobId = null },
) {
  if (
    entry.operation_hash !== operationHash ||
    entry.entry_type !== entryType ||
    (entry.member_budget_id ?? null) !== memberBudgetId ||
    (entry.prior_entry_id ?? null) !== priorEntryId ||
    (entry.related_job_id ?? null) !== relatedJobId
  ) {
    throw organizationIdempotencyConflictError();
  }
}

async function insertWorkspaceAudit(
  client,
  {
    actionType,
    actorOwnerId,
    idempotencyKey,
    membershipId = null,
    metadata = {},
    operationHash,
    reason,
    targetOwnerId = null,
    workspaceId,
  },
) {
  await client.query(
    `INSERT INTO workspace_audit_events (
       id, workspace_id, actor_owner_id, target_owner_id, membership_id,
       action_type, reason, idempotency_key, operation_hash, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      randomUUID(),
      workspaceId,
      actorOwnerId,
      targetOwnerId,
      membershipId,
      actionType,
      reason,
      idempotencyKey,
      operationHash,
      JSON.stringify(metadata),
    ],
  );
}

export async function grantOrganizationCreditsInTransaction(
  client,
  {
    actorOwnerId,
    amount,
    idempotencyKey,
    metadata = {},
    operationHash,
    reason,
    workspaceId,
  },
) {
  const grantAmount = positiveCreditAmount(amount);
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = requireOperationHash(operationHash);
  const entryReason = requireText(reason, "reason", 2, 200);

  await assertSiteOwner(client, actorOwnerId);
  await advisoryLock(client, `organization-credit:${workspaceId}:${key}`);
  await lockOrganizationWorkspace(client, workspaceId);
  const account = await lockAccount(client, workspaceId, { create: true });
  const replay = await findLedgerReplay(client, account.id, key);
  if (replay) {
    assertLedgerReplay(replay, {
      entryType: "grant",
      operationHash: fingerprint,
    });
    return {
      account: accountFromRow(account),
      created: false,
      entry: ledgerEntryFromRow(replay),
    };
  }
  await assertNoConflictingWorkspaceAudit(client, actorOwnerId, key);

  const updated = await client.query(
    `UPDATE workspace_credit_accounts
        SET available_balance = available_balance + $2,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND status = 'active'
      RETURNING *`,
    [account.id, grantAmount.toString()],
  );
  if (!updated.rowCount) throw organizationCreditUnavailableError();
  const entry = await client.query(
    `INSERT INTO workspace_credit_ledger_entries (
       id, account_id, workspace_id, entry_type, amount, idempotency_key,
       operation_hash, reason, actor, metadata
     ) VALUES ($1, $2, $3, 'grant', $4, $5, $6, $7, 'site_owner', $8::jsonb)
     RETURNING *`,
    [
      randomUUID(),
      account.id,
      workspaceId,
      grantAmount.toString(),
      key,
      fingerprint,
      entryReason,
      JSON.stringify(metadata),
    ],
  );
  await insertWorkspaceAudit(client, {
    actionType: "grant_organization_credits",
    actorOwnerId,
    idempotencyKey: key,
    metadata: { ...metadata, amount: grantAmount.toString(), unit: "credit" },
    operationHash: fingerprint,
    reason: entryReason,
    workspaceId,
  });
  return {
    account: accountFromRow(updated.rows[0]),
    created: true,
    entry: ledgerEntryFromRow(entry.rows[0]),
  };
}

export function grantOrganizationCredits(pool, input) {
  return runOrganizationTransaction(pool, (client) =>
    grantOrganizationCreditsInTransaction(client, input),
  );
}

export async function setMemberBudgetInTransaction(
  client,
  {
    actorOwnerId,
    creditLimit,
    expectedVersion,
    idempotencyKey,
    membershipId,
    operationHash,
    reason,
    workspaceId,
  },
) {
  const nextLimit = nonnegativeCreditAmount(creditLimit, "creditLimit");
  const requestedVersion = nonnegativeCreditAmount(
    expectedVersion,
    "expectedVersion",
  );
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = requireOperationHash(operationHash);
  const entryReason = requireText(reason, "reason", 2, 200);

  await advisoryLock(client, `organization-budget:${workspaceId}:${key}`);
  await lockOrganizationWorkspace(client, workspaceId);
  const manager = await lockManagerMembership(
    client,
    workspaceId,
    actorOwnerId,
  );
  const replay = await findBudgetReplay(client, workspaceId, key);
  if (replay) {
    if (
      replay.operation_hash !== fingerprint ||
      !["allocate", "reclaim"].includes(replay.event_type) ||
      replay.member_budget_id == null
    ) {
      throw organizationIdempotencyConflictError();
    }
    const replayBudget = await client.query(
      "SELECT * FROM member_budgets WHERE id = $1",
      [replay.member_budget_id],
    );
    if (
      replayBudget.rows[0]?.membership_id !== membershipId ||
      replay.metadata?.nextCreditLimit !== nextLimit.toString()
    ) {
      throw organizationIdempotencyConflictError();
    }
    return {
      account: accountFromRow(await lockAccount(client, workspaceId)),
      budget: budgetFromRow(replayBudget.rows[0]),
      created: false,
      eventId: replay.id,
    };
  }
  await assertNoConflictingWorkspaceAudit(client, actorOwnerId, key);

  const account = await lockAccount(client, workspaceId);
  const targetResult = await client.query(
    `SELECT m.*, u.email
       FROM workspace_memberships m
       JOIN users u ON u.id = m.owner_id
      WHERE m.id = $1 AND m.workspace_id = $2
      FOR UPDATE OF m`,
    [membershipId, workspaceId],
  );
  const target = targetResult.rows[0];
  if (!target) {
    throw memberBudgetUnavailableError();
  }
  if (manager.role === "org_admin" && target.role === "org_owner") {
    throw organizationAccessDeniedError();
  }
  const budget = await lockBudget(client, workspaceId, membershipId, {
    create: true,
  });
  if (exactCreditAmount(budget.version) !== requestedVersion) {
    throw memberBudgetConflictError();
  }
  const currentLimit = exactCreditAmount(budget.credit_limit);
  const settledUsage = exactCreditAmount(budget.settled_usage);
  const reservedUsage = exactCreditAmount(budget.reserved_usage);
  if (nextLimit < settledUsage + reservedUsage) {
    throw memberBudgetConflictError(
      "额度不能低于已经消费和正在生成所占用的积分。",
    );
  }
  const delta = nextLimit - currentLimit;
  if (delta === 0n) {
    throw memberBudgetConflictError("员工额度没有变化。");
  }
  if (target.status !== "active" && delta > 0n) {
    throw memberBudgetUnavailableError();
  }
  const capacity =
    exactCreditAmount(account.available_balance) +
    exactCreditAmount(account.reserved_balance) -
    exactCreditAmount(account.allocated_balance);
  if (delta > 0n && capacity < delta) {
    throw organizationCreditInsufficientError();
  }

  const accountUpdate = await client.query(
    `UPDATE workspace_credit_accounts
        SET allocated_balance = allocated_balance + $2,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND status = 'active'
        AND allocated_balance + $2 >= 0
        AND allocated_balance + $2 <= available_balance + reserved_balance
      RETURNING *`,
    [account.id, delta.toString()],
  );
  if (!accountUpdate.rowCount) throw organizationCreditInsufficientError();
  const budgetUpdate = await client.query(
    `UPDATE member_budgets
        SET credit_limit = $2, version = version + 1, updated_at = now()
      WHERE id = $1 AND version = $3 AND status = 'active'
        AND $2 >= settled_usage + reserved_usage
      RETURNING *`,
    [budget.id, nextLimit.toString(), requestedVersion.toString()],
  );
  if (!budgetUpdate.rowCount) throw memberBudgetConflictError();
  const eventType = delta > 0n ? "allocate" : "reclaim";
  const event = await client.query(
    `INSERT INTO member_budget_events (
       id, workspace_id, member_budget_id, event_type, amount,
       actor_owner_id, actor, reason, idempotency_key, operation_hash, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, 'organization_manager',
               $7, $8, $9, $10::jsonb)
     RETURNING id`,
    [
      randomUUID(),
      workspaceId,
      budget.id,
      eventType,
      (delta > 0n ? delta : -delta).toString(),
      actorOwnerId,
      entryReason,
      key,
      fingerprint,
      JSON.stringify({
        nextCreditLimit: nextLimit.toString(),
        previousCreditLimit: currentLimit.toString(),
      }),
    ],
  );
  await insertWorkspaceAudit(client, {
    actionType: "set_member_budget",
    actorOwnerId,
    idempotencyKey: key,
    membershipId,
    metadata: {
      eventType,
      nextCreditLimit: nextLimit.toString(),
      previousCreditLimit: currentLimit.toString(),
    },
    operationHash: fingerprint,
    reason: entryReason,
    targetOwnerId: target.owner_id,
    workspaceId,
  });
  return {
    account: accountFromRow(accountUpdate.rows[0]),
    budget: budgetFromRow(budgetUpdate.rows[0]),
    created: true,
    eventId: event.rows[0].id,
  };
}

export function setMemberBudget(pool, input) {
  return runOrganizationTransaction(pool, (client) =>
    setMemberBudgetInTransaction(client, input),
  );
}

export async function reserveOrganizationGenerationCreditsInTransaction(
  client,
  {
    actorOwnerId,
    amount,
    idempotencyKey,
    jobId,
    metadata = {},
    operationHash,
    reason = "organization generation reservation",
    workspaceId,
  },
) {
  const reservationAmount = positiveCreditAmount(amount);
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = requireOperationHash(operationHash);
  const entryReason = requireText(reason, "reason", 2, 200);

  await advisoryLock(client, `organization-generation:${workspaceId}:${key}`);
  await lockOrganizationWorkspace(client, workspaceId);
  const membership = await lockMembership(client, workspaceId, actorOwnerId);
  const account = await lockAccount(client, workspaceId);
  const budget = await lockBudget(client, workspaceId, membership.id);
  const replay = await findLedgerReplay(client, account.id, key);
  if (replay) {
    assertLedgerReplay(replay, {
      entryType: "reserve",
      memberBudgetId: budget.id,
      operationHash: fingerprint,
      relatedJobId: jobId,
    });
    return {
      account: accountFromRow(account),
      budget: budgetFromRow(budget),
      created: false,
      entry: ledgerEntryFromRow(replay),
    };
  }
  if ((await findBudgetReplay(client, workspaceId, key)) != null) {
    throw organizationIdempotencyConflictError();
  }
  const existingJobReservation = await client.query(
    `SELECT id FROM workspace_credit_ledger_entries
      WHERE workspace_id = $1 AND related_job_id = $2 AND entry_type = 'reserve'
      LIMIT 1`,
    [workspaceId, jobId],
  );
  if (existingJobReservation.rowCount) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_EXISTS",
      "这次生成已经存在另一笔企业积分预留。",
      409,
    );
  }

  if (exactCreditAmount(account.available_balance) < reservationAmount) {
    throw organizationCreditInsufficientError();
  }
  const memberRemaining =
    exactCreditAmount(budget.credit_limit) -
    exactCreditAmount(budget.settled_usage) -
    exactCreditAmount(budget.reserved_usage);
  if (memberRemaining < reservationAmount) {
    throw memberBudgetInsufficientError();
  }

  const accountUpdate = await client.query(
    `UPDATE workspace_credit_accounts
        SET available_balance = available_balance - $2,
            reserved_balance = reserved_balance + $2,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND status = 'active' AND available_balance >= $2
      RETURNING *`,
    [account.id, reservationAmount.toString()],
  );
  if (!accountUpdate.rowCount) throw organizationCreditInsufficientError();
  const budgetUpdate = await client.query(
    `UPDATE member_budgets
        SET reserved_usage = reserved_usage + $2,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND status = 'active'
        AND credit_limit - settled_usage - reserved_usage >= $2
      RETURNING *`,
    [budget.id, reservationAmount.toString()],
  );
  if (!budgetUpdate.rowCount) throw memberBudgetInsufficientError();

  const entry = await client.query(
    `INSERT INTO workspace_credit_ledger_entries (
       id, account_id, workspace_id, member_budget_id, entry_type, amount,
       idempotency_key, operation_hash, reason, related_job_id, actor, metadata
     ) VALUES ($1, $2, $3, $4, 'reserve', $5, $6, $7, $8, $9,
               'organization_member', $10::jsonb)
     RETURNING *`,
    [
      randomUUID(),
      account.id,
      workspaceId,
      budget.id,
      (-reservationAmount).toString(),
      key,
      fingerprint,
      entryReason,
      jobId,
      JSON.stringify(metadata),
    ],
  );
  await client.query(
    `INSERT INTO member_budget_events (
       id, workspace_id, member_budget_id, credit_ledger_entry_id,
       event_type, amount, actor_owner_id, actor, related_job_id, reason,
       idempotency_key, operation_hash, metadata
     ) VALUES ($1, $2, $3, $4, 'reserve', $5, $6,
               'organization_member', $7, $8, $9, $10, $11::jsonb)`,
    [
      randomUUID(),
      workspaceId,
      budget.id,
      entry.rows[0].id,
      reservationAmount.toString(),
      actorOwnerId,
      jobId,
      entryReason,
      key,
      fingerprint,
      JSON.stringify(metadata),
    ],
  );
  return {
    account: accountFromRow(accountUpdate.rows[0]),
    budget: budgetFromRow(budgetUpdate.rows[0]),
    created: true,
    entry: ledgerEntryFromRow(entry.rows[0]),
  };
}

export function reserveOrganizationGenerationCredits(pool, input) {
  return runOrganizationTransaction(pool, (client) =>
    reserveOrganizationGenerationCreditsInTransaction(client, input),
  );
}

async function lockReservationContext(client, { jobId, workspaceId }) {
  const result = await client.query(
    `SELECT e.*,
            a.available_balance, a.reserved_balance, a.allocated_balance,
            a.status AS account_status, a.unit, a.version AS account_version,
            a.created_at AS account_created_at, a.updated_at AS account_updated_at,
            b.membership_id, b.credit_limit, b.settled_usage, b.reserved_usage,
            b.status AS budget_status, b.version AS budget_version,
            b.created_at AS budget_created_at, b.updated_at AS budget_updated_at,
            be.id AS budget_reservation_event_id
       FROM workspace_credit_ledger_entries e
       JOIN workspace_credit_accounts a
         ON a.id = e.account_id AND a.workspace_id = e.workspace_id
       JOIN member_budgets b
         ON b.id = e.member_budget_id AND b.workspace_id = e.workspace_id
       JOIN member_budget_events be
         ON be.credit_ledger_entry_id = e.id AND be.event_type = 'reserve'
      WHERE e.workspace_id = $1 AND e.related_job_id = $2
        AND e.entry_type = 'reserve'
      FOR UPDATE OF e, a, b, be`,
    [workspaceId, jobId],
  );
  if (!result.rowCount) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_NOT_FOUND",
      "没有找到这次生成对应的企业积分预留。",
      409,
    );
  }
  return result.rows[0];
}

function accountRowFromReservation(row) {
  return {
    allocated_balance: row.allocated_balance,
    available_balance: row.available_balance,
    created_at: row.account_created_at,
    id: row.account_id,
    reserved_balance: row.reserved_balance,
    status: row.account_status,
    unit: row.unit,
    updated_at: row.account_updated_at,
    version: row.account_version,
    workspace_id: row.workspace_id,
  };
}

function budgetRowFromReservation(row) {
  return {
    created_at: row.budget_created_at,
    credit_limit: row.credit_limit,
    id: row.member_budget_id,
    membership_id: row.membership_id,
    reserved_usage: row.reserved_usage,
    settled_usage: row.settled_usage,
    status: row.budget_status,
    updated_at: row.budget_updated_at,
    version: row.budget_version,
    workspace_id: row.workspace_id,
  };
}

async function closeOrganizationReservationInTransaction(
  client,
  {
    actor,
    entryType,
    idempotencyKey,
    jobId,
    metadata,
    operationHash,
    reason,
    workspaceId,
  },
) {
  const key = requireIdempotencyKey(idempotencyKey);
  const fingerprint = requireOperationHash(operationHash);
  const serverActor = requireSettlementActor(actor);
  const entryReason = requireText(reason, "reason", 2, 200);

  await advisoryLock(client, `organization-generation:${workspaceId}:${key}`);
  await lockOrganizationWorkspace(client, workspaceId, { requireActive: false });
  const reservation = await lockReservationContext(client, {
    jobId,
    workspaceId,
  });
  const replay = await findLedgerReplay(client, reservation.account_id, key);
  if (replay) {
    assertLedgerReplay(replay, {
      entryType,
      memberBudgetId: reservation.member_budget_id,
      operationHash: fingerprint,
      priorEntryId: reservation.id,
      relatedJobId: jobId,
    });
    return {
      account: accountFromRow(accountRowFromReservation(reservation)),
      budget: budgetFromRow(budgetRowFromReservation(reservation)),
      created: false,
      entry: ledgerEntryFromRow(replay),
    };
  }
  if ((await findBudgetReplay(client, workspaceId, key)) != null) {
    throw organizationIdempotencyConflictError();
  }
  const closed = await client.query(
    `SELECT id FROM workspace_credit_ledger_entries
      WHERE prior_entry_id = $1 AND entry_type IN ('settle', 'release')
      LIMIT 1`,
    [reservation.id],
  );
  if (closed.rowCount) throw organizationCreditReservationClosedError();

  const amount = -exactCreditAmount(reservation.amount);
  if (
    amount <= 0n ||
    exactCreditAmount(reservation.reserved_balance) < amount ||
    exactCreditAmount(reservation.reserved_usage) < amount
  ) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_INCONSISTENT",
      "企业积分预留状态不一致。",
      409,
    );
  }
  const settle = entryType === "settle";
  const closedBudget = reservation.budget_status === "closed";
  if (
    (settle || closedBudget) &&
    exactCreditAmount(reservation.allocated_balance) < amount
  ) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_INCONSISTENT",
      "企业积分预留状态不一致。",
      409,
    );
  }

  const accountUpdate = await client.query(
    `UPDATE workspace_credit_accounts
        SET available_balance = available_balance + $2,
            reserved_balance = reserved_balance - $3,
            allocated_balance = allocated_balance - $4,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND reserved_balance >= $3 AND allocated_balance >= $4
      RETURNING *`,
    [
      reservation.account_id,
      settle ? "0" : amount.toString(),
      amount.toString(),
      settle || closedBudget ? amount.toString() : "0",
    ],
  );
  if (!accountUpdate.rowCount) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_INCONSISTENT",
      "企业积分预留状态不一致。",
      409,
    );
  }
  const budgetUpdate = await client.query(
    `UPDATE member_budgets
        SET settled_usage = settled_usage + $2,
            reserved_usage = reserved_usage - $3,
            credit_limit = credit_limit - $4,
            version = version + 1, updated_at = now()
      WHERE id = $1 AND reserved_usage >= $3 AND credit_limit >= $4
      RETURNING *`,
    [
      reservation.member_budget_id,
      settle ? amount.toString() : "0",
      amount.toString(),
      !settle && closedBudget ? amount.toString() : "0",
    ],
  );
  if (!budgetUpdate.rowCount) {
    throw new OrganizationError(
      "ORGANIZATION_CREDIT_RESERVATION_INCONSISTENT",
      "员工额度预留状态不一致。",
      409,
    );
  }
  const entry = await client.query(
    `INSERT INTO workspace_credit_ledger_entries (
       id, account_id, workspace_id, member_budget_id, entry_type, amount,
       idempotency_key, operation_hash, reason, related_job_id,
       prior_entry_id, actor, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
     RETURNING *`,
    [
      randomUUID(),
      reservation.account_id,
      workspaceId,
      reservation.member_budget_id,
      entryType,
      (settle ? -amount : amount).toString(),
      key,
      fingerprint,
      entryReason,
      jobId,
      reservation.id,
      serverActor,
      JSON.stringify(metadata),
    ],
  );
  await client.query(
    `INSERT INTO member_budget_events (
       id, workspace_id, member_budget_id, credit_ledger_entry_id,
       event_type, amount, actor_owner_id, actor, related_job_id,
       prior_event_id, reason, idempotency_key, operation_hash, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, $9,
               $10, $11, $12, $13::jsonb)`,
    [
      randomUUID(),
      workspaceId,
      reservation.member_budget_id,
      entry.rows[0].id,
      entryType,
      amount.toString(),
      serverActor,
      jobId,
      reservation.budget_reservation_event_id,
      entryReason,
      key,
      fingerprint,
      JSON.stringify(metadata),
    ],
  );
  return {
    account: accountFromRow(accountUpdate.rows[0]),
    budget: budgetFromRow(budgetUpdate.rows[0]),
    created: true,
    entry: ledgerEntryFromRow(entry.rows[0]),
  };
}

export function settleOrganizationGenerationCreditsInTransaction(client, input) {
  return closeOrganizationReservationInTransaction(client, {
    actor: input.actor ?? "worker",
    entryType: "settle",
    idempotencyKey: input.idempotencyKey,
    jobId: input.jobId,
    metadata: input.metadata ?? {},
    operationHash: input.operationHash,
    reason: input.reason ?? "organization generation settlement",
    workspaceId: input.workspaceId,
  });
}

export function settleOrganizationGenerationCredits(pool, input) {
  return runOrganizationTransaction(pool, (client) =>
    settleOrganizationGenerationCreditsInTransaction(client, input),
  );
}

export function releaseOrganizationGenerationCreditsInTransaction(client, input) {
  return closeOrganizationReservationInTransaction(client, {
    actor: input.actor ?? "worker",
    entryType: "release",
    idempotencyKey: input.idempotencyKey,
    jobId: input.jobId,
    metadata: input.metadata ?? {},
    operationHash: input.operationHash,
    reason: input.reason ?? "organization generation release",
    workspaceId: input.workspaceId,
  });
}

export function releaseOrganizationGenerationCredits(pool, input) {
  return runOrganizationTransaction(pool, (client) =>
    releaseOrganizationGenerationCreditsInTransaction(client, input),
  );
}

export async function readOrganizationCreditSummary(
  pool,
  { actorOwnerId, workspaceId },
) {
  const access = await pool.query(
    `SELECT m.id AS membership_id, m.role,
            a.id AS account_id, a.workspace_id AS account_workspace_id,
            a.unit, a.available_balance, a.reserved_balance,
            a.allocated_balance, a.version AS account_version,
            a.status AS account_status, a.created_at AS account_created_at,
            a.updated_at AS account_updated_at,
            b.id AS budget_id, b.credit_limit, b.settled_usage,
            b.reserved_usage, b.version AS budget_version,
            b.status AS budget_status, b.created_at AS budget_created_at,
            b.updated_at AS budget_updated_at
       FROM workspaces w
       JOIN workspace_memberships m ON m.workspace_id = w.id
       LEFT JOIN workspace_credit_accounts a
         ON a.workspace_id = w.id AND a.unit = 'credit'
       LEFT JOIN member_budgets b
         ON b.workspace_id = w.id AND b.membership_id = m.id
      WHERE w.id = $1 AND w.kind = 'organization' AND w.status = 'active'
        AND m.owner_id = $2 AND m.status = 'active'`,
    [workspaceId, actorOwnerId],
  );
  const row = access.rows[0];
  if (!row) throw organizationAccessDeniedError();
  return {
    account: row.account_id
      ? accountFromRow({
          allocated_balance: row.allocated_balance,
          available_balance: row.available_balance,
          created_at: row.account_created_at,
          id: row.account_id,
          reserved_balance: row.reserved_balance,
          status: row.account_status,
          unit: row.unit,
          updated_at: row.account_updated_at,
          version: row.account_version,
          workspace_id: row.account_workspace_id,
        })
      : null,
    budget: row.budget_id
      ? budgetFromRow({
          created_at: row.budget_created_at,
          credit_limit: row.credit_limit,
          id: row.budget_id,
          membership_id: row.membership_id,
          reserved_usage: row.reserved_usage,
          settled_usage: row.settled_usage,
          status: row.budget_status,
          updated_at: row.budget_updated_at,
          version: row.budget_version,
          workspace_id: workspaceId,
        })
      : null,
    membership: {
      id: row.membership_id,
      role: row.role,
    },
    workspaceId,
  };
}
