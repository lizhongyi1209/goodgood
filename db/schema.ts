import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
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

export const generationBatches = pgTable(
  "generation_batches",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    prompt: text("prompt").notNull(),
    referenceSnapshot: jsonb("reference_snapshot")
      .$type<readonly { id: string; name: string; ordinal: number }[]>()
      .default([])
      .notNull(),
    modelId: text("model_id").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    requestedCount: integer("requested_count").notNull(),
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
