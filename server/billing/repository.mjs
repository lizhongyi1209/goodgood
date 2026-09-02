import { createHash, randomUUID } from "node:crypto";
import {
  creditBalanceDeltas,
  exactCreditAmount,
  positiveCreditAmount,
  projectCreditBalance,
} from "./policy.mjs";

const PRODUCT_MODELS = new Set([
  "nano-banana-2",
  "nano-banana-pro",
  "gpt-image-2",
]);
const RESOLUTIONS = new Set(["1K", "2K", "4K"]);
const OUTPUT_COUNTS = new Set([1, 2, 4]);
const ACTORS = new Set(["system", "worker", "operator", "payment"]);

export const WELCOME_CREDIT_AMOUNT = 100n;
export const WELCOME_CREDIT_CAMPAIGN = "welcome-v1";

export class BillingPersistenceError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "BillingPersistenceError";
    this.code = code;
    this.status = status;
  }
}

function requireText(value, fieldName, maximum = 200) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum
  ) {
    throw new TypeError(`${fieldName} must contain 1 to ${maximum} characters.`);
  }
  return value;
}

function requireIdempotencyKey(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) {
    throw new TypeError("idempotencyKey must contain 8 to 200 characters.");
  }
  return value;
}

function requireActor(value) {
  const actor = value ?? "system";
  if (!ACTORS.has(actor)) {
    throw new TypeError("Credit mutations require a server-owned actor.");
  }
  return actor;
}

function validDate(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${fieldName} is invalid.`);
  return date;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}

function operationHash(operation) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(operation)))
    .digest("hex");
}

function accountFromRow(row) {
  return {
    availableBalance: exactCreditAmount(row.available_balance),
    createdAt: new Date(row.created_at),
    id: row.id,
    ownerId: row.owner_id,
    reservedBalance: exactCreditAmount(row.reserved_balance),
    status: row.status,
    unit: row.unit,
    updatedAt: new Date(row.updated_at),
    version: exactCreditAmount(row.version),
  };
}

function entryFromRow(row) {
  return {
    accountId: row.account_id,
    actor: row.actor,
    amount: exactCreditAmount(row.amount),
    createdAt: new Date(row.created_at),
    entryType: row.entry_type,
    id: row.id,
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata ?? {},
    ownerId: row.owner_id,
    priorEntryId: row.prior_entry_id ?? null,
    reason: row.reason,
    relatedJobId: row.related_job_id ?? null,
    relatedPaymentRef: row.related_payment_ref ?? null,
  };
}

function priceFromRow(row) {
  return {
    count: row.output_count,
    createdAt: new Date(row.created_at),
    creditAmount: exactCreditAmount(row.credit_amount),
    creditUnit: row.credit_unit,
    effectiveFrom: new Date(row.effective_from),
    effectiveUntil: row.effective_until ? new Date(row.effective_until) : null,
    id: row.id,
    modelId: row.model_id,
    planContext: row.plan_context,
    resolution: row.resolution,
    version: row.version,
  };
}

async function advisoryLock(client, scope) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    scope,
  ]);
}

export async function runCreditTransaction(pool, operation) {
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

function samePrice(existing, requested) {
  return (
    existing.model_id === requested.modelId &&
    existing.resolution === requested.resolution &&
    existing.output_count === requested.count &&
    existing.plan_context === requested.planContext &&
    existing.credit_unit === requested.creditUnit &&
    exactCreditAmount(existing.credit_amount) === requested.creditAmount &&
    new Date(existing.effective_from).getTime() ===
      requested.effectiveFrom.getTime() &&
    (existing.effective_until
      ? new Date(existing.effective_until).getTime()
      : null) ===
      (requested.effectiveUntil?.getTime() ?? null)
  );
}

export async function publishGenerationPriceVersion(
  pool,
  {
    count,
    creditAmount,
    creditUnit = "credit",
    effectiveFrom,
    effectiveUntil = null,
    id = randomUUID(),
    modelId,
    planContext = "standard",
    resolution,
    version,
  },
) {
  if (!PRODUCT_MODELS.has(modelId)) throw new TypeError("Unsupported modelId.");
  if (!RESOLUTIONS.has(resolution)) throw new TypeError("Unsupported resolution.");
  if (!OUTPUT_COUNTS.has(count)) throw new TypeError("Unsupported output count.");
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError("version must be a positive integer.");
  }
  const requested = {
    count,
    creditAmount: positiveCreditAmount(creditAmount, "creditAmount"),
    creditUnit: requireText(creditUnit, "creditUnit", 32),
    effectiveFrom: validDate(effectiveFrom, "effectiveFrom"),
    effectiveUntil: effectiveUntil
      ? validDate(effectiveUntil, "effectiveUntil")
      : null,
    modelId,
    planContext: requireText(planContext, "planContext", 64),
    resolution,
  };
  if (
    requested.effectiveUntil &&
    requested.effectiveUntil <= requested.effectiveFrom
  ) {
    throw new TypeError("effectiveUntil must be later than effectiveFrom.");
  }

  return runCreditTransaction(pool, async (client) => {
    const priceScope = [modelId, resolution, count, requested.planContext].join(":");
    await advisoryLock(client, `price:${priceScope}`);
    const existing = await client.query(
      `SELECT * FROM price_versions
        WHERE model_id = $1 AND resolution = $2 AND output_count = $3
          AND plan_context = $4 AND version = $5`,
      [modelId, resolution, count, requested.planContext, version],
    );
    if (existing.rowCount) {
      if (!samePrice(existing.rows[0], requested)) {
        throw new BillingPersistenceError(
          "PRICE_VERSION_CONFLICT",
          "The price version already exists with different terms.",
          409,
        );
      }
      return { created: false, price: priceFromRow(existing.rows[0]) };
    }

    const inserted = await client.query(
      `INSERT INTO price_versions (
         id, model_id, resolution, output_count, plan_context, version,
         credit_unit, credit_amount, effective_from, effective_until
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        modelId,
        resolution,
        count,
        requested.planContext,
        version,
        requested.creditUnit,
        requested.creditAmount.toString(),
        requested.effectiveFrom,
        requested.effectiveUntil,
      ],
    );
    return { created: true, price: priceFromRow(inserted.rows[0]) };
  });
}

export async function findActiveGenerationPrice(
  client,
  {
    at = new Date(),
    count,
    modelId,
    planContext = "standard",
    resolution,
  },
) {
  const quotedAt = validDate(at, "at");
  const result = await client.query(
    `SELECT * FROM price_versions
      WHERE model_id = $1 AND resolution = $2 AND output_count = $3
        AND plan_context = $4 AND effective_from <= $5
        AND (effective_until IS NULL OR effective_until > $5)
      ORDER BY effective_from DESC, version DESC
      LIMIT 1`,
    [modelId, resolution, count, planContext, quotedAt],
  );
  if (!result.rowCount) {
    throw new BillingPersistenceError(
      "PRICE_NOT_AVAILABLE",
      "当前生成价格暂不可用，请稍后重试。",
      409,
    );
  }
  return priceFromRow(result.rows[0]);
}

export async function findCreditAccount(
  client,
  { ownerId, unit = "credit" },
) {
  const creditUnit = requireText(unit, "unit", 32);
  const result = await client.query(
    `SELECT * FROM credit_accounts
      WHERE owner_id = $1 AND unit = $2`,
    [ownerId, creditUnit],
  );
  return result.rowCount ? accountFromRow(result.rows[0]) : null;
}

export async function listActiveGenerationPrices(
  client,
  {
    at = new Date(),
    count,
    modelId,
    planContext = "standard",
  },
) {
  const prices = [];
  for (const resolution of RESOLUTIONS) {
    prices.push(
      await findActiveGenerationPrice(client, {
        at,
        count,
        modelId,
        planContext,
        resolution,
      }),
    );
  }
  return prices;
}

async function findExistingEntry(client, accountId, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM credit_ledger_entries
      WHERE account_id = $1 AND idempotency_key = $2`,
    [accountId, idempotencyKey],
  );
  return result.rows[0] ?? null;
}

async function appendCreditEntryInTransaction(
  client,
  {
    accountRow,
    actor,
    amount,
    entryType,
    idempotencyKey,
    metadata = {},
    priorEntryId = null,
    reason,
    relatedJobId = null,
    relatedPaymentRef = null,
    verifyBeforeApply = async () => {},
  },
) {
  const signedAmount = exactCreditAmount(amount);
  const operation = {
    actor,
    amount: signedAmount.toString(),
    entryType,
    metadata,
    priorEntryId,
    reason,
    relatedJobId,
    relatedPaymentRef,
  };
  const fingerprint = operationHash(operation);
  const existing = await findExistingEntry(
    client,
    accountRow.id,
    idempotencyKey,
  );
  if (existing) {
    if (existing.operation_hash !== fingerprint) {
      throw new BillingPersistenceError(
        "CREDIT_IDEMPOTENCY_CONFLICT",
        "The credit idempotency key was already used for another operation.",
        409,
      );
    }
    return {
      account: accountFromRow(accountRow),
      created: false,
      entry: entryFromRow(existing),
    };
  }

  await verifyBeforeApply();
  const deltas = creditBalanceDeltas(entryType, signedAmount);
  const projected = projectCreditBalance(
    {
      available: accountRow.available_balance,
      reserved: accountRow.reserved_balance,
    },
    entryType,
    signedAmount,
  );
  if (!projected) {
    const insufficient = deltas.available < 0n;
    throw new BillingPersistenceError(
      insufficient
        ? "INSUFFICIENT_POINTS"
        : "CREDIT_RESERVATION_INCONSISTENT",
      insufficient
        ? "积分不足，请充值后重试。"
        : "The credit account cannot apply this operation.",
      409,
    );
  }
  if (accountRow.status !== "active") {
    throw new BillingPersistenceError(
      "CREDIT_ACCOUNT_UNAVAILABLE",
      "The credit account is not active.",
      409,
    );
  }

  const updated = await client.query(
    `UPDATE credit_accounts
        SET available_balance = available_balance + $2,
            reserved_balance = reserved_balance + $3,
            version = version + 1,
            updated_at = now()
      WHERE id = $1 AND status = 'active'
        AND available_balance + $2 >= 0
        AND reserved_balance + $3 >= 0
      RETURNING *`,
    [accountRow.id, deltas.available.toString(), deltas.reserved.toString()],
  );
  if (!updated.rowCount) {
    throw new BillingPersistenceError(
      "CREDIT_ACCOUNT_CONFLICT",
      "The credit account changed while applying the operation.",
      409,
    );
  }
  const entryId = randomUUID();
  const inserted = await client.query(
    `INSERT INTO credit_ledger_entries (
       id, account_id, owner_id, entry_type, amount, idempotency_key,
       operation_hash, reason, related_job_id, related_payment_ref,
       prior_entry_id, actor, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
     RETURNING *`,
    [
      entryId,
      accountRow.id,
      accountRow.owner_id,
      entryType,
      signedAmount.toString(),
      idempotencyKey,
      fingerprint,
      reason,
      relatedJobId,
      relatedPaymentRef,
      priorEntryId,
      actor,
      JSON.stringify(metadata),
    ],
  );
  return {
    account: accountFromRow(updated.rows[0]),
    created: true,
    entry: entryFromRow(inserted.rows[0]),
  };
}

export async function grantCreditsInTransaction(
  client,
  {
    actor = "operator",
    amount,
    idempotencyKey,
    metadata = {},
    ownerId,
    reason,
    relatedPaymentRef = null,
    unit = "credit",
  },
) {
  const grantAmount = positiveCreditAmount(amount);
  const key = requireIdempotencyKey(idempotencyKey);
  const creditUnit = requireText(unit, "unit", 32);
  const serverActor = requireActor(actor);
  const entryReason = requireText(reason, "reason", 200);
  await advisoryLock(client, `credit:${ownerId}:${key}`);
  await client.query(
    `INSERT INTO credit_accounts (id, owner_id, unit)
     VALUES ($1, $2, $3)
     ON CONFLICT (owner_id, unit) DO NOTHING`,
    [randomUUID(), ownerId, creditUnit],
  );
  const account = await client.query(
    `SELECT * FROM credit_accounts
      WHERE owner_id = $1 AND unit = $2
      FOR UPDATE`,
    [ownerId, creditUnit],
  );
  return appendCreditEntryInTransaction(client, {
    accountRow: account.rows[0],
    actor: serverActor,
    amount: grantAmount,
    entryType: "grant",
    idempotencyKey: key,
    metadata,
    reason: entryReason,
    relatedPaymentRef,
  });
}

export function grantCredits(pool, input) {
  return runCreditTransaction(pool, (client) =>
    grantCreditsInTransaction(client, input),
  );
}

export function grantWelcomeCreditsInTransaction(client, { ownerId }) {
  return grantCreditsInTransaction(client, {
    actor: "system",
    amount: WELCOME_CREDIT_AMOUNT,
    idempotencyKey: `welcome-grant:v1:${ownerId}`,
    metadata: {
      campaign: WELCOME_CREDIT_CAMPAIGN,
      images: 10,
    },
    ownerId,
    reason: "welcome_grant_v1",
    unit: "credit",
  });
}

async function loadGenerationForReservation(client, { jobId, ownerId }) {
  const result = await client.query(
    `SELECT j.id AS job_id, j.credit_reservation_entry_id,
            b.id AS batch_id, b.model_id, b.resolution, b.requested_count,
            b.price_version_id, b.quoted_credit_unit, b.quoted_credit_amount
       FROM generation_jobs j
       JOIN generation_batches b ON b.id = j.batch_id
      WHERE j.id = $1 AND j.owner_id = $2 AND b.owner_id = $2
      FOR UPDATE OF j, b`,
    [jobId, ownerId],
  );
  if (!result.rowCount) {
    throw new BillingPersistenceError(
      "GENERATION_NOT_FOUND",
      "The generation job was not found.",
      404,
    );
  }
  return result.rows[0];
}

async function loadLinkedReservation(client, reservationEntryId) {
  const result = await client.query(
    `SELECT e.*, a.available_balance, a.reserved_balance, a.status,
            a.unit, a.version, a.created_at AS account_created_at,
            a.updated_at AS account_updated_at
       FROM credit_ledger_entries e
       JOIN credit_accounts a ON a.id = e.account_id
      WHERE e.id = $1
      FOR UPDATE OF e, a`,
    [reservationEntryId],
  );
  return result.rows[0] ?? null;
}

function accountRowFromLinkedEntry(row) {
  return {
    available_balance: row.available_balance,
    created_at: row.account_created_at,
    id: row.account_id,
    owner_id: row.owner_id,
    reserved_balance: row.reserved_balance,
    status: row.status,
    unit: row.unit,
    updated_at: row.account_updated_at,
    version: row.version,
  };
}

export async function reserveGenerationCreditsInTransaction(
  client,
  {
    actor = "system",
    at = new Date(),
    idempotencyKey,
    jobId,
    metadata = {},
    ownerId,
    planContext = "standard",
    reason = "generation_reservation",
  },
) {
  const key = requireIdempotencyKey(idempotencyKey);
  const serverActor = requireActor(actor);
  const entryReason = requireText(reason, "reason", 200);
  await advisoryLock(client, `credit:${ownerId}:${key}`);
  const job = await loadGenerationForReservation(client, { jobId, ownerId });
  if (job.credit_reservation_entry_id) {
    const linked = await loadLinkedReservation(
      client,
      job.credit_reservation_entry_id,
    );
    const expectedFingerprint = linked
      ? operationHash({
          actor: serverActor,
          amount: exactCreditAmount(linked.amount).toString(),
          entryType: "reserve",
          metadata: { ...metadata, priceVersionId: job.price_version_id },
          priorEntryId: null,
          reason: entryReason,
          relatedJobId: jobId,
          relatedPaymentRef: null,
        })
      : null;
    if (
      linked?.entry_type !== "reserve" ||
      linked.related_job_id !== jobId ||
      linked.idempotency_key !== key ||
      linked.operation_hash !== expectedFingerprint
    ) {
      throw new BillingPersistenceError(
        "CREDIT_RESERVATION_EXISTS",
        "The generation already has another credit reservation.",
        409,
      );
    }
    return {
      account: accountFromRow(accountRowFromLinkedEntry(linked)),
      created: false,
      entry: entryFromRow(linked),
      price: {
        creditAmount: exactCreditAmount(job.quoted_credit_amount),
        creditUnit: job.quoted_credit_unit,
        id: job.price_version_id,
      },
    };
  }

  const price = await findActiveGenerationPrice(client, {
    at,
    count: job.requested_count,
    modelId: job.model_id,
    planContext,
    resolution: job.resolution,
  });
  const accountResult = await client.query(
    `SELECT * FROM credit_accounts
      WHERE owner_id = $1 AND unit = $2
      FOR UPDATE`,
    [ownerId, price.creditUnit],
  );
  if (!accountResult.rowCount) {
    throw new BillingPersistenceError(
      "INSUFFICIENT_POINTS",
      "积分不足，请充值后重试。",
      409,
    );
  }
  const reserved = await appendCreditEntryInTransaction(client, {
    accountRow: accountResult.rows[0],
    actor: serverActor,
    amount: -price.creditAmount,
    entryType: "reserve",
    idempotencyKey: key,
    metadata: { ...metadata, priceVersionId: price.id },
    reason: entryReason,
    relatedJobId: jobId,
  });
  await client.query(
    `UPDATE generation_batches
        SET price_version_id = $2,
            quoted_credit_unit = $3,
            quoted_credit_amount = $4,
            updated_at = now()
      WHERE id = $1 AND price_version_id IS NULL`,
    [job.batch_id, price.id, price.creditUnit, price.creditAmount.toString()],
  );
  await client.query(
    `UPDATE generation_jobs
        SET credit_reservation_entry_id = $2, updated_at = now()
      WHERE id = $1 AND credit_reservation_entry_id IS NULL`,
    [jobId, reserved.entry.id],
  );
  return { ...reserved, price };
}

export function reserveGenerationCredits(pool, input) {
  return runCreditTransaction(pool, (client) =>
    reserveGenerationCreditsInTransaction(client, input),
  );
}

async function loadReservationContext(client, { jobId, ownerId }) {
  const job = await loadGenerationForReservation(client, { jobId, ownerId });
  if (!job.credit_reservation_entry_id) {
    throw new BillingPersistenceError(
      "CREDIT_RESERVATION_NOT_FOUND",
      "The generation has no credit reservation.",
      409,
    );
  }
  const reservation = await loadLinkedReservation(
    client,
    job.credit_reservation_entry_id,
  );
  if (
    !reservation ||
    reservation.entry_type !== "reserve" ||
    reservation.related_job_id !== jobId ||
    reservation.owner_id !== ownerId
  ) {
    throw new BillingPersistenceError(
      "CREDIT_RESERVATION_INCONSISTENT",
      "The generation credit reservation is inconsistent.",
      409,
    );
  }
  return { accountRow: accountRowFromLinkedEntry(reservation), reservation };
}

async function closeReservationInTransaction(
  client,
  {
    actor,
    entryType,
    idempotencyKey,
    jobId,
    metadata,
    ownerId,
    reason,
  },
) {
  const key = requireIdempotencyKey(idempotencyKey);
  const serverActor = requireActor(actor);
  const entryReason = requireText(reason, "reason", 200);
  await advisoryLock(client, `credit:${ownerId}:${key}`);
  const context = await loadReservationContext(client, { jobId, ownerId });
  const reservationAmount = exactCreditAmount(context.reservation.amount);
  return appendCreditEntryInTransaction(client, {
    accountRow: context.accountRow,
    actor: serverActor,
    amount: entryType === "settle" ? reservationAmount : -reservationAmount,
    entryType,
    idempotencyKey: key,
    metadata,
    priorEntryId: context.reservation.id,
    reason: entryReason,
    relatedJobId: jobId,
    verifyBeforeApply: async () => {
      const closed = await client.query(
        `SELECT id FROM credit_ledger_entries
          WHERE prior_entry_id = $1 AND entry_type IN ('settle', 'release')
          LIMIT 1`,
        [context.reservation.id],
      );
      if (closed.rowCount) {
        throw new BillingPersistenceError(
          "CREDIT_RESERVATION_CLOSED",
          "The generation credit reservation is already closed.",
          409,
        );
      }
    },
  });
}

export function settleGenerationCreditsInTransaction(client, input) {
  return closeReservationInTransaction(client, {
    actor: input.actor ?? "worker",
    entryType: "settle",
    idempotencyKey: input.idempotencyKey,
    jobId: input.jobId,
    metadata: input.metadata ?? {},
    ownerId: input.ownerId,
    reason: input.reason ?? "generation_settlement",
  });
}

export function settleGenerationCredits(pool, input) {
  return runCreditTransaction(pool, (client) =>
    settleGenerationCreditsInTransaction(client, input),
  );
}

export function releaseGenerationCreditsInTransaction(client, input) {
  return closeReservationInTransaction(client, {
    actor: input.actor ?? "worker",
    entryType: "release",
    idempotencyKey: input.idempotencyKey,
    jobId: input.jobId,
    metadata: input.metadata ?? {},
    ownerId: input.ownerId,
    reason: input.reason ?? "generation_release",
  });
}

export function releaseGenerationCredits(pool, input) {
  return runCreditTransaction(pool, (client) =>
    releaseGenerationCreditsInTransaction(client, input),
  );
}

export async function refundGenerationCreditsInTransaction(
  client,
  {
    actor = "operator",
    idempotencyKey,
    jobId,
    metadata = {},
    ownerId,
    reason = "generation_refund",
  },
) {
  const key = requireIdempotencyKey(idempotencyKey);
  const serverActor = requireActor(actor);
  const entryReason = requireText(reason, "reason", 200);
  await advisoryLock(client, `credit:${ownerId}:${key}`);
  const context = await loadReservationContext(client, { jobId, ownerId });
  const settlementResult = await client.query(
    `SELECT * FROM credit_ledger_entries
      WHERE prior_entry_id = $1 AND entry_type = 'settle'
      LIMIT 1`,
    [context.reservation.id],
  );
  if (!settlementResult.rowCount) {
    throw new BillingPersistenceError(
      "CREDIT_SETTLEMENT_NOT_FOUND",
      "The generation has no settled credit to refund.",
      409,
    );
  }
  const settlement = settlementResult.rows[0];
  return appendCreditEntryInTransaction(client, {
    accountRow: context.accountRow,
    actor: serverActor,
    amount: -exactCreditAmount(settlement.amount),
    entryType: "refund",
    idempotencyKey: key,
    metadata,
    priorEntryId: settlement.id,
    reason: entryReason,
    relatedJobId: jobId,
    verifyBeforeApply: async () => {
      const refunded = await client.query(
        `SELECT id FROM credit_ledger_entries
          WHERE prior_entry_id = $1 AND entry_type = 'refund'
          LIMIT 1`,
        [settlement.id],
      );
      if (refunded.rowCount) {
        throw new BillingPersistenceError(
          "CREDIT_ALREADY_REFUNDED",
          "The generation settlement is already refunded.",
          409,
        );
      }
    },
  });
}

export function refundGenerationCredits(pool, input) {
  return runCreditTransaction(pool, (client) =>
    refundGenerationCreditsInTransaction(client, input),
  );
}
