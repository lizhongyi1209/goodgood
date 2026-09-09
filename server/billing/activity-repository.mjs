import { createHash } from "node:crypto";
import { BillingPersistenceError } from "./repository.mjs";

const ACTIVITY_ENTRY_TYPES = new Set([
  "grant",
  "reserve",
  "refund",
  "expire",
  "adjust",
]);
const ACTIVITY_REFERENCE_PREFIX = "goodgood-credit-activity-v1:";

function exactAmount(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  throw new BillingPersistenceError(
    "CREDIT_ACTIVITY_UNAVAILABLE",
    "积分记录暂时无法读取，请稍后重试。",
    503,
  );
}

function publicActivityId(id) {
  return `act_${createHash("md5")
    .update(`${ACTIVITY_REFERENCE_PREFIX}${id}`)
    .digest("hex")}`;
}

function promptPreview(value) {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  const characters = Array.from(normalized);
  return characters.length > 120
    ? `${characters.slice(0, 120).join("")}…`
    : normalized;
}

function grantKind(row) {
  if (row.related_payment_ref) return "purchase";
  if (row.metadata?.campaign === "welcome-v1" || row.reason === "welcome_grant_v1") {
    return "welcome";
  }
  if (row.metadata?.grantKind === "seed_test_credit") return "promotion";
  return "credit";
}

function generationFromRow(row) {
  if (
    !row.model_id ||
    !row.resolution ||
    ![1, 2, 4].includes(Number(row.requested_count))
  ) {
    return null;
  }
  return {
    count: Number(row.requested_count),
    modelId: row.model_id,
    promptPreview: promptPreview(row.prompt),
    resolution: row.resolution,
    resultAssetId: row.result_asset_id ?? null,
  };
}

function activityFromRow(row) {
  if (!ACTIVITY_ENTRY_TYPES.has(row.entry_type)) {
    throw new BillingPersistenceError(
      "CREDIT_ACTIVITY_UNAVAILABLE",
      "积分记录暂时无法读取，请稍后重试。",
      503,
    );
  }
  const amount = exactAmount(row.amount);
  const absoluteAmount = amount < 0n ? -amount : amount;
  const base = {
    completedAt: null,
    creditAmount: absoluteAmount.toString(),
    generation: null,
    id: publicActivityId(row.id),
    occurredAt: new Date(row.created_at).toISOString(),
    unit: row.unit,
  };

  if (row.entry_type === "reserve") {
    const closeType = row.close_entry_type ?? null;
    return {
      ...base,
      amount: closeType === "release" ? "0" : amount.toString(),
      completedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
      generation: generationFromRow(row),
      kind: "generation",
      status:
        closeType === "settle"
          ? "spent"
          : closeType === "release"
            ? "released"
            : "processing",
    };
  }
  if (row.entry_type === "grant") {
    return {
      ...base,
      amount: amount.toString(),
      kind: grantKind(row),
      status: "credited",
    };
  }
  if (row.entry_type === "refund") {
    return {
      ...base,
      amount: amount.toString(),
      generation: generationFromRow(row),
      kind: "refund",
      status: "refunded",
    };
  }
  if (row.entry_type === "expire") {
    return {
      ...base,
      amount: amount.toString(),
      kind: "expiration",
      status: "expired",
    };
  }
  return {
    ...base,
    amount: amount.toString(),
    kind: "adjustment",
    status: "adjusted",
  };
}

async function resolveCursor(pool, { activityId, createdAt }, ownerId) {
  const digest = activityId.replace(/^act_/, "");
  const result = await pool.query(
    `SELECT id, created_at
       FROM credit_ledger_entries
      WHERE owner_id = $1
        AND created_at = $2::timestamptz
        AND entry_type IN ('grant', 'reserve', 'refund', 'expire', 'adjust')
        AND md5('${ACTIVITY_REFERENCE_PREFIX}' || id::text) = $3
      LIMIT 1`,
    [ownerId, createdAt, digest],
  );
  if (!result.rowCount) {
    throw new BillingPersistenceError(
      "CREDIT_ACTIVITY_REQUEST_INVALID",
      "分页标识无效，请刷新后重试。",
      400,
    );
  }
  return result.rows[0];
}

export async function listCreditActivities(
  pool,
  { cursor = null, filter = "all", limit = 20, ownerId },
) {
  const resolvedCursor = cursor ? await resolveCursor(pool, cursor, ownerId) : null;
  const result = await pool.query(
    `SELECT entry.id, entry.entry_type, entry.amount, entry.reason,
            entry.related_payment_ref, entry.metadata, entry.created_at,
            account.unit,
            closing.entry_type AS close_entry_type,
            closing.created_at AS closed_at,
            batch.model_id, batch.resolution, batch.requested_count, batch.prompt,
            result_asset.id AS result_asset_id
       FROM credit_ledger_entries entry
       JOIN credit_accounts account
         ON account.id = entry.account_id AND account.owner_id = entry.owner_id
       LEFT JOIN LATERAL (
         SELECT closure.entry_type, closure.created_at
           FROM credit_ledger_entries closure
          WHERE closure.prior_entry_id = entry.id
            AND closure.entry_type IN ('settle', 'release')
          LIMIT 1
       ) closing ON entry.entry_type = 'reserve'
       LEFT JOIN generation_jobs job
         ON job.id = entry.related_job_id AND job.owner_id = entry.owner_id
       LEFT JOIN generation_batches batch
         ON batch.id = job.batch_id AND batch.owner_id = entry.owner_id
       LEFT JOIN LATERAL (
         SELECT asset.id
           FROM assets asset
          WHERE asset.job_id = entry.related_job_id
            AND asset.owner_id = entry.owner_id
            AND asset.moderation_state = 'accepted'
          ORDER BY asset.ordinal ASC
          LIMIT 1
       ) result_asset ON true
      WHERE entry.owner_id = $1
        AND entry.entry_type IN ('grant', 'reserve', 'refund', 'expire', 'adjust')
        AND (
          $2::text = 'all'
          OR ($2 = 'spend' AND (
            (entry.entry_type = 'reserve' AND COALESCE(closing.entry_type, 'open') IN ('open', 'settle'))
            OR entry.entry_type = 'expire'
            OR (entry.entry_type = 'adjust' AND entry.amount < 0)
          ))
          OR ($2 = 'receive' AND (
            entry.entry_type = 'grant'
            OR (entry.entry_type = 'adjust' AND entry.amount > 0)
          ))
          OR ($2 = 'return' AND (
            (entry.entry_type = 'reserve' AND closing.entry_type = 'release')
            OR entry.entry_type = 'refund'
          ))
        )
        AND (
          $3::timestamptz IS NULL
          OR (entry.created_at, entry.id) < ($3::timestamptz, $4::uuid)
        )
      ORDER BY entry.created_at DESC, entry.id DESC
      LIMIT $5`,
    [
      ownerId,
      filter,
      resolvedCursor?.created_at ?? null,
      resolvedCursor?.id ?? null,
      limit + 1,
    ],
  );
  const hasMore = result.rows.length > limit;
  const selected = result.rows.slice(0, limit);
  return {
    items: selected.map(activityFromRow),
    next: hasMore
      ? {
          activityId: publicActivityId(selected.at(-1).id),
          createdAt: new Date(selected.at(-1).created_at).toISOString(),
        }
      : null,
  };
}
