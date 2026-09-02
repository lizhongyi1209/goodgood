import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    locale: text("locale").default("zh-CN").notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check("users_status_check", sql`${table.status} in ('active', 'disabled')`),
  ],
);

export const paymentProductVersions = pgTable(
  "payment_product_versions",
  {
    id: uuid("id").primaryKey(),
    productId: text("product_id").notNull(),
    version: integer("version").notNull(),
    currency: text("currency").notNull(),
    moneyAmountMinor: bigint("money_amount_minor", { mode: "bigint" }).notNull(),
    creditUnit: text("credit_unit").notNull(),
    creditAmount: bigint("credit_amount", { mode: "bigint" }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("payment_product_versions_product_version_unique").on(
      table.productId,
      table.version,
    ),
    index("payment_product_versions_active_lookup_idx").on(
      table.productId,
      table.effectiveFrom,
      table.version,
    ),
    check(
      "payment_product_versions_product_id_check",
      sql`length(${table.productId}) between 1 and 100`,
    ),
    check("payment_product_versions_version_check", sql`${table.version} > 0`),
    check(
      "payment_product_versions_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "payment_product_versions_money_amount_check",
      sql`${table.moneyAmountMinor} > 0`,
    ),
    check(
      "payment_product_versions_credit_unit_check",
      sql`length(${table.creditUnit}) between 1 and 32`,
    ),
    check(
      "payment_product_versions_credit_amount_check",
      sql`${table.creditAmount} > 0`,
    ),
    check(
      "payment_product_versions_effective_interval_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
  ],
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastAuthenticatedAt: timestamp("last_authenticated_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex("auth_identities_issuer_subject_unique").on(
      table.issuer,
      table.subject,
    ),
    index("auth_identities_owner_idx").on(table.ownerId),
    check(
      "auth_identities_issuer_check",
      sql`length(${table.issuer}) between 1 and 500`,
    ),
    check(
      "auth_identities_subject_check",
      sql`length(${table.subject}) between 1 and 500`,
    ),
  ],
);

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    unit: text("unit").notNull(),
    availableBalance: bigint("available_balance", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    reservedBalance: bigint("reserved_balance", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    version: bigint("version", { mode: "bigint" }).default(sql`0`).notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("credit_accounts_owner_unit_unique").on(
      table.ownerId,
      table.unit,
    ),
    uniqueIndex("credit_accounts_id_owner_unique").on(table.id, table.ownerId),
    index("credit_accounts_owner_idx").on(table.ownerId),
    check(
      "credit_accounts_unit_check",
      sql`length(${table.unit}) between 1 and 32`,
    ),
    check(
      "credit_accounts_available_balance_check",
      sql`${table.availableBalance} >= 0`,
    ),
    check(
      "credit_accounts_reserved_balance_check",
      sql`${table.reservedBalance} >= 0`,
    ),
    check("credit_accounts_version_check", sql`${table.version} >= 0`),
    check(
      "credit_accounts_status_check",
      sql`${table.status} in ('active', 'frozen', 'closed')`,
    ),
  ],
);

export const authLoginAttempts = pgTable(
  "auth_login_attempts",
  {
    id: uuid("id").primaryKey(),
    stateHash: text("state_hash").notNull(),
    browserBindingHash: text("browser_binding_hash").notNull(),
    codeVerifier: text("code_verifier").notNull(),
    nonce: text("nonce").notNull(),
    returnTo: text("return_to").default("/").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_login_attempts_state_hash_unique").on(table.stateHash),
    index("auth_login_attempts_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.consumedAt} is null`),
    check(
      "auth_login_attempts_state_hash_check",
      sql`length(${table.stateHash}) = 64`,
    ),
    check(
      "auth_login_attempts_browser_binding_hash_check",
      sql`length(${table.browserBindingHash}) = 64`,
    ),
    check(
      "auth_login_attempts_code_verifier_check",
      sql`length(${table.codeVerifier}) between 43 and 128`,
    ),
    check(
      "auth_login_attempts_nonce_check",
      sql`length(${table.nonce}) between 32 and 512`,
    ),
    check(
      "auth_login_attempts_return_to_check",
      sql`length(${table.returnTo}) between 1 and 1000 and left(${table.returnTo}, 1) = '/' and left(${table.returnTo}, 2) <> '//'`,
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authIdentityId: uuid("auth_identity_id")
      .notNull()
      .references(() => authIdentities.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_owner_active_idx")
      .on(table.ownerId, table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
    index("auth_sessions_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
    check(
      "auth_sessions_token_hash_check",
      sql`length(${table.tokenHash}) = 64`,
    ),
  ],
);

export const referenceAssets = pgTable(
  "reference_assets",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    detectedMimeType: text("detected_mime_type"),
    declaredByteSize: bigint("declared_byte_size", { mode: "number" }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }),
    pixelWidth: integer("pixel_width"),
    pixelHeight: integer("pixel_height"),
    checksum: text("checksum"),
    uploadState: text("upload_state").default("pending").notNull(),
    moderationState: text("moderation_state").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    errorCode: text("error_code"),
    cleanupEligibleAt: timestamp("cleanup_eligible_at", { withTimezone: true }),
    cleanupLeaseOwner: text("cleanup_lease_owner"),
    cleanupLeaseExpiresAt: timestamp("cleanup_lease_expires_at", { withTimezone: true }),
    cleanupAttemptCount: integer("cleanup_attempt_count").default(0).notNull(),
    cleanupLastAttemptAt: timestamp("cleanup_last_attempt_at", { withTimezone: true }),
    cleanupErrorCode: text("cleanup_error_code"),
    objectDeletedAt: timestamp("object_deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reference_assets_object_key_unique").on(table.objectKey),
    index("reference_assets_owner_created_idx").on(table.ownerId, table.createdAt),
    index("reference_assets_owner_state_idx").on(
      table.ownerId,
      table.uploadState,
      table.createdAt,
    ),
    index("reference_assets_cleanup_due_idx")
      .on(table.cleanupEligibleAt, table.id)
      .where(sql`${table.objectDeletedAt} is null`),
    check(
      "reference_assets_file_name_check",
      sql`length(${table.originalFileName}) between 1 and 255`,
    ),
    check(
      "reference_assets_declared_mime_check",
      sql`${table.declaredMimeType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "reference_assets_detected_mime_check",
      sql`${table.detectedMimeType} is null or ${table.detectedMimeType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "reference_assets_declared_byte_size_check",
      sql`${table.declaredByteSize} between 1 and 20971520`,
    ),
    check(
      "reference_assets_byte_size_check",
      sql`${table.byteSize} is null or ${table.byteSize} between 1 and 20971520`,
    ),
    check(
      "reference_assets_pixel_width_check",
      sql`${table.pixelWidth} is null or ${table.pixelWidth} between 64 and 8192`,
    ),
    check(
      "reference_assets_pixel_height_check",
      sql`${table.pixelHeight} is null or ${table.pixelHeight} between 64 and 8192`,
    ),
    check(
      "reference_assets_upload_state_check",
      sql`${table.uploadState} in ('pending', 'ready', 'rejected', 'expired')`,
    ),
    check(
      "reference_assets_moderation_state_check",
      sql`${table.moderationState} in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "reference_assets_cleanup_attempt_count_check",
      sql`${table.cleanupAttemptCount} >= 0`,
    ),
  ],
);

export const creationDrafts = pgTable(
  "creation_drafts",
  {
    ownerId: uuid("owner_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "restrict" }),
    prompt: text("prompt").default("").notNull(),
    referenceSnapshot: jsonb("reference_snapshot")
      .$type<
        readonly {
          id: string;
          name: string;
          objectKey: string;
          ordinal: number;
        }[]
      >()
      .default([])
      .notNull(),
    modelId: text("model_id").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    generationCount: integer("generation_count").notNull(),
    version: integer("version").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("creation_drafts_expiry_idx").on(table.expiresAt, table.ownerId),
    check("creation_drafts_prompt_check", sql`length(${table.prompt}) <= 4000`),
    check(
      "creation_drafts_model_check",
      sql`${table.modelId} in ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')`,
    ),
    check(
      "creation_drafts_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "creation_drafts_count_check",
      sql`${table.generationCount} in (1, 2, 4)`,
    ),
    check("creation_drafts_version_check", sql`${table.version} > 0`),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createIdempotencyKey: text("create_idempotency_key").notNull(),
    createInputHash: text("create_input_hash").notNull(),
    name: text("name").notNull(),
    prompt: text("prompt").default("").notNull(),
    referenceSnapshot: jsonb("reference_snapshot")
      .$type<
        readonly {
          id: string;
          name: string;
          objectKey: string;
          ordinal: number;
        }[]
      >()
      .default([])
      .notNull(),
    modelId: text("model_id").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    generationCount: integer("generation_count").notNull(),
    status: text("status").default("active").notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt),
    uniqueIndex("projects_owner_create_idempotency_unique").on(
      table.ownerId,
      table.createIdempotencyKey,
    ),
    check("projects_name_check", sql`length(${table.name}) between 1 and 32`),
    check("projects_prompt_check", sql`length(${table.prompt}) <= 4000`),
    check(
      "projects_model_check",
      sql`${table.modelId} in ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')`,
    ),
    check(
      "projects_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "projects_count_check",
      sql`${table.generationCount} in (1, 2, 4)`,
    ),
    check(
      "projects_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
    check("projects_version_check", sql`${table.version} > 0`),
  ],
);

export const priceVersions = pgTable(
  "price_versions",
  {
    id: uuid("id").primaryKey(),
    modelId: text("model_id").notNull(),
    resolution: text("resolution").notNull(),
    outputCount: integer("output_count").notNull(),
    planContext: text("plan_context").notNull(),
    version: integer("version").notNull(),
    creditUnit: text("credit_unit").notNull(),
    creditAmount: bigint("credit_amount", { mode: "bigint" }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("price_versions_product_version_unique").on(
      table.modelId,
      table.resolution,
      table.outputCount,
      table.planContext,
      table.version,
    ),
    index("price_versions_active_lookup_idx").on(
      table.modelId,
      table.resolution,
      table.outputCount,
      table.planContext,
      table.effectiveFrom,
      table.version,
    ),
    check(
      "price_versions_model_check",
      sql`${table.modelId} in ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')`,
    ),
    check(
      "price_versions_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "price_versions_output_count_check",
      sql`${table.outputCount} in (1, 2, 4)`,
    ),
    check(
      "price_versions_plan_context_check",
      sql`length(${table.planContext}) between 1 and 64`,
    ),
    check("price_versions_version_check", sql`${table.version} > 0`),
    check(
      "price_versions_credit_unit_check",
      sql`length(${table.creditUnit}) between 1 and 32`,
    ),
    check(
      "price_versions_credit_amount_check",
      sql`${table.creditAmount} > 0`,
    ),
    check(
      "price_versions_effective_interval_check",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} > ${table.effectiveFrom}`,
    ),
  ],
);

export const generationBatches = pgTable(
  "generation_batches",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    prompt: text("prompt").notNull(),
    referenceSnapshot: jsonb("reference_snapshot")
      .$type<
        readonly {
          id: string;
          name: string;
          objectKey: string;
          ordinal: number;
        }[]
      >()
      .default([])
      .notNull(),
    modelId: text("model_id").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    requestedCount: integer("requested_count").notNull(),
    priceVersionId: uuid("price_version_id").references(() => priceVersions.id, {
      onDelete: "restrict",
    }),
    quotedCreditUnit: text("quoted_credit_unit"),
    quotedCreditAmount: bigint("quoted_credit_amount", { mode: "bigint" }),
    inputHash: text("input_hash").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("generation_batches_owner_submitted_idx").on(
      table.ownerId,
      table.submittedAt,
    ),
    index("generation_batches_project_submitted_idx")
      .on(table.projectId, table.submittedAt)
      .where(sql`${table.projectId} is not null`),
    check(
      "generation_batches_model_check",
      sql`${table.modelId} in ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')`,
    ),
    check(
      "generation_batches_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "generation_batches_count_check",
      sql`${table.requestedCount} in (1, 2, 4)`,
    ),
  ],
);

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => generationBatches.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    retryOfJobId: uuid("retry_of_job_id").references(
      (): AnyPgColumn => generationJobs.id,
      { onDelete: "restrict" },
    ),
    creditReservationEntryId: uuid("credit_reservation_entry_id").references(
      (): AnyPgColumn => creditLedgerEntries.id,
      { onDelete: "restrict" },
    ),
    state: text("state").default("queued").notNull(),
    progress: integer("progress").default(0).notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    errorCode: text("error_code"),
    errorTitle: text("error_title"),
    errorMessage: text("error_message"),
    errorRetryable: boolean("error_retryable"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("generation_jobs_batch_unique").on(table.batchId),
    uniqueIndex("generation_jobs_owner_idempotency_unique").on(
      table.ownerId,
      table.idempotencyKey,
    ),
    uniqueIndex("generation_jobs_credit_reservation_unique")
      .on(table.creditReservationEntryId)
      .where(sql`${table.creditReservationEntryId} is not null`),
    index("generation_jobs_state_submitted_idx").on(
      table.state,
      table.submittedAt,
    ),
    check(
      "generation_jobs_state_check",
      sql`${table.state} in ('queued', 'running', 'refining', 'succeeded', 'failed', 'cancelled')`,
    ),
    check(
      "generation_jobs_progress_check",
      sql`${table.progress} between 0 and 100`,
    ),
  ],
);

export const generationAttempts = pgTable(
  "generation_attempts",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
    routeVersion: text("route_version").notNull(),
    provider: text("provider").notNull(),
    providerModel: text("provider_model").notNull(),
    providerTaskId: text("provider_task_id"),
    state: text("state").default("created").notNull(),
    requestHash: text("request_hash").notNull(),
    resultHash: text("result_hash"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("generation_attempts_job_ordinal_unique").on(
      table.jobId,
      table.ordinal,
    ),
    uniqueIndex("generation_attempts_provider_task_unique")
      .on(table.provider, table.providerTaskId)
      .where(sql`${table.providerTaskId} is not null`),
    index("generation_attempts_job_idx").on(table.jobId),
    check(
      "generation_attempts_state_check",
      sql`${table.state} in ('created', 'submitted', 'running', 'succeeded', 'failed')`,
    ),
    check("generation_attempts_ordinal_check", sql`${table.ordinal} > 0`),
  ],
);

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    entryType: text("entry_type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    reason: text("reason").notNull(),
    relatedJobId: uuid("related_job_id").references(() => generationJobs.id, {
      onDelete: "restrict",
    }),
    relatedPaymentRef: text("related_payment_ref"),
    priorEntryId: uuid("prior_entry_id").references(
      (): AnyPgColumn => creditLedgerEntries.id,
      { onDelete: "restrict" },
    ),
    actor: text("actor").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId, table.ownerId],
      foreignColumns: [creditAccounts.id, creditAccounts.ownerId],
      name: "credit_ledger_entries_account_owner_fk",
    }).onDelete("restrict"),
    uniqueIndex("credit_ledger_entries_account_idempotency_unique").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("credit_ledger_entries_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
      table.id,
    ),
    index("credit_ledger_entries_job_idx").on(
      table.relatedJobId,
      table.createdAt,
    ),
    uniqueIndex("credit_ledger_entries_job_reserve_unique")
      .on(table.relatedJobId)
      .where(
        sql`${table.entryType} = 'reserve' and ${table.relatedJobId} is not null`,
      ),
    uniqueIndex("credit_ledger_entries_reservation_close_unique")
      .on(table.priorEntryId)
      .where(sql`${table.entryType} in ('settle', 'release')`),
    uniqueIndex("credit_ledger_entries_settlement_refund_unique")
      .on(table.priorEntryId)
      .where(sql`${table.entryType} = 'refund'`),
    check(
      "credit_ledger_entries_type_check",
      sql`${table.entryType} in ('grant', 'reserve', 'settle', 'release', 'refund', 'expire', 'adjust')`,
    ),
    check(
      "credit_ledger_entries_amount_sign_check",
      sql`(${table.entryType} in ('grant', 'release', 'refund') and ${table.amount} > 0)
        or (${table.entryType} in ('reserve', 'settle', 'expire') and ${table.amount} < 0)
        or (${table.entryType} = 'adjust' and ${table.amount} <> 0)`,
    ),
    check(
      "credit_ledger_entries_idempotency_key_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "credit_ledger_entries_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
    check(
      "credit_ledger_entries_reason_check",
      sql`length(${table.reason}) between 1 and 200`,
    ),
    check(
      "credit_ledger_entries_actor_check",
      sql`${table.actor} in ('system', 'worker', 'operator', 'payment')`,
    ),
    check(
      "credit_ledger_entries_relation_check",
      sql`(${table.entryType} in ('settle', 'release', 'refund') and ${table.priorEntryId} is not null and ${table.relatedJobId} is not null)
        or (${table.entryType} = 'reserve' and ${table.priorEntryId} is null and ${table.relatedJobId} is not null)
        or (${table.entryType} in ('grant', 'expire', 'adjust'))`,
    ),
  ],
);

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    productVersionId: uuid("product_version_id")
      .notNull()
      .references(() => paymentProductVersions.id, { onDelete: "restrict" }),
    productId: text("product_id").notNull(),
    productVersion: integer("product_version").notNull(),
    currency: text("currency").notNull(),
    moneyAmountMinor: bigint("money_amount_minor", { mode: "bigint" }).notNull(),
    creditUnit: text("credit_unit").notNull(),
    creditAmount: bigint("credit_amount", { mode: "bigint" }).notNull(),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    state: text("state").default("pending").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    paidLedgerEntryId: uuid("paid_ledger_entry_id").references(
      () => creditLedgerEntries.id,
      { onDelete: "restrict" },
    ),
    ...timestamps,
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_orders_public_id_unique").on(table.publicId),
    uniqueIndex("payment_orders_owner_idempotency_unique").on(
      table.ownerId,
      table.idempotencyKey,
    ),
    uniqueIndex("payment_orders_provider_order_unique").on(
      table.provider,
      table.providerOrderId,
    ),
    index("payment_orders_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
      table.id,
    ),
    check(
      "payment_orders_public_id_check",
      sql`${table.publicId} ~ '^ord_[a-f0-9]{32}$'`,
    ),
    check(
      "payment_orders_product_id_check",
      sql`length(${table.productId}) between 1 and 100`,
    ),
    check("payment_orders_product_version_check", sql`${table.productVersion} > 0`),
    check("payment_orders_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("payment_orders_money_amount_check", sql`${table.moneyAmountMinor} > 0`),
    check(
      "payment_orders_credit_unit_check",
      sql`length(${table.creditUnit}) between 1 and 32`,
    ),
    check("payment_orders_credit_amount_check", sql`${table.creditAmount} > 0`),
    check(
      "payment_orders_provider_check",
      sql`length(${table.provider}) between 1 and 64`,
    ),
    check(
      "payment_orders_provider_order_id_check",
      sql`length(${table.providerOrderId}) between 8 and 200`,
    ),
    check("payment_orders_state_check", sql`${table.state} in ('pending', 'paid')`),
    check(
      "payment_orders_idempotency_key_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "payment_orders_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
    check(
      "payment_orders_paid_state_check",
      sql`(${table.state} = 'pending' and ${table.paidAt} is null and ${table.paidLedgerEntryId} is null)
        or (${table.state} = 'paid' and ${table.paidAt} is not null and ${table.paidLedgerEntryId} is not null)`,
    ),
  ],
);

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    paymentOrderId: uuid("payment_order_id")
      .notNull()
      .references(() => paymentOrders.id, { onDelete: "restrict" }),
    applied: boolean("applied").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("payment_webhook_events_provider_event_unique").on(
      table.provider,
      table.providerEventId,
    ),
    index("payment_webhook_events_order_received_idx").on(
      table.paymentOrderId,
      table.receivedAt,
      table.id,
    ),
    check(
      "payment_webhook_events_provider_check",
      sql`length(${table.provider}) between 1 and 64`,
    ),
    check(
      "payment_webhook_events_provider_event_id_check",
      sql`length(${table.providerEventId}) between 8 and 200`,
    ),
    check(
      "payment_webhook_events_type_check",
      sql`${table.eventType} = 'payment.succeeded'`,
    ),
    check(
      "payment_webhook_events_payload_hash_check",
      sql`length(${table.payloadHash}) = 64`,
    ),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => generationBatches.id, { onDelete: "restrict" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull(),
    checksum: text("checksum").notNull(),
    mimeType: text("mime_type").notNull(),
    pixelWidth: integer("pixel_width").notNull(),
    pixelHeight: integer("pixel_height").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    moderationState: text("moderation_state").default("accepted").notNull(),
    visibility: text("visibility").default("private").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("assets_job_unique").on(table.jobId),
    uniqueIndex("assets_object_key_unique").on(table.objectKey),
    index("assets_owner_created_idx").on(table.ownerId, table.createdAt),
    check("assets_pixel_width_check", sql`${table.pixelWidth} > 0`),
    check("assets_pixel_height_check", sql`${table.pixelHeight} > 0`),
    check("assets_byte_size_check", sql`${table.byteSize} > 0`),
    check(
      "assets_moderation_state_check",
      sql`${table.moderationState} in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "assets_visibility_check",
      sql`${table.visibility} in ('private', 'project', 'public')`,
    ),
  ],
);

export const generationJobEvents = pgTable(
  "generation_job_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    sequence: integer("sequence").notNull(),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    eventType: text("event_type").notNull(),
    detail: jsonb("detail").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("generation_job_events_job_sequence_unique").on(
      table.jobId,
      table.sequence,
    ),
    index("generation_job_events_job_idx").on(table.jobId),
  ],
);

export const generationQueueOutbox = pgTable(
  "generation_queue_outbox",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("generation_queue_outbox_job_unique").on(table.jobId),
    index("generation_queue_outbox_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.dispatchedAt} is null`),
  ],
);
