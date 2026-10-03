import { createHash } from "node:crypto";
import { BillingPersistenceError } from "./repository.mjs";
import { CREDIT_UNIT, currentCreditAmount } from "../../shared/contracts/model-pricing.mjs";

const ACTIVITY_ENTRY_TYPES = new Set([
  "grant",
  "reserve",
  "refund",
  "expire",
  "adjust",
  "transfer_out",
  "transfer_in",
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

function grantKind(row) {
  if (row.related_payment_ref) return "purchase";
  if (row.metadata?.campaign === "welcome-v1" || row.reason === "welcome_grant_v1") {
    return "welcome";
  }
  if (row.metadata?.grantKind === "seed_test_credit") return "promotion";
  return "credit";
}

function metadataActivityCategory(metadata) {
  const value = metadata?.activityCategory;
  return value === "image_generation" || value === "video_generation" || value === "text_generation" || value === "image_cleanup"
    ? value
    : "other";
}

function metadataBatchReference(metadata) {
  const value = metadata?.batchReference;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 120 ? normalized : null;
}

function activityTrace(row) {
  if (row.image_job_id) {
    return {
      batchReference: row.image_job_id,
      category: "image_generation",
      taskId: row.image_job_id,
      projectId: row.activity_project_id ?? null,
      projectName: row.activity_project_name ?? null,
      modelName: row.generation_model_name ?? null,
    };
  }
  if (metadataActivityCategory(row.metadata) === "text_generation") return {
    batchReference: metadataBatchReference(row.metadata), category: "text_generation",
    taskId: row.metadata.textGenerationJobId ?? null, projectId: row.metadata.projectId ?? null,
    projectName: row.metadata.projectName ?? null, modelName: row.metadata.modelName ?? null,
  };
  if (metadataActivityCategory(row.metadata) === "image_cleanup") return {
    batchReference: metadataBatchReference(row.metadata), category: "image_cleanup",
    taskId: row.metadata.imageCleanupId ?? null, projectId: row.metadata.projectId ?? null,
    projectName: row.metadata.projectName ?? null, modelName: null,
  };
  return {
    batchReference: metadataBatchReference(row.metadata),
    category: metadataActivityCategory(row.metadata),
    taskId: null,
    projectId: null,
    projectName: null,
    modelName: null,
  };
}

function activityFromRow(row, { view = "ledger" } = {}) {
  if (!ACTIVITY_ENTRY_TYPES.has(row.entry_type)) {
    throw new BillingPersistenceError(
      "CREDIT_ACTIVITY_UNAVAILABLE",
      "积分记录暂时无法读取，请稍后重试。",
      503,
    );
  }
  const netTextCharge = view === "usage" && row.entry_type === "reserve" && row.close_entry_type === "settle"
    && metadataActivityCategory(row.metadata) === "text_generation" ? row.closing_metadata?.chargedCreditAmount : null;
  const amount = netTextCharge == null ? exactAmount(currentCreditAmount(row.amount, row.unit))
    : -exactAmount(currentCreditAmount(netTextCharge, row.unit));
  const absoluteAmount = amount < 0n ? -amount : amount;
  const trace = activityTrace(row);
  const base = {
    ...trace,
    completedAt: null,
    creditAmount: absoluteAmount.toString(),
    id: publicActivityId(row.id),
    occurredAt: new Date(row.created_at).toISOString(),
    unit: CREDIT_UNIT,
  };

  if (row.entry_type === "reserve") {
    const closeType = row.close_entry_type ?? null;
    return {
      ...base,
      amount: closeType === "release" ? "0" : amount.toString(),
      completedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
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
  if (row.entry_type === "transfer_out") {
    return {
      ...base,
      amount: amount.toString(),
      kind: "transfer_out",
      status: "spent",
    };
  }
  if (row.entry_type === "transfer_in") {
    return {
      ...base,
      amount: amount.toString(),
      kind: "transfer_in",
      status: "credited",
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
  // Public dates have millisecond precision. Recover this exact owner's row,
  // then retain SQL microseconds as text for the (timestamp, ID) page boundary.
  const result = await pool.query(
    `SELECT id, created_at::text AS created_at
       FROM credit_ledger_entries
      WHERE owner_id = $1
        AND created_at >= $2::timestamptz
        AND created_at < $2::timestamptz + interval '1 millisecond'
        AND entry_type IN ('grant', 'reserve', 'refund', 'expire', 'adjust', 'transfer_out', 'transfer_in')
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
  { cursor = null, filter = "all", limit = 20, ownerId, view = "ledger" },
) {
  const resolvedCursor = cursor ? await resolveCursor(pool, cursor, ownerId) : null;
  const result = await pool.query(
    `SELECT entry.id, entry.entry_type, entry.amount, entry.reason,
            entry.related_payment_ref, entry.metadata, entry.created_at,
            account.unit,
            closing.entry_type AS close_entry_type,
            closing.created_at AS closed_at,
            closing.metadata AS closing_metadata,
            job.id AS image_job_id,
            COALESCE(project.id, canvas.id) AS activity_project_id,
            CASE WHEN COALESCE(project.id, canvas.id) IS NOT NULL
              THEN COALESCE(batch.source_project_name, project.name, canvas.name)
            END AS activity_project_name,
            batch.catalog_model_name AS generation_model_name
       FROM credit_ledger_entries entry
       JOIN credit_accounts account
         ON account.id = entry.account_id AND account.owner_id = entry.owner_id
       LEFT JOIN LATERAL (
         SELECT closure.entry_type, closure.created_at, closure.metadata
           FROM credit_ledger_entries closure
          WHERE closure.prior_entry_id = entry.id
            AND closure.entry_type IN ('settle', 'release')
          LIMIT 1
       ) closing ON entry.entry_type = 'reserve'
       LEFT JOIN generation_jobs job
         ON job.id = entry.related_job_id AND job.owner_id = entry.owner_id
       LEFT JOIN generation_batches batch
         ON batch.id = job.batch_id AND batch.workspace_id = job.workspace_id
           AND batch.creator_owner_id = entry.owner_id
       LEFT JOIN projects project
         ON project.id = batch.project_id AND project.workspace_id = batch.workspace_id
           AND project.creator_owner_id = entry.owner_id
       LEFT JOIN canvas_projects canvas
         ON canvas.id = batch.canvas_project_id AND canvas.workspace_id = batch.workspace_id
           AND canvas.owner_id = entry.owner_id
      WHERE entry.owner_id = $1
        AND entry.reason <> 'credit_unit_exchange'
        AND entry.entry_type IN ('grant', 'reserve', 'refund', 'expire', 'adjust', 'transfer_out', 'transfer_in')
        AND (NOT $6::boolean OR (
          entry.entry_type <> 'refund'
          AND NOT (entry.entry_type = 'reserve' AND COALESCE(closing.entry_type, 'open') = 'release')
        ))
        AND (
          $2::text = 'all'
          OR ($2 = 'spend' AND (
            (entry.entry_type = 'reserve' AND COALESCE(closing.entry_type, 'open') IN ('open', 'settle'))
            OR entry.entry_type = 'expire'
            OR entry.entry_type = 'transfer_out'
            OR (entry.entry_type = 'adjust' AND entry.amount < 0)
          ))
          OR ($2 = 'receive' AND (
            entry.entry_type = 'grant'
            OR entry.entry_type = 'transfer_in'
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
      view === "usage",
    ],
  );
  const hasMore = result.rows.length > limit;
  const selected = result.rows.slice(0, limit);
  return {
    items: selected.map((row) => activityFromRow(row, { view })),
    next: hasMore
      ? {
          activityId: publicActivityId(selected.at(-1).id),
          createdAt: new Date(selected.at(-1).created_at).toISOString(),
        }
      : null,
  };
}

export async function summarizeCreditActivitySpend(
  pool,
  { ownerId, timeZone = "Asia/Shanghai" },
) {
  const result = await pool.query(
    `WITH spend AS (
       SELECT CASE
                WHEN entry.entry_type = 'reserve' AND closing.entry_type = 'settle'
                  THEN CASE WHEN entry.metadata->>'activityCategory' = 'text_generation'
                    THEN COALESCE((closing.metadata->>'chargedCreditAmount')::bigint, -entry.amount)
                    ELSE -entry.amount END
                WHEN entry.entry_type IN ('expire', 'adjust') AND entry.amount < 0
                  THEN -entry.amount
                ELSE 0
              END * CASE WHEN account.unit='credit' THEN 2 ELSE 1 END AS amount,
              CASE
                WHEN entry.entry_type = 'reserve' THEN closing.created_at
                ELSE entry.created_at
              END AS spent_at
         FROM credit_ledger_entries entry
         JOIN credit_accounts account ON account.id=entry.account_id
         LEFT JOIN LATERAL (
           SELECT closure.entry_type, closure.created_at, closure.metadata
             FROM credit_ledger_entries closure
            WHERE closure.prior_entry_id = entry.id
              AND closure.entry_type IN ('settle', 'release')
            LIMIT 1
         ) closing ON entry.entry_type = 'reserve'
        WHERE entry.owner_id = $1
          AND (
            (entry.entry_type = 'reserve' AND closing.entry_type = 'settle')
            OR (entry.entry_type IN ('expire', 'adjust') AND entry.amount < 0)
          )
     )
     SELECT COALESCE(SUM(amount) FILTER (
              WHERE spent_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE $2) AT TIME ZONE $2
            ), 0) AS today,
            COALESCE(SUM(amount) FILTER (
              WHERE spent_at >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE $2) AT TIME ZONE $2
            ), 0) AS this_week,
            COALESCE(SUM(amount) FILTER (
              WHERE spent_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE $2) AT TIME ZONE $2
            ), 0) AS this_month
       FROM spend`,
    [ownerId, timeZone],
  );
  const row = result.rows[0] ?? {};
  return {
    thisMonth: exactAmount(row.this_month ?? 0).toString(),
    thisWeek: exactAmount(row.this_week ?? 0).toString(),
    today: exactAmount(row.today ?? 0).toString(),
  };
}
