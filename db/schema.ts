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
  primaryKey,
  text,
  timestamp,
  unique,
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

export const inspirationCases = pgTable("inspiration_cases", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  sourceAssetId: uuid("source_asset_id").notNull().references(() => assets.id),
  beforeReferenceId: uuid("before_reference_id").references(() => referenceAssets.id),
  title: text("title").notNull(), description: text("description").notNull().default(""),
  promptVisibility: text("prompt_visibility").notNull().default('public'),
  comparisonMode: text("comparison_mode").notNull().default('side_by_side'),
  prompt: text("prompt").notNull(), parameters: jsonb("parameters").notNull(),
  authorSnapshot: jsonb("author_snapshot").notNull(),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at",{withTimezone:true}),
  deletedBy: uuid("deleted_by").references(() => users.id),
}, (table) => [
  uniqueIndex("inspiration_cases_active_source_idx").on(table.ownerId,table.sourceAssetId).where(sql`${table.deletedAt} is null`),
  index("inspiration_cases_directory_idx").on(table.createdAt.desc(),table.id.desc()).where(sql`${table.deletedAt} is null`),
  index("inspiration_cases_before_idx").on(table.beforeReferenceId).where(sql`${table.deletedAt} is null`),
  check("inspiration_cases_title_check",sql`char_length(${table.title}) between 1 and 60`),
  check("inspiration_cases_description_check",sql`char_length(${table.description}) <= 1000`),
  check("inspiration_cases_parameters_check",sql`jsonb_typeof(${table.parameters}) = 'object'`),
  check("inspiration_cases_author_snapshot_check",sql`jsonb_typeof(${table.authorSnapshot}) = 'object'`),
  check('inspiration_cases_prompt_visibility_check',sql`${table.promptVisibility} in ('public','hidden')`),
  check('inspiration_cases_comparison_mode_check',sql`${table.comparisonMode} in ('side_by_side','hover')`),
]);
export const inspirationLikes = pgTable("inspiration_likes", {
  caseId: uuid("case_id").notNull().references(() => inspirationCases.id),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},table=>[primaryKey({columns:[table.caseId,table.ownerId]})]);
export const inspirationGenerationPrompts = pgTable('inspiration_generation_prompts',{
  jobId:uuid('job_id').primaryKey().references(()=>generationJobs.id),
  caseId:uuid('case_id').notNull().references(()=>inspirationCases.id),
  effectivePrompt:text('effective_prompt').notNull(),
},table=>[check('inspiration_generation_prompts_effective_prompt_check',sql`char_length(${table.effectivePrompt}) between 1 and 8001`)]);
export const inspirationEvents = pgTable("inspiration_events", {
  id: uuid("id").primaryKey(),
  caseId: uuid("case_id").notNull().references(() => inspirationCases.id),
  actorOwnerId: uuid("actor_owner_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},table=>[check("inspiration_events_action_check",sql`${table.action} in ('publish','withdraw','owner_remove')`)]);

export const personalProfiles = pgTable("personal_profiles", {
  ownerId: uuid("owner_id").primaryKey().references(() => users.id),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull().unique("personal_profiles_handle_key"),
  avatarReferenceId: uuid("avatar_reference_id").references(() => referenceAssets.id),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [
  check("personal_profiles_display_name_check", sql`char_length(${table.displayName}) between 1 and 30`),
  check("personal_profiles_handle_check", sql`${table.handle} ~ '^[a-z0-9_]{3,24}$'`),
  check("personal_profiles_version_check", sql`${table.version} > 0`),
  index("personal_profiles_avatar_reference_idx").on(table.avatarReferenceId).where(sql`${table.avatarReferenceId} is not null`),
]);

export const managedModels = pgTable("managed_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  mediaType: text("media_type").notNull(),
  adapterId: text("adapter_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  prices: jsonb("prices").notNull().default({}),
  lines: jsonb("lines").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("managed_models_lines_check", sql`jsonb_typeof(${table.lines}) = 'object'`),
  check("managed_models_archive_disabled", sql`${table.archivedAt} is null or ${table.enabled} = false`),
  check("managed_models_id_check", sql`${table.id} ~ '^[a-z0-9][a-z0-9._-]{1,79}$'`),
  check("managed_models_name_check", sql`length(${table.name}) between 1 and 80`),
  check("managed_models_media_type_check", sql`${table.mediaType} in ('image','video')`),
]);

export const managedModelEvents = pgTable("managed_model_events", {
  id: uuid("id").primaryKey(),
  modelId: text("model_id").notNull().references(() => managedModels.id, { onDelete: "restrict" }),
  actorOwnerId: uuid("actor_owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  beforeRecord: jsonb("before_record"),
  afterRecord: jsonb("after_record").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditUnitExchanges = pgTable("credit_unit_exchanges", {
  sourceKind: text("source_kind").notNull(),
  sourceId: uuid("source_id").notNull(),
  targetId: uuid("target_id"),
  originalRecord: jsonb("original_record").notNull(),
  multiplier: integer("multiplier").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.sourceKind, table.sourceId] }),
  check("credit_unit_exchanges_multiplier_check", sql`${table.multiplier} = 2`)]);

export const users = pgTable(
  "users",
  {
    accountTier: text("account_tier").default("seed").notNull(),
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    locale: text("locale").default("zh-CN").notNull(),
    status: text("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check(
      "users_account_tier_check",
      sql`${table.accountTier} in ('seed')`,
    ),
    check(
      "users_status_check",
      sql`${table.status} in ('pending', 'active', 'suspended')`,
    ),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    personalOwnerId: uuid("personal_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdByOwnerId: uuid("created_by_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspaces_personal_owner_unique")
      .on(table.personalOwnerId)
      .where(sql`${table.kind} = 'personal'`),
    index("workspaces_kind_status_idx").on(
      table.kind,
      table.status,
      table.createdAt,
      table.id,
    ),
    check("workspaces_kind_check", sql`${table.kind} in ('personal', 'organization')`),
    check("workspaces_name_check", sql`length(${table.name}) between 1 and 100`),
    check("workspaces_status_check", sql`${table.status} in ('active', 'suspended')`),
    check(
      "workspaces_personal_owner_check",
      sql`(${table.kind} = 'personal' and ${table.personalOwnerId} is not null)
        or (${table.kind} = 'organization' and ${table.personalOwnerId} is null)`,
    ),
  ],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    status: text("status").default("active").notNull(),
    invitedByOwnerId: uuid("invited_by_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_memberships_workspace_owner_unique").on(
      table.workspaceId,
      table.ownerId,
    ),
    uniqueIndex("workspace_memberships_id_workspace_unique").on(
      table.id,
      table.workspaceId,
    ),
    index("workspace_memberships_owner_status_idx").on(
      table.ownerId,
      table.status,
      table.updatedAt,
      table.id,
    ),
    index("workspace_memberships_workspace_status_idx").on(
      table.workspaceId,
      table.status,
      table.role,
      table.createdAt,
      table.id,
    ),
    check(
      "workspace_memberships_role_check",
      sql`${table.role} in ('org_owner', 'org_admin', 'org_member')`,
    ),
    check(
      "workspace_memberships_status_check",
      sql`${table.status} in ('active', 'suspended', 'removed')`,
    ),
    check("workspace_memberships_version_check", sql`${table.version} > 0`),
    check(
      "workspace_memberships_interval_check",
      sql`(${table.status} in ('active', 'suspended') and ${table.endedAt} is null)
        or (${table.status} = 'removed' and ${table.endedAt} is not null)`,
    ),
  ],
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    normalizedEmail: text("normalized_email").notNull(),
    intendedRole: text("intended_role").notNull(),
    status: text("status").default("pending").notNull(),
    invitedByOwnerId: uuid("invited_by_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    acceptedByOwnerId: uuid("accepted_by_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    membershipId: uuid("membership_id").references(() => workspaceMemberships.id, {
      onDelete: "restrict",
    }),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_invitations_actor_idempotency_unique").on(
      table.invitedByOwnerId,
      table.idempotencyKey,
    ),
    uniqueIndex("workspace_invitations_pending_email_unique")
      .on(table.workspaceId, table.normalizedEmail)
      .where(sql`${table.status} = 'pending'`),
    index("workspace_invitations_email_status_idx").on(
      table.normalizedEmail,
      table.status,
      table.expiresAt,
      table.id,
    ),
    check(
      "workspace_invitations_intended_role_check",
      sql`${table.intendedRole} in ('org_admin', 'org_member')`,
    ),
    check(
      "workspace_invitations_status_check",
      sql`${table.status} in ('pending', 'accepted', 'revoked', 'expired')`,
    ),
    check(
      "workspace_invitations_email_check",
      sql`length(${table.normalizedEmail}) between 3 and 320
        and ${table.normalizedEmail} = lower(btrim(${table.normalizedEmail}))
        and ${table.normalizedEmail} like '%@%'`,
    ),
    check(
      "workspace_invitations_idempotency_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "workspace_invitations_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
    check(
      "workspace_invitations_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const workspaceAuditEvents = pgTable(
  "workspace_audit_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    actorOwnerId: uuid("actor_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetOwnerId: uuid("target_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    membershipId: uuid("membership_id").references(() => workspaceMemberships.id, {
      onDelete: "restrict",
    }),
    invitationId: uuid("invitation_id").references(() => workspaceInvitations.id, {
      onDelete: "restrict",
    }),
    actionType: text("action_type").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_audit_events_actor_idempotency_unique").on(
      table.actorOwnerId,
      table.idempotencyKey,
    ),
    index("workspace_audit_events_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
      table.id,
    ),
    index("workspace_audit_events_target_created_idx")
      .on(table.targetOwnerId, table.createdAt, table.id)
      .where(sql`${table.targetOwnerId} is not null`),
    check(
      "workspace_audit_events_action_check",
      sql`${table.actionType} in (
        'create_organization', 'invite_member', 'accept_invitation',
        'revoke_invitation', 'change_member_role', 'suspend_member',
        'restore_member', 'remove_member', 'grant_organization_credits',
        'set_member_budget', 'download_organization_asset'
      )`,
    ),
    check(
      "workspace_audit_events_reason_check",
      sql`length(${table.reason}) between 2 and 200`,
    ),
    check(
      "workspace_audit_events_idempotency_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "workspace_audit_events_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
  ],
);

export const workspaceCreditAccounts = pgTable(
  "workspace_credit_accounts",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    unit: text("unit").default("credit-cny-cent").notNull(),
    availableBalance: bigint("available_balance", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    reservedBalance: bigint("reserved_balance", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    allocatedBalance: bigint("allocated_balance", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    version: bigint("version", { mode: "bigint" }).default(sql`0`).notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_credit_accounts_workspace_unit_unique").on(
      table.workspaceId,
      table.unit,
    ),
    uniqueIndex("workspace_credit_accounts_id_workspace_unique").on(
      table.id,
      table.workspaceId,
    ),
    index("workspace_credit_accounts_workspace_idx").on(
      table.workspaceId,
      table.status,
    ),
    check(
      "workspace_credit_accounts_unit_check",
      sql`length(${table.unit}) between 1 and 32`,
    ),
    check(
      "workspace_credit_accounts_balance_check",
      sql`${table.availableBalance} >= 0 and ${table.reservedBalance} >= 0
        and ${table.allocatedBalance} >= 0
        and ${table.allocatedBalance} <= ${table.availableBalance} + ${table.reservedBalance}`,
    ),
    check("workspace_credit_accounts_version_check", sql`${table.version} >= 0`),
    check(
      "workspace_credit_accounts_status_check",
      sql`${table.status} in ('active', 'frozen', 'closed')`,
    ),
  ],
);

export const memberBudgets = pgTable(
  "member_budgets",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    membershipId: uuid("membership_id").notNull(),
    creditLimit: bigint("credit_limit", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    settledUsage: bigint("settled_usage", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    reservedUsage: bigint("reserved_usage", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    version: bigint("version", { mode: "bigint" }).default(sql`0`).notNull(),
    status: text("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.membershipId, table.workspaceId],
      foreignColumns: [workspaceMemberships.id, workspaceMemberships.workspaceId],
      name: "member_budgets_membership_workspace_fk",
    }).onDelete("restrict"),
    uniqueIndex("member_budgets_membership_unique").on(table.membershipId),
    uniqueIndex("member_budgets_id_workspace_unique").on(
      table.id,
      table.workspaceId,
    ),
    index("member_budgets_workspace_status_idx").on(
      table.workspaceId,
      table.status,
      table.updatedAt,
      table.id,
    ),
    check(
      "member_budgets_amount_check",
      sql`${table.creditLimit} >= 0 and ${table.settledUsage} >= 0
        and ${table.reservedUsage} >= 0
        and ${table.settledUsage} + ${table.reservedUsage} <= ${table.creditLimit}`,
    ),
    check("member_budgets_version_check", sql`${table.version} >= 0`),
    check("member_budgets_status_check", sql`${table.status} in ('active', 'closed')`),
  ],
);

export const workspaceCreditLedgerEntries = pgTable(
  "workspace_credit_ledger_entries",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    memberBudgetId: uuid("member_budget_id"),
    entryType: text("entry_type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    reason: text("reason").notNull(),
    relatedJobId: uuid("related_job_id"),
    priorEntryId: uuid("prior_entry_id").references(
      (): AnyPgColumn => workspaceCreditLedgerEntries.id,
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
      columns: [table.accountId, table.workspaceId],
      foreignColumns: [workspaceCreditAccounts.id, workspaceCreditAccounts.workspaceId],
      name: "workspace_credit_ledger_account_workspace_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.memberBudgetId, table.workspaceId],
      foreignColumns: [memberBudgets.id, memberBudgets.workspaceId],
      name: "workspace_credit_ledger_budget_workspace_fk",
    }).onDelete("restrict"),
    uniqueIndex("workspace_credit_ledger_account_idempotency_unique").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("workspace_credit_ledger_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
      table.id,
    ),
    index("workspace_credit_ledger_job_idx")
      .on(table.relatedJobId, table.createdAt, table.id)
      .where(sql`${table.relatedJobId} is not null`),
    uniqueIndex("workspace_credit_ledger_reserve_job_unique")
      .on(table.workspaceId, table.relatedJobId)
      .where(sql`${table.entryType} = 'reserve'`),
    uniqueIndex("workspace_credit_ledger_close_unique")
      .on(table.priorEntryId)
      .where(sql`${table.entryType} in ('settle', 'release')`),
    check(
      "workspace_credit_ledger_type_check",
      sql`${table.entryType} in ('grant', 'reserve', 'settle', 'release')`,
    ),
    check(
      "workspace_credit_ledger_amount_check",
      sql`(${table.entryType} in ('grant', 'release') and ${table.amount} > 0)
        or (${table.entryType} in ('reserve', 'settle') and ${table.amount} < 0)`,
    ),
    check(
      "workspace_credit_ledger_reason_check",
      sql`length(${table.reason}) between 2 and 200`,
    ),
    check(
      "workspace_credit_ledger_idempotency_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "workspace_credit_ledger_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
    check(
      "workspace_credit_ledger_actor_check",
      sql`length(${table.actor}) between 2 and 100`,
    ),
    check(
      "workspace_credit_ledger_relation_check",
      sql`(${table.entryType} = 'grant' and ${table.memberBudgetId} is null
          and ${table.relatedJobId} is null and ${table.priorEntryId} is null)
        or (${table.entryType} = 'reserve' and ${table.memberBudgetId} is not null
          and ${table.relatedJobId} is not null and ${table.priorEntryId} is null)
        or (${table.entryType} in ('settle', 'release')
          and ${table.memberBudgetId} is not null
          and ${table.relatedJobId} is not null and ${table.priorEntryId} is not null)`,
    ),
  ],
);

export const memberBudgetEvents = pgTable(
  "member_budget_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    memberBudgetId: uuid("member_budget_id").notNull(),
    creditLedgerEntryId: uuid("credit_ledger_entry_id").references(
      () => workspaceCreditLedgerEntries.id,
      { onDelete: "restrict" },
    ),
    eventType: text("event_type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    actorOwnerId: uuid("actor_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    actor: text("actor").notNull(),
    relatedJobId: uuid("related_job_id"),
    priorEventId: uuid("prior_event_id").references(
      (): AnyPgColumn => memberBudgetEvents.id,
      { onDelete: "restrict" },
    ),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.memberBudgetId, table.workspaceId],
      foreignColumns: [memberBudgets.id, memberBudgets.workspaceId],
      name: "member_budget_events_budget_workspace_fk",
    }).onDelete("restrict"),
    uniqueIndex("member_budget_events_workspace_idempotency_unique").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    uniqueIndex("member_budget_events_credit_entry_unique").on(
      table.creditLedgerEntryId,
    ),
    index("member_budget_events_budget_created_idx").on(
      table.memberBudgetId,
      table.createdAt,
      table.id,
    ),
    uniqueIndex("member_budget_events_reserve_job_unique")
      .on(table.workspaceId, table.relatedJobId)
      .where(sql`${table.eventType} = 'reserve'`),
    uniqueIndex("member_budget_events_close_unique")
      .on(table.priorEventId)
      .where(sql`${table.eventType} in ('settle', 'release')`),
    check(
      "member_budget_events_type_check",
      sql`${table.eventType} in ('allocate', 'reclaim', 'reserve', 'settle', 'release')`,
    ),
    check("member_budget_events_amount_check", sql`${table.amount} > 0`),
    check(
      "member_budget_events_actor_check",
      sql`length(${table.actor}) between 2 and 100`,
    ),
    check(
      "member_budget_events_reason_check",
      sql`length(${table.reason}) between 2 and 200`,
    ),
    check(
      "member_budget_events_idempotency_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "member_budget_events_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
    check(
      "member_budget_events_relation_check",
      sql`(${table.eventType} in ('allocate', 'reclaim')
          and ${table.actorOwnerId} is not null and ${table.relatedJobId} is null
          and ${table.priorEventId} is null and ${table.creditLedgerEntryId} is null)
        or (${table.eventType} = 'reserve' and ${table.actorOwnerId} is not null
          and ${table.relatedJobId} is not null and ${table.priorEventId} is null
          and ${table.creditLedgerEntryId} is not null)
        or (${table.eventType} in ('settle', 'release')
          and ${table.actorOwnerId} is null and ${table.relatedJobId} is not null
          and ${table.priorEventId} is not null
          and ${table.creditLedgerEntryId} is not null)`,
    ),
  ],
);

export const systemRoleAssignments = pgTable(
  "system_role_assignments",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    source: text("source").notNull(),
    assignedByOperatorId: text("assigned_by_operator_id").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("system_role_assignments_owner_role_unique").on(
      table.ownerId,
      table.role,
    ),
    uniqueIndex("system_role_assignments_idempotency_unique").on(
      table.idempotencyKey,
    ),
    check(
      "system_role_assignments_role_check",
      sql`${table.role} in ('site_owner')`,
    ),
    check(
      "system_role_assignments_source_check",
      sql`${table.source} in ('bootstrap')`,
    ),
    check(
      "system_role_assignments_operator_check",
      sql`length(${table.assignedByOperatorId}) between 2 and 100`,
    ),
    check(
      "system_role_assignments_reason_check",
      sql`length(${table.reason}) between 1 and 200`,
    ),
    check(
      "system_role_assignments_idempotency_key_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "system_role_assignments_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
  ],
);

export const businessRoleAssignments = pgTable(
  "business_role_assignments",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    assignedByOwnerId: uuid("assigned_by_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignmentReason: text("assignment_reason").notNull(),
    assignedIdempotencyKey: text("assigned_idempotency_key").notNull(),
    assignedOperationHash: text("assigned_operation_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedByOwnerId: uuid("ended_by_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    endReason: text("end_reason"),
    endedIdempotencyKey: text("ended_idempotency_key"),
    endedOperationHash: text("ended_operation_hash"),
  },
  (table) => [
    uniqueIndex("business_role_assignments_active_owner_unique")
      .on(table.ownerId)
      .where(sql`${table.endedAt} is null`),
    uniqueIndex("business_role_assignments_assigned_action_unique").on(
      table.assignedByOwnerId,
      table.assignedIdempotencyKey,
    ),
    uniqueIndex("business_role_assignments_ended_action_unique")
      .on(table.endedByOwnerId, table.endedIdempotencyKey)
      .where(sql`${table.endedAt} is not null`),
    index("business_role_assignments_owner_history_idx").on(
      table.ownerId,
      table.createdAt,
      table.id,
    ),
    check(
      "business_role_assignments_role_check",
      sql`${table.role} in ('enterprise', 'distributor')`,
    ),
    check(
      "business_role_assignments_assignment_reason_check",
      sql`length(${table.assignmentReason}) between 2 and 200`,
    ),
    check(
      "business_role_assignments_assigned_idempotency_key_check",
      sql`length(${table.assignedIdempotencyKey}) between 8 and 200`,
    ),
    check(
      "business_role_assignments_assigned_operation_hash_check",
      sql`length(${table.assignedOperationHash}) = 64`,
    ),
    check(
      "business_role_assignments_end_shape_check",
      sql`(${table.endedAt} is null and ${table.endedByOwnerId} is null and ${table.endReason} is null and ${table.endedIdempotencyKey} is null and ${table.endedOperationHash} is null)
        or (${table.endedAt} is not null and ${table.endedAt} >= ${table.createdAt} and ${table.endedByOwnerId} is not null and length(${table.endReason}) between 2 and 200 and length(${table.endedIdempotencyKey}) between 8 and 200 and length(${table.endedOperationHash}) = 64)`,
    ),
  ],
);

export const accountRelationships = pgTable(
  "account_relationships",
  {
    id: uuid("id").primaryKey(),
    parentOwnerId: uuid("parent_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    childOwnerId: uuid("child_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdByOwnerId: uuid("created_by_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    relationshipReason: text("relationship_reason").notNull(),
    createdIdempotencyKey: text("created_idempotency_key").notNull(),
    createdOperationHash: text("created_operation_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedByOwnerId: uuid("ended_by_owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    endReason: text("end_reason"),
    endedIdempotencyKey: text("ended_idempotency_key"),
    endedOperationHash: text("ended_operation_hash"),
  },
  (table) => [
    uniqueIndex("account_relationships_active_child_unique")
      .on(table.childOwnerId)
      .where(sql`${table.endedAt} is null`),
    uniqueIndex("account_relationships_created_action_unique").on(
      table.createdByOwnerId,
      table.createdIdempotencyKey,
    ),
    uniqueIndex("account_relationships_ended_action_unique")
      .on(table.endedByOwnerId, table.endedIdempotencyKey)
      .where(sql`${table.endedAt} is not null`),
    index("account_relationships_active_parent_idx")
      .on(table.parentOwnerId, table.childOwnerId)
      .where(sql`${table.endedAt} is null`),
    index("account_relationships_child_history_idx").on(
      table.childOwnerId,
      table.createdAt,
      table.id,
    ),
    check(
      "account_relationships_distinct_owners_check",
      sql`${table.parentOwnerId} <> ${table.childOwnerId}`,
    ),
    check(
      "account_relationships_reason_check",
      sql`length(${table.relationshipReason}) between 2 and 200`,
    ),
    check(
      "account_relationships_created_idempotency_key_check",
      sql`length(${table.createdIdempotencyKey}) between 8 and 200`,
    ),
    check(
      "account_relationships_created_operation_hash_check",
      sql`length(${table.createdOperationHash}) = 64`,
    ),
    check(
      "account_relationships_end_shape_check",
      sql`(${table.endedAt} is null and ${table.endedByOwnerId} is null and ${table.endReason} is null and ${table.endedIdempotencyKey} is null and ${table.endedOperationHash} is null)
        or (${table.endedAt} is not null and ${table.endedAt} >= ${table.createdAt} and ${table.endedByOwnerId} is not null and length(${table.endReason}) between 2 and 200 and length(${table.endedIdempotencyKey}) between 8 and 200 and length(${table.endedOperationHash}) = 64)`,
    ),
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
    unique("auth_identities_id_owner_unique").on(table.id, table.ownerId),
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
    paymentFundedAvailableBalance: bigint("payment_funded_available_balance", {
      mode: "bigint",
    })
      .default(sql`0`)
      .notNull(),
    paymentFundedReservedBalance: bigint("payment_funded_reserved_balance", {
      mode: "bigint",
    })
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
    check(
      "credit_accounts_payment_funded_available_check",
      sql`${table.paymentFundedAvailableBalance} >= 0 and ${table.paymentFundedAvailableBalance} <= ${table.availableBalance}`,
    ),
    check(
      "credit_accounts_payment_funded_reserved_check",
      sql`${table.paymentFundedReservedBalance} >= 0 and ${table.paymentFundedReservedBalance} <= ${table.reservedBalance}`,
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

export const authEmailBindings = pgTable(
  "auth_email_bindings",
  {
    identityId: uuid("identity_id")
      .primaryKey()
      .references(() => authIdentities.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    normalizedEmail: text("normalized_email").notNull(),
    displayEmail: text("display_email").notNull(),
    source: text("source").default("self_service").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    migrationManifestSha256: text("migration_manifest_sha256"),
    migratedByOperatorId: text("migrated_by_operator_id"),
    migrationReferenceHash: text("migration_reference_hash"),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.identityId, table.ownerId],
      foreignColumns: [authIdentities.id, authIdentities.ownerId],
      name: "auth_email_bindings_identity_owner_fk",
    }).onDelete("restrict"),
    uniqueIndex("auth_email_bindings_email_unique").on(table.normalizedEmail),
    uniqueIndex("auth_email_bindings_owner_unique").on(table.ownerId),
    check(
      "auth_email_bindings_normalized_email_check",
      sql`length(${table.normalizedEmail}) between 3 and 320 and ${table.normalizedEmail} = lower(${table.normalizedEmail}) and ${table.normalizedEmail} = btrim(${table.normalizedEmail})`,
    ),
    check(
      "auth_email_bindings_display_email_check",
      sql`length(${table.displayEmail}) between 3 and 320 and ${table.displayEmail} = btrim(${table.displayEmail})`,
    ),
    check(
      "auth_email_bindings_source_check",
      sql`${table.source} in ('self_service', 'operator_migration')`,
    ),
    check(
      "auth_email_bindings_migration_audit_check",
      sql`(${table.source} = 'self_service' and ${table.migrationManifestSha256} is null and ${table.migratedByOperatorId} is null and ${table.migrationReferenceHash} is null) or (${table.source} = 'operator_migration' and length(${table.migrationManifestSha256}) = 64 and length(${table.migratedByOperatorId}) between 2 and 100 and length(${table.migrationReferenceHash}) = 64)`,
    ),
  ],
);

export const authEmailChallenges = pgTable(
  "auth_email_challenges",
  {
    id: uuid("id").primaryKey(),
    normalizedEmail: text("normalized_email").notNull(),
    displayEmail: text("display_email").notNull(),
    browserBindingHash: text("browser_binding_hash").notNull(),
    codeDigest: text("code_digest").notNull(),
    returnTo: text("return_to").default("/").notNull(),
    sendState: text("send_state").default("sending").notNull(),
    providerMessageId: text("provider_message_id"),
    deliveryErrorCode: text("delivery_error_code"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("auth_email_challenges_current_email_unique")
      .on(table.normalizedEmail)
      .where(sql`${table.consumedAt} is null and ${table.invalidatedAt} is null`),
    index("auth_email_challenges_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.consumedAt} is null and ${table.invalidatedAt} is null`),
    index("auth_email_challenges_browser_idx").on(
      table.browserBindingHash,
      table.createdAt,
    ),
    check(
      "auth_email_challenges_email_check",
      sql`length(${table.normalizedEmail}) between 3 and 320 and ${table.normalizedEmail} = lower(${table.normalizedEmail}) and ${table.normalizedEmail} = btrim(${table.normalizedEmail})`,
    ),
    check(
      "auth_email_challenges_browser_binding_hash_check",
      sql`length(${table.browserBindingHash}) = 64`,
    ),
    check(
      "auth_email_challenges_code_digest_check",
      sql`length(${table.codeDigest}) = 64`,
    ),
    check(
      "auth_email_challenges_send_state_check",
      sql`${table.sendState} in ('sending', 'accepted', 'unknown', 'failed')`,
    ),
    check(
      "auth_email_challenges_failed_attempts_check",
      sql`${table.failedAttempts} between 0 and 5`,
    ),
  ],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    scope: text("scope").notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    requestCount: integer("request_count").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.subjectHash, table.windowStartedAt] }),
    index("auth_rate_limits_expiry_idx").on(table.windowStartedAt),
    check(
      "auth_rate_limits_scope_check",
      sql`${table.scope} in ('email_send_hour', 'email_send_day', 'ip_send_hour', 'ip_send_day', 'global_send_hour', 'global_send_day', 'email_verify_30m', 'ip_verify_15m', 'ip_entry_minute')`,
    ),
    check(
      "auth_rate_limits_subject_hash_check",
      sql`length(${table.subjectHash}) = 64`,
    ),
    check(
      "auth_rate_limits_request_count_check",
      sql`${table.requestCount} > 0`,
    ),
  ],
);

export const authEvents = pgTable(
  "auth_events",
  {
    id: uuid("id").primaryKey(),
    eventType: text("event_type").notNull(),
    outcome: text("outcome").notNull(),
    subjectHash: text("subject_hash"),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    challengeId: uuid("challenge_id").references(
      () => authEmailChallenges.id,
      { onDelete: "set null" },
    ),
    requestId: text("request_id").notNull(),
    providerMessageId: text("provider_message_id"),
    detail: jsonb("detail").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("auth_events_created_idx").on(table.createdAt),
    index("auth_events_owner_created_idx")
      .on(table.ownerId, table.createdAt)
      .where(sql`${table.ownerId} is not null`),
    index("auth_events_challenge_idx")
      .on(table.challengeId, table.createdAt)
      .where(sql`${table.challengeId} is not null`),
    index("auth_events_request_idx").on(table.requestId, table.createdAt),
    check(
      "auth_events_event_type_check",
      sql`${table.eventType} in ('email_code_requested', 'email_code_verified', 'email_code_rejected')`,
    ),
    check(
      "auth_events_outcome_check",
      sql`${table.outcome} in ('accepted', 'unknown', 'failed', 'succeeded', 'rejected')`,
    ),
  ],
);

export const authMaintenanceState = pgTable(
  "auth_maintenance_state",
  {
    taskName: text("task_name").primaryKey(),
    lastSucceededAt: timestamp("last_succeeded_at", {
      withTimezone: true,
    }).notNull(),
    detail: jsonb("detail").default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    check(
      "auth_maintenance_state_task_check",
      sql`${table.taskName} in ('cleanup')`,
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
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
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
    index("reference_assets_workspace_creator_created_idx").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.createdAt,
      table.id,
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
    check(
      "reference_assets_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
    ),
  ],
);

export const creationDrafts = pgTable(
  "creation_drafts",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
      .notNull()
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
    catalogModelId: text("catalog_model_id"),
    modelId: text("model_id").notNull(),
    imageLine: text("image_line"),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    generationCount: integer("generation_count").notNull(),
    thinkingLevel: text("thinking_level").default("low").notNull(),
    googleSearch: boolean("google_search").default(false).notNull(),
    quality: text("quality").default("auto").notNull(),
    background: text("background").default("auto").notNull(),
    outputFormat: text("output_format").default("png").notNull(),
    version: integer("version").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.creatorOwnerId] }),
    index("creation_drafts_expiry_idx").on(table.expiresAt, table.ownerId),
    check("creation_drafts_image_line_check", sql`${table.imageLine} is null or (${table.modelId} in ('nano-banana-2','nano-banana-pro','gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare') and ${table.imageLine} in ('special','quality','dedicated'))`),
    check("creation_drafts_prompt_check", sql`length(${table.prompt}) <= 4000`),
    check(
      "creation_drafts_model_check",
      sql`${table.modelId} ~ '^[a-z0-9][a-z0-9._-]{1,79}$'`,
    ),
    check(
      "creation_drafts_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "creation_drafts_count_check",
      sql`${table.generationCount} in (1, 2, 4)`,
    ),
    check(
      "creation_drafts_thinking_level_check",
      sql`${table.thinkingLevel} in ('low', 'high')`,
    ),
    check(
      "creation_drafts_banana_options_check",
      sql`${table.modelId} = 'nano-banana-2' or (${table.thinkingLevel} = 'low' and ${table.googleSearch} = false)`,
    ),
    check(
      "creation_drafts_gpt_quality_check",
      sql`${table.quality} in ('auto', 'low', 'medium', 'high') or (${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2.5-flare') and ${table.quality} in ('xhigh', 'max'))`,
    ),
    check(
      "creation_drafts_gpt_background_check",
      sql`${table.background} in ('auto', 'transparent')`,
    ),
    check(
      "creation_drafts_gpt_output_format_check",
      sql`${table.outputFormat} in ('png', 'jpeg', 'webp')`,
    ),
    check(
      "creation_drafts_gpt_options_check",
      sql`${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') or (${table.quality} = 'auto' and ${table.background} = 'auto' and ${table.outputFormat} = 'png')`,
    ),
    check(
      "creation_drafts_transparent_format_check",
      sql`${table.background} <> 'transparent' or ${table.outputFormat} in ('png', 'webp')`,
    ),
    check("creation_drafts_version_check", sql`${table.version} > 0`),
    check(
      "creation_drafts_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
    ),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
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
    catalogModelId: text("catalog_model_id"),
    modelId: text("model_id").notNull(),
    imageLine: text("image_line"),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    generationCount: integer("generation_count").notNull(),
    thinkingLevel: text("thinking_level").default("low").notNull(),
    googleSearch: boolean("google_search").default(false).notNull(),
    quality: text("quality").default("auto").notNull(),
    background: text("background").default("auto").notNull(),
    outputFormat: text("output_format").default("png").notNull(),
    status: text("status").default("active").notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt),
    uniqueIndex("projects_workspace_creator_idempotency_unique").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.createIdempotencyKey,
    ),
    uniqueIndex("projects_id_workspace_unique").on(table.id, table.workspaceId),
    index("projects_workspace_creator_updated_idx").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.updatedAt,
      table.id,
    ),
    check("projects_image_line_check", sql`${table.imageLine} is null or (${table.modelId} in ('nano-banana-2','nano-banana-pro','gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare') and ${table.imageLine} in ('special','quality','dedicated'))`),
    check("projects_name_check", sql`length(${table.name}) between 1 and 32`),
    check("projects_prompt_check", sql`length(${table.prompt}) <= 4000`),
    check(
      "projects_model_check",
      sql`${table.modelId} ~ '^[a-z0-9][a-z0-9._-]{1,79}$'`,
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
      "projects_thinking_level_check",
      sql`${table.thinkingLevel} in ('low', 'high')`,
    ),
    check(
      "projects_banana_options_check",
      sql`${table.modelId} = 'nano-banana-2' or (${table.thinkingLevel} = 'low' and ${table.googleSearch} = false)`,
    ),
    check(
      "projects_gpt_quality_check",
      sql`${table.quality} in ('auto', 'low', 'medium', 'high') or (${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2.5-flare') and ${table.quality} in ('xhigh', 'max'))`,
    ),
    check(
      "projects_gpt_background_check",
      sql`${table.background} in ('auto', 'transparent')`,
    ),
    check(
      "projects_gpt_output_format_check",
      sql`${table.outputFormat} in ('png', 'jpeg', 'webp')`,
    ),
    check(
      "projects_gpt_options_check",
      sql`${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') or (${table.quality} = 'auto' and ${table.background} = 'auto' and ${table.outputFormat} = 'png')`,
    ),
    check(
      "projects_transparent_format_check",
      sql`${table.background} <> 'transparent' or ${table.outputFormat} in ('png', 'webp')`,
    ),
    check(
      "projects_status_check",
      sql`${table.status} in ('active', 'archived')`,
    ),
    check("projects_version_check", sql`${table.version} > 0`),
    check(
      "projects_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
    ),
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
      sql`${table.modelId} ~ '^[a-z0-9][a-z0-9._-]{1,79}$'`,
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
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
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
    catalogModelId: text("catalog_model_id"),
    catalogModelName: text("catalog_model_name"),
    modelId: text("model_id").notNull(),
    imageLine: text("image_line"),
    aspectRatio: text("aspect_ratio").notNull(),
    resolution: text("resolution").notNull(),
    requestedCount: integer("requested_count").notNull(),
    thinkingLevel: text("thinking_level").default("low").notNull(),
    googleSearch: boolean("google_search").default(false).notNull(),
    quality: text("quality").default("auto").notNull(),
    background: text("background").default("auto").notNull(),
    outputFormat: text("output_format").default("png").notNull(),
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
    uniqueIndex("generation_batches_id_workspace_unique").on(
      table.id,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "generation_batches_project_workspace_fk",
    }).onDelete("restrict"),
    index("generation_batches_owner_submitted_idx").on(
      table.ownerId,
      table.submittedAt,
    ),
    index("generation_batches_project_submitted_idx")
      .on(table.projectId, table.submittedAt)
      .where(sql`${table.projectId} is not null`),
    index("generation_batches_workspace_submitted_idx").on(
      table.workspaceId,
      table.submittedAt,
      table.id,
    ),
    check("generation_batches_image_line_check", sql`${table.imageLine} is null or (${table.modelId} in ('nano-banana-2','nano-banana-pro','gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare') and ${table.imageLine} in ('special','quality','dedicated'))`),
    check(
      "generation_batches_model_check",
      sql`${table.modelId} ~ '^[a-z0-9][a-z0-9._-]{1,79}$'`,
    ),
    check(
      "generation_batches_resolution_check",
      sql`${table.resolution} in ('1K', '2K', '4K')`,
    ),
    check(
      "generation_batches_count_check",
      sql`${table.requestedCount} in (1, 2, 4)`,
    ),
    check(
      "generation_batches_thinking_level_check",
      sql`${table.thinkingLevel} in ('low', 'high')`,
    ),
    check(
      "generation_batches_banana_options_check",
      sql`${table.modelId} = 'nano-banana-2' or (${table.thinkingLevel} = 'low' and ${table.googleSearch} = false)`,
    ),
    check(
      "generation_batches_gpt_quality_check",
      sql`${table.quality} in ('auto', 'low', 'medium', 'high') or (${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2.5-flare') and ${table.quality} in ('xhigh', 'max'))`,
    ),
    check(
      "generation_batches_gpt_background_check",
      sql`${table.background} in ('auto', 'transparent')`,
    ),
    check(
      "generation_batches_gpt_output_format_check",
      sql`${table.outputFormat} in ('png', 'jpeg', 'webp')`,
    ),
    check(
      "generation_batches_gpt_options_check",
      sql`${table.modelId} in ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') or (${table.quality} = 'auto' and ${table.background} = 'auto' and ${table.outputFormat} = 'png')`,
    ),
    check(
      "generation_batches_transparent_format_check",
      sql`${table.background} <> 'transparent' or ${table.outputFormat} in ('png', 'webp')`,
    ),
    check(
      "generation_batches_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
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
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
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
    workspaceCreditReservationEntryId: uuid(
      "workspace_credit_reservation_entry_id",
    ).references(() => workspaceCreditLedgerEntries.id, {
      onDelete: "restrict",
    }),
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
    uniqueIndex("generation_jobs_id_workspace_unique").on(
      table.id,
      table.workspaceId,
    ),
    uniqueIndex("generation_jobs_workspace_creator_idempotency_unique").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [table.batchId, table.workspaceId],
      foreignColumns: [generationBatches.id, generationBatches.workspaceId],
      name: "generation_jobs_batch_workspace_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.retryOfJobId, table.workspaceId],
      foreignColumns: [table.id, table.workspaceId],
      name: "generation_jobs_retry_workspace_fk",
    }).onDelete("restrict"),
    uniqueIndex("generation_jobs_credit_reservation_unique")
      .on(table.creditReservationEntryId)
      .where(sql`${table.creditReservationEntryId} is not null`),
    uniqueIndex("generation_jobs_workspace_credit_reservation_unique")
      .on(table.workspaceCreditReservationEntryId)
      .where(sql`${table.workspaceCreditReservationEntryId} is not null`),
    index("generation_jobs_state_submitted_idx").on(
      table.state,
      table.submittedAt,
    ),
    index("generation_jobs_workspace_creator_submitted_idx").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.submittedAt,
      table.id,
    ),
    check(
      "generation_jobs_state_check",
      sql`${table.state} in ('queued', 'running', 'refining', 'succeeded', 'failed', 'cancelled')`,
    ),
    check(
      "generation_jobs_progress_check",
      sql`${table.progress} between 0 and 100`,
    ),
    check(
      "generation_jobs_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
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
    paymentFundedAmount: bigint("payment_funded_amount", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
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
      sql`${table.entryType} in ('grant', 'reserve', 'settle', 'release', 'refund', 'expire', 'adjust', 'transfer_out', 'transfer_in')`,
    ),
    check(
      "credit_ledger_entries_amount_sign_check",
      sql`(${table.entryType} in ('grant', 'release', 'refund', 'transfer_in') and ${table.amount} > 0)
        or (${table.entryType} in ('reserve', 'settle', 'expire', 'transfer_out') and ${table.amount} < 0)
        or (${table.entryType} = 'adjust' and ${table.amount} <> 0)`,
    ),
    check(
      "credit_ledger_entries_payment_funded_amount_check",
      sql`(${table.amount} > 0 and ${table.paymentFundedAmount} between 0 and ${table.amount})
        or (${table.amount} < 0 and ${table.paymentFundedAmount} between ${table.amount} and 0)`,
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
      sql`${table.actor} in ('system', 'worker', 'operator', 'payment', 'owner')`,
    ),
    check(
      "credit_ledger_entries_relation_check",
      sql`(${table.entryType} in ('settle', 'release', 'refund') and ${table.priorEntryId} is not null and ${table.relatedJobId} is not null)
        or (${table.entryType} = 'reserve' and ${table.priorEntryId} is null and ${table.relatedJobId} is not null)
        or (${table.entryType} in ('transfer_out', 'transfer_in') and ${table.priorEntryId} is null and ${table.relatedJobId} is null and ${table.relatedPaymentRef} is null)
        or (${table.entryType} in ('grant', 'expire', 'adjust'))`,
    ),
  ],
);

export const creditTransfers = pgTable(
  "credit_transfers",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    parentOwnerId: uuid("parent_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    childOwnerId: uuid("child_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    relationshipId: uuid("relationship_id")
      .notNull()
      .references(() => accountRelationships.id, { onDelete: "restrict" }),
    unit: text("unit").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    parentLedgerEntryId: uuid("parent_ledger_entry_id")
      .notNull()
      .references(() => creditLedgerEntries.id, { onDelete: "restrict" }),
    childLedgerEntryId: uuid("child_ledger_entry_id")
      .notNull()
      .references(() => creditLedgerEntries.id, { onDelete: "restrict" }),
    actorOwnerId: uuid("actor_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    remark: text("remark"),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("credit_transfers_public_id_unique").on(table.publicId),
    uniqueIndex("credit_transfers_parent_idempotency_unique").on(
      table.parentOwnerId,
      table.idempotencyKey,
    ),
    uniqueIndex("credit_transfers_parent_entry_unique").on(
      table.parentLedgerEntryId,
    ),
    uniqueIndex("credit_transfers_child_entry_unique").on(
      table.childLedgerEntryId,
    ),
    index("credit_transfers_parent_created_idx").on(
      table.parentOwnerId,
      table.createdAt,
      table.id,
    ),
    index("credit_transfers_child_created_idx").on(
      table.childOwnerId,
      table.createdAt,
      table.id,
    ),
    index("credit_transfers_relationship_created_idx").on(
      table.relationshipId,
      table.createdAt,
      table.id,
    ),
    check(
      "credit_transfers_public_id_check",
      sql`${table.publicId} ~ '^trf_[0-9a-f]{32}$'`,
    ),
    check(
      "credit_transfers_owner_shape_check",
      sql`${table.parentOwnerId} <> ${table.childOwnerId} and ${table.actorOwnerId} = ${table.parentOwnerId}`,
    ),
    check("credit_transfers_unit_check", sql`${table.unit} in ('credit','credit-cny-cent')`),
    check("credit_transfers_amount_check", sql`${table.amount} > 0`),
    check(
      "credit_transfers_entry_shape_check",
      sql`${table.parentLedgerEntryId} <> ${table.childLedgerEntryId}`,
    ),
    check(
      "credit_transfers_remark_check",
      sql`${table.remark} is null or length(${table.remark}) between 1 and 200`,
    ),
    check(
      "credit_transfers_idempotency_key_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "credit_transfers_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
    ),
  ],
);

export const administrativeActions = pgTable(
  "administrative_actions",
  {
    id: uuid("id").primaryKey(),
    actorOwnerId: uuid("actor_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetOwnerId: uuid("target_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    actionType: text("action_type").notNull(),
    previousStatus: text("previous_status"),
    resultingStatus: text("resulting_status"),
    creditAmount: bigint("credit_amount", { mode: "bigint" }),
    creditLedgerEntryId: uuid("credit_ledger_entry_id").references(
      () => creditLedgerEntries.id,
      { onDelete: "restrict" },
    ),
    previousBusinessRole: text("previous_business_role"),
    resultingBusinessRole: text("resulting_business_role"),
    businessRoleAssignmentId: uuid("business_role_assignment_id").references(
      () => businessRoleAssignments.id,
      { onDelete: "restrict" },
    ),
    previousParentOwnerId: uuid("previous_parent_owner_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    resultingParentOwnerId: uuid("resulting_parent_owner_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    accountRelationshipId: uuid("account_relationship_id").references(
      () => accountRelationships.id,
      { onDelete: "restrict" },
    ),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    operationHash: text("operation_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("administrative_actions_actor_idempotency_unique").on(
      table.actorOwnerId,
      table.idempotencyKey,
    ),
    uniqueIndex("administrative_actions_credit_entry_unique")
      .on(table.creditLedgerEntryId)
      .where(sql`${table.creditLedgerEntryId} is not null`),
    index("administrative_actions_business_role_assignment_idx")
      .on(table.businessRoleAssignmentId)
      .where(sql`${table.businessRoleAssignmentId} is not null`),
    index("administrative_actions_account_relationship_idx")
      .on(table.accountRelationshipId)
      .where(sql`${table.accountRelationshipId} is not null`),
    index("administrative_actions_target_created_idx").on(
      table.targetOwnerId,
      table.createdAt,
      table.id,
    ),
    index("administrative_actions_created_idx").on(
      table.createdAt,
      table.id,
    ),
    check(
      "administrative_actions_type_check",
      sql`${table.actionType} in ('bootstrap_site_owner', 'approve_account', 'suspend_account', 'restore_account', 'grant_test_credits', 'set_business_role', 'set_direct_parent')`,
    ),
    check(
      "administrative_actions_status_check",
      sql`(${table.actionType} = 'bootstrap_site_owner' and ${table.previousStatus} in ('pending', 'active') and ${table.resultingStatus} = 'active' and ${table.creditAmount} is null and ${table.creditLedgerEntryId} is null)
        or (${table.actionType} in ('approve_account', 'suspend_account', 'restore_account') and ${table.previousStatus} in ('pending', 'active', 'suspended') and ${table.resultingStatus} in ('active', 'suspended') and ${table.creditAmount} is null and ${table.creditLedgerEntryId} is null)
        or (${table.actionType} = 'grant_test_credits' and ${table.previousStatus} is null and ${table.resultingStatus} is null and ${table.creditAmount} between 1 and 5000 and ${table.creditLedgerEntryId} is not null)
        or (${table.actionType} = 'set_business_role' and ${table.previousStatus} is null and ${table.resultingStatus} is null and ${table.creditAmount} is null and ${table.creditLedgerEntryId} is null and ${table.previousBusinessRole} is distinct from ${table.resultingBusinessRole} and ${table.businessRoleAssignmentId} is not null)
        or (${table.actionType} = 'set_direct_parent' and ${table.previousStatus} is null and ${table.resultingStatus} is null and ${table.creditAmount} is null and ${table.creditLedgerEntryId} is null and ${table.previousParentOwnerId} is distinct from ${table.resultingParentOwnerId} and ${table.accountRelationshipId} is not null)`,
    ),
    check(
      "administrative_actions_reason_check",
      sql`length(${table.reason}) between 1 and 200`,
    ),
    check(
      "administrative_actions_idempotency_key_check",
      sql`length(${table.idempotencyKey}) between 8 and 200`,
    ),
    check(
      "administrative_actions_operation_hash_check",
      sql`length(${table.operationHash}) = 64`,
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
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    creatorOwnerId: uuid("creator_owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => generationBatches.id, { onDelete: "restrict" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => generationJobs.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
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
    foreignKey({
      columns: [table.batchId, table.workspaceId],
      foreignColumns: [generationBatches.id, generationBatches.workspaceId],
      name: "assets_batch_workspace_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.jobId, table.workspaceId],
      foreignColumns: [generationJobs.id, generationJobs.workspaceId],
      name: "assets_job_workspace_fk",
    }).onDelete("restrict"),
    uniqueIndex("assets_job_ordinal_unique").on(table.jobId, table.ordinal),
    uniqueIndex("assets_object_key_unique").on(table.objectKey),
    index("assets_owner_created_idx").on(table.ownerId, table.createdAt),
    index("assets_workspace_creator_created_idx").on(
      table.workspaceId,
      table.creatorOwnerId,
      table.createdAt,
      table.id,
    ),
    check("assets_pixel_width_check", sql`${table.pixelWidth} > 0`),
    check("assets_pixel_height_check", sql`${table.pixelHeight} > 0`),
    check("assets_byte_size_check", sql`${table.byteSize} > 0`),
    check("assets_ordinal_check", sql`${table.ordinal} > 0`),
    check(
      "assets_moderation_state_check",
      sql`${table.moderationState} in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "assets_visibility_check",
      sql`${table.visibility} in ('private', 'project', 'public')`,
    ),
    check(
      "assets_creator_owner_check",
      sql`${table.creatorOwnerId} = ${table.ownerId}`,
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
