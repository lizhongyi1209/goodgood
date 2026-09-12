CREATE TABLE IF NOT EXISTS workspace_credit_accounts (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  unit text NOT NULL DEFAULT 'credit',
  available_balance bigint NOT NULL DEFAULT 0,
  reserved_balance bigint NOT NULL DEFAULT 0,
  allocated_balance bigint NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_credit_accounts_workspace_unit_unique
    UNIQUE (workspace_id, unit),
  CONSTRAINT workspace_credit_accounts_id_workspace_unique
    UNIQUE (id, workspace_id),
  CONSTRAINT workspace_credit_accounts_unit_check
    CHECK (length(unit) BETWEEN 1 AND 32),
  CONSTRAINT workspace_credit_accounts_balance_check CHECK (
    available_balance >= 0 AND reserved_balance >= 0
    AND allocated_balance >= 0
    AND allocated_balance <= available_balance + reserved_balance
  ),
  CONSTRAINT workspace_credit_accounts_version_check CHECK (version >= 0),
  CONSTRAINT workspace_credit_accounts_status_check
    CHECK (status IN ('active', 'frozen', 'closed'))
);

CREATE INDEX IF NOT EXISTS workspace_credit_accounts_workspace_idx
  ON workspace_credit_accounts (workspace_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_memberships_id_workspace_unique
  ON workspace_memberships (id, workspace_id);

CREATE TABLE IF NOT EXISTS member_budgets (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  membership_id uuid NOT NULL,
  credit_limit bigint NOT NULL DEFAULT 0,
  settled_usage bigint NOT NULL DEFAULT 0,
  reserved_usage bigint NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_budgets_membership_workspace_fk
    FOREIGN KEY (membership_id, workspace_id)
    REFERENCES workspace_memberships(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT member_budgets_membership_unique UNIQUE (membership_id),
  CONSTRAINT member_budgets_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT member_budgets_amount_check CHECK (
    credit_limit >= 0 AND settled_usage >= 0 AND reserved_usage >= 0
    AND settled_usage + reserved_usage <= credit_limit
  ),
  CONSTRAINT member_budgets_version_check CHECK (version >= 0),
  CONSTRAINT member_budgets_status_check
    CHECK (status IN ('active', 'closed'))
);

CREATE INDEX IF NOT EXISTS member_budgets_workspace_status_idx
  ON member_budgets (workspace_id, status, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS workspace_credit_ledger_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  member_budget_id uuid,
  entry_type text NOT NULL,
  amount bigint NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  reason text NOT NULL,
  related_job_id uuid,
  prior_entry_id uuid REFERENCES workspace_credit_ledger_entries(id) ON DELETE RESTRICT,
  actor text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_credit_ledger_account_workspace_fk
    FOREIGN KEY (account_id, workspace_id)
    REFERENCES workspace_credit_accounts(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT workspace_credit_ledger_budget_workspace_fk
    FOREIGN KEY (member_budget_id, workspace_id)
    REFERENCES member_budgets(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT workspace_credit_ledger_account_idempotency_unique
    UNIQUE (account_id, idempotency_key),
  CONSTRAINT workspace_credit_ledger_type_check
    CHECK (entry_type IN ('grant', 'reserve', 'settle', 'release')),
  CONSTRAINT workspace_credit_ledger_amount_check CHECK (
    (entry_type IN ('grant', 'release') AND amount > 0)
    OR (entry_type IN ('reserve', 'settle') AND amount < 0)
  ),
  CONSTRAINT workspace_credit_ledger_reason_check
    CHECK (length(reason) BETWEEN 2 AND 200),
  CONSTRAINT workspace_credit_ledger_idempotency_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT workspace_credit_ledger_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT workspace_credit_ledger_actor_check
    CHECK (length(actor) BETWEEN 2 AND 100),
  CONSTRAINT workspace_credit_ledger_relation_check CHECK (
    (entry_type = 'grant' AND member_budget_id IS NULL
      AND related_job_id IS NULL AND prior_entry_id IS NULL)
    OR (entry_type = 'reserve' AND member_budget_id IS NOT NULL
      AND related_job_id IS NOT NULL AND prior_entry_id IS NULL)
    OR (entry_type IN ('settle', 'release') AND member_budget_id IS NOT NULL
      AND related_job_id IS NOT NULL AND prior_entry_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS workspace_credit_ledger_workspace_created_idx
  ON workspace_credit_ledger_entries (workspace_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS workspace_credit_ledger_job_idx
  ON workspace_credit_ledger_entries (related_job_id, created_at, id)
  WHERE related_job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspace_credit_ledger_reserve_job_unique
  ON workspace_credit_ledger_entries (workspace_id, related_job_id)
  WHERE entry_type = 'reserve';
CREATE UNIQUE INDEX IF NOT EXISTS workspace_credit_ledger_close_unique
  ON workspace_credit_ledger_entries (prior_entry_id)
  WHERE entry_type IN ('settle', 'release');

CREATE TABLE IF NOT EXISTS member_budget_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  member_budget_id uuid NOT NULL,
  credit_ledger_entry_id uuid REFERENCES workspace_credit_ledger_entries(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  amount bigint NOT NULL,
  actor_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  actor text NOT NULL,
  related_job_id uuid,
  prior_event_id uuid REFERENCES member_budget_events(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_budget_events_budget_workspace_fk
    FOREIGN KEY (member_budget_id, workspace_id)
    REFERENCES member_budgets(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT member_budget_events_workspace_idempotency_unique
    UNIQUE (workspace_id, idempotency_key),
  CONSTRAINT member_budget_events_credit_entry_unique
    UNIQUE (credit_ledger_entry_id),
  CONSTRAINT member_budget_events_type_check
    CHECK (event_type IN ('allocate', 'reclaim', 'reserve', 'settle', 'release')),
  CONSTRAINT member_budget_events_amount_check CHECK (amount > 0),
  CONSTRAINT member_budget_events_actor_check
    CHECK (length(actor) BETWEEN 2 AND 100),
  CONSTRAINT member_budget_events_reason_check
    CHECK (length(reason) BETWEEN 2 AND 200),
  CONSTRAINT member_budget_events_idempotency_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT member_budget_events_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT member_budget_events_relation_check CHECK (
    (event_type IN ('allocate', 'reclaim')
      AND actor_owner_id IS NOT NULL AND related_job_id IS NULL
      AND prior_event_id IS NULL AND credit_ledger_entry_id IS NULL)
    OR (event_type = 'reserve' AND actor_owner_id IS NOT NULL
      AND related_job_id IS NOT NULL AND prior_event_id IS NULL
      AND credit_ledger_entry_id IS NOT NULL)
    OR (event_type IN ('settle', 'release') AND actor_owner_id IS NULL
      AND related_job_id IS NOT NULL
      AND prior_event_id IS NOT NULL AND credit_ledger_entry_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS member_budget_events_budget_created_idx
  ON member_budget_events (member_budget_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS member_budget_events_reserve_job_unique
  ON member_budget_events (workspace_id, related_job_id)
  WHERE event_type = 'reserve';
CREATE UNIQUE INDEX IF NOT EXISTS member_budget_events_close_unique
  ON member_budget_events (prior_event_id)
  WHERE event_type IN ('settle', 'release');

ALTER TABLE workspace_audit_events
  DROP CONSTRAINT IF EXISTS workspace_audit_events_action_check;
ALTER TABLE workspace_audit_events
  ADD CONSTRAINT workspace_audit_events_action_check CHECK (action_type IN (
    'create_organization',
    'invite_member',
    'accept_invitation',
    'revoke_invitation',
    'change_member_role',
    'suspend_member',
    'restore_member',
    'remove_member',
    'grant_organization_credits',
    'set_member_budget'
  ));

DROP TRIGGER IF EXISTS workspace_credit_ledger_entries_append_only
  ON workspace_credit_ledger_entries;
CREATE TRIGGER workspace_credit_ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON workspace_credit_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

DROP TRIGGER IF EXISTS member_budget_events_append_only
  ON member_budget_events;
CREATE TRIGGER member_budget_events_append_only
  BEFORE UPDATE OR DELETE ON member_budget_events
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
