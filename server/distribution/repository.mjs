import { randomUUID } from "node:crypto";
import {
  appendCreditEntryInTransaction,
  runCreditTransaction,
} from "../billing/repository.mjs";
import {
  DistributionError,
  businessRoleRequiredError,
} from "./errors.mjs";

function accountSummary(row) {
  return {
    availableCredits: String(row.available_balance ?? 0),
    reservedCredits: String(row.reserved_balance ?? 0),
    transferableCredits: String(row.payment_funded_available_balance ?? 0),
    unit: row.unit ?? "credit",
    version: String(row.version ?? 0),
  };
}

function transferFromRow(row, ownerId) {
  const outgoing = row.parent_owner_id === ownerId;
  return {
    amount: String(row.amount),
    counterpartyEmail: outgoing ? row.child_email : row.parent_email,
    counterpartyId: outgoing ? row.child_owner_id : row.parent_owner_id,
    createdAt: new Date(row.created_at).toISOString(),
    direction: outgoing ? "outgoing" : "incoming",
    id: row.public_id,
    remark: row.remark ?? null,
    unit: row.unit,
  };
}

async function assertBusinessRole(client, ownerId, { lock = false } = {}) {
  const result = await client.query(
    `SELECT account.id, account.status, assignment.role
       FROM users account
       LEFT JOIN business_role_assignments assignment
         ON assignment.owner_id = account.id AND assignment.ended_at IS NULL
      WHERE account.id = $1
      ${lock ? "FOR UPDATE OF account" : ""}`,
    [ownerId],
  );
  const owner = result.rows[0];
  if (owner?.role !== "distributor") throw businessRoleRequiredError();
  if (owner.status !== "active") {
    throw new DistributionError(
      "ACCOUNT_ACCESS_REQUIRED",
      "当前账户状态不允许分配积分。",
      409,
    );
  }
  return owner.role;
}

export async function readDistributionSummary(pool, { ownerId }) {
  const role = await assertBusinessRole(pool, ownerId);
  const result = await pool.query(
    `SELECT account.*,
            (SELECT count(*)::integer
               FROM account_relationships relationship
               JOIN users child ON child.id = relationship.child_owner_id
              WHERE relationship.parent_owner_id = $1
                AND relationship.ended_at IS NULL
                AND child.status = 'active') AS child_count
       FROM credit_accounts account
      WHERE account.owner_id = $1 AND account.unit = 'credit'`,
    [ownerId],
  );
  const account = result.rows[0];
  if (!account || account.status !== "active") {
    throw new DistributionError(
      "CREDIT_ACCOUNT_UNAVAILABLE",
      "积分账户暂时不可用，请稍后重试。",
      503,
      true,
    );
  }
  return {
    account: accountSummary(account),
    businessRole: role,
    directChildCount: Number(account.child_count ?? 0),
  };
}

export async function listDirectChildren(pool, { ownerId }) {
  await assertBusinessRole(pool, ownerId);
  const result = await pool.query(
    `SELECT child.id, child.email, child.status,
            COALESCE(allocation.total, 0) AS allocated_credits,
            allocation.last_transferred_at
       FROM account_relationships relationship
       JOIN users child
         ON child.id = relationship.child_owner_id AND child.status = 'active'
       LEFT JOIN LATERAL (
         SELECT sum(transfer.amount) AS total,
                max(transfer.created_at) AS last_transferred_at
           FROM credit_transfers transfer
          WHERE transfer.parent_owner_id = relationship.parent_owner_id
            AND transfer.child_owner_id = relationship.child_owner_id
       ) allocation ON true
      WHERE relationship.parent_owner_id = $1
        AND relationship.ended_at IS NULL
      ORDER BY child.email, child.id`,
    [ownerId],
  );
  return result.rows.map((row) => ({
    allocatedCredits: String(row.allocated_credits),
    email: row.email,
    id: row.id,
    lastTransferredAt: row.last_transferred_at
      ? new Date(row.last_transferred_at).toISOString()
      : null,
    status: row.status,
  }));
}

async function resolveTransferCursor(pool, ownerId, cursor) {
  if (!cursor) return null;
  const result = await pool.query(
    `SELECT id, created_at
       FROM credit_transfers
      WHERE public_id = $1 AND created_at = $2::timestamptz
        AND (parent_owner_id = $3 OR child_owner_id = $3)`,
    [cursor.publicId, cursor.createdAt, ownerId],
  );
  if (!result.rowCount) {
    throw new DistributionError(
      "CREDIT_TRANSFER_REQUEST_INVALID",
      "分页标识无效，请刷新后重试。",
      400,
    );
  }
  return result.rows[0];
}

export async function listCreditTransfers(
  pool,
  { cursor = null, limit = 20, ownerId },
) {
  await assertBusinessRole(pool, ownerId);
  const resolvedCursor = await resolveTransferCursor(pool, ownerId, cursor);
  const result = await pool.query(
    `SELECT transfer.*, parent.email AS parent_email, child.email AS child_email
       FROM credit_transfers transfer
       JOIN users parent ON parent.id = transfer.parent_owner_id
       JOIN users child ON child.id = transfer.child_owner_id
      WHERE (transfer.parent_owner_id = $1 OR transfer.child_owner_id = $1)
        AND (
          $2::timestamptz IS NULL
          OR (transfer.created_at, transfer.id) < ($2::timestamptz, $3::uuid)
        )
      ORDER BY transfer.created_at DESC, transfer.id DESC
      LIMIT $4`,
    [
      ownerId,
      resolvedCursor?.created_at ?? null,
      resolvedCursor?.id ?? null,
      limit + 1,
    ],
  );
  const hasMore = result.rows.length > limit;
  const selected = result.rows.slice(0, limit);
  return {
    items: selected.map((row) => transferFromRow(row, ownerId)),
    next: hasMore
      ? {
          createdAt: new Date(selected.at(-1).created_at).toISOString(),
          publicId: selected.at(-1).public_id,
        }
      : null,
  };
}

async function findExistingTransfer(client, ownerId, idempotencyKey) {
  const result = await client.query(
    `SELECT transfer.*, parent.email AS parent_email, child.email AS child_email
       FROM credit_transfers transfer
       JOIN users parent ON parent.id = transfer.parent_owner_id
       JOIN users child ON child.id = transfer.child_owner_id
      WHERE transfer.parent_owner_id = $1 AND transfer.idempotency_key = $2`,
    [ownerId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

export function createCreditTransfer(
  pool,
  {
    amount,
    childOwnerId,
    idempotencyKey,
    operationHash,
    ownerId,
    remark = null,
  },
) {
  return runCreditTransaction(pool, async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`credit-transfer:${ownerId}:${idempotencyKey}`],
    );
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["account-hierarchy:mutate"],
    );
    await assertBusinessRole(client, ownerId, { lock: true });
    const replay = await findExistingTransfer(client, ownerId, idempotencyKey);
    if (replay) {
      if (replay.operation_hash !== operationHash) {
        throw new DistributionError(
          "CREDIT_TRANSFER_IDEMPOTENCY_CONFLICT",
          "该操作标识已经用于另一笔积分划拨。",
          409,
        );
      }
      const account = await client.query(
        `SELECT * FROM credit_accounts
          WHERE owner_id = $1 AND unit = 'credit'`,
        [ownerId],
      );
      return {
        account: accountSummary(account.rows[0]),
        created: false,
        transfer: transferFromRow(replay, ownerId),
      };
    }

    const relationshipResult = await client.query(
      `SELECT relationship.id, child.email AS child_email,
              child.status AS child_status
         FROM account_relationships relationship
         JOIN users child ON child.id = relationship.child_owner_id
        WHERE relationship.parent_owner_id = $1
          AND relationship.child_owner_id = $2
          AND relationship.ended_at IS NULL
        FOR UPDATE OF relationship, child`,
      [ownerId, childOwnerId],
    );
    const relationship = relationshipResult.rows[0];
    if (!relationship) {
      throw new DistributionError(
        "DIRECT_CHILD_NOT_FOUND",
        "没有找到可分配积分的直属下级。",
        404,
      );
    }
    if (relationship.child_status !== "active") {
      throw new DistributionError(
        "ACCOUNT_ACCESS_REQUIRED",
        "直属下级当前不可接收积分。",
        409,
      );
    }

    await client.query(
      `INSERT INTO credit_accounts (id, owner_id, unit)
       VALUES ($1, $2, 'credit'), ($3, $4, 'credit')
       ON CONFLICT (owner_id, unit) DO NOTHING`,
      [randomUUID(), ownerId, randomUUID(), childOwnerId],
    );
    const accounts = await client.query(
      `SELECT * FROM credit_accounts
        WHERE owner_id = ANY($1::uuid[]) AND unit = 'credit'
        ORDER BY owner_id
        FOR UPDATE`,
      [[ownerId, childOwnerId].sort()],
    );
    const parentAccount = accounts.rows.find((row) => row.owner_id === ownerId);
    const childAccount = accounts.rows.find((row) => row.owner_id === childOwnerId);
    if (parentAccount?.status !== "active" || childAccount?.status !== "active") {
      throw new DistributionError(
        "ACCOUNT_ACCESS_REQUIRED",
        "积分账户当前不允许划拨。",
        409,
      );
    }
    if (BigInt(parentAccount.payment_funded_available_balance ?? 0) < amount) {
      throw new DistributionError(
        "INSUFFICIENT_TRANSFERABLE_POINTS",
        "可分配的充值积分不足；欢迎、测试或活动积分不能划拨。",
        409,
      );
    }

    const transferId = randomUUID();
    const publicId = `trf_${transferId.replaceAll("-", "")}`;
    const activityMetadata = {
      activityCategory: "other",
      batchReference: publicId,
    };
    const parentEntry = await appendCreditEntryInTransaction(client, {
      accountRow: parentAccount,
      actor: "owner",
      amount: -amount,
      entryType: "transfer_out",
      idempotencyKey: `credit-transfer:${publicId}:out:v1`,
      metadata: { ...activityMetadata, transferDirection: "outgoing" },
      paymentFundedAmount: -amount,
      reason: "direct_child_credit_transfer_out",
    });
    const childEntry = await appendCreditEntryInTransaction(client, {
      accountRow: childAccount,
      actor: "owner",
      amount,
      entryType: "transfer_in",
      idempotencyKey: `credit-transfer:${publicId}:in:v1`,
      metadata: { ...activityMetadata, transferDirection: "incoming" },
      paymentFundedAmount: amount,
      reason: "direct_child_credit_transfer_in",
    });
    const insertedTransfer = await client.query(
      `INSERT INTO credit_transfers (
         id, public_id, parent_owner_id, child_owner_id, relationship_id,
         unit, amount, parent_ledger_entry_id, child_ledger_entry_id,
         actor_owner_id, remark, idempotency_key, operation_hash
       ) VALUES ($1, $2, $3, $4, $5, 'credit', $6, $7, $8, $3, $9, $10, $11)
       RETURNING created_at`,
      [
        transferId,
        publicId,
        ownerId,
        childOwnerId,
        relationship.id,
        amount.toString(),
        parentEntry.entry.id,
        childEntry.entry.id,
        remark,
        idempotencyKey,
        operationHash,
      ],
    );
    return {
      account: accountSummary({
        available_balance: parentEntry.account.availableBalance,
        payment_funded_available_balance:
          parentEntry.account.paymentFundedAvailableBalance,
        reserved_balance: parentEntry.account.reservedBalance,
        unit: parentEntry.account.unit,
        version: parentEntry.account.version,
      }),
      created: true,
      transfer: {
        amount: amount.toString(),
        counterpartyEmail: relationship.child_email,
        counterpartyId: childOwnerId,
        createdAt: new Date(insertedTransfer.rows[0].created_at).toISOString(),
        direction: "outgoing",
        id: publicId,
        remark,
        unit: "credit",
      },
    };
  });
}
