ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;

UPDATE users
   SET status = 'suspended', updated_at = now()
 WHERE status = 'disabled';

ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS account_tier text NOT NULL DEFAULT 'seed',
  ADD CONSTRAINT users_status_check
    CHECK (status IN ('pending', 'active', 'suspended')),
  ADD CONSTRAINT users_account_tier_check
    CHECK (account_tier IN ('seed'));

CREATE TABLE IF NOT EXISTS system_role_assignments (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  source text NOT NULL,
  assigned_by_operator_id text NOT NULL,
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_role_assignments_role_check
    CHECK (role IN ('site_owner')),
  CONSTRAINT system_role_assignments_source_check
    CHECK (source IN ('bootstrap')),
  CONSTRAINT system_role_assignments_operator_check
    CHECK (length(assigned_by_operator_id) BETWEEN 2 AND 100),
  CONSTRAINT system_role_assignments_reason_check
    CHECK (length(reason) BETWEEN 1 AND 200),
  CONSTRAINT system_role_assignments_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT system_role_assignments_operation_hash_check
    CHECK (length(operation_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS system_role_assignments_owner_role_unique
  ON system_role_assignments (owner_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS system_role_assignments_idempotency_unique
  ON system_role_assignments (idempotency_key);

CREATE TABLE IF NOT EXISTS administrative_actions (
  id uuid PRIMARY KEY,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type text NOT NULL,
  previous_status text,
  resulting_status text,
  credit_amount bigint,
  credit_ledger_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT administrative_actions_type_check
    CHECK (action_type IN (
      'bootstrap_site_owner',
      'approve_account',
      'suspend_account',
      'restore_account',
      'grant_test_credits'
    )),
  CONSTRAINT administrative_actions_status_check CHECK (
    (
      action_type = 'bootstrap_site_owner'
      AND previous_status IN ('pending', 'active')
      AND resulting_status = 'active'
      AND credit_amount IS NULL
      AND credit_ledger_entry_id IS NULL
    ) OR (
      action_type IN ('approve_account', 'suspend_account', 'restore_account')
      AND previous_status IN ('pending', 'active', 'suspended')
      AND resulting_status IN ('active', 'suspended')
      AND credit_amount IS NULL
      AND credit_ledger_entry_id IS NULL
    ) OR (
      action_type = 'grant_test_credits'
      AND previous_status IS NULL
      AND resulting_status IS NULL
      AND credit_amount BETWEEN 1 AND 5000
      AND credit_ledger_entry_id IS NOT NULL
    )
  ),
  CONSTRAINT administrative_actions_reason_check
    CHECK (length(reason) BETWEEN 1 AND 200),
  CONSTRAINT administrative_actions_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT administrative_actions_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT administrative_actions_actor_idempotency_unique
    UNIQUE (actor_owner_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS administrative_actions_credit_entry_unique
  ON administrative_actions (credit_ledger_entry_id)
  WHERE credit_ledger_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS administrative_actions_target_created_idx
  ON administrative_actions (target_owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS administrative_actions_created_idx
  ON administrative_actions (created_at DESC, id DESC);

DROP TRIGGER IF EXISTS system_role_assignments_append_only
  ON system_role_assignments;
CREATE TRIGGER system_role_assignments_append_only
  BEFORE UPDATE OR DELETE ON system_role_assignments
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

DROP TRIGGER IF EXISTS administrative_actions_append_only
  ON administrative_actions;
CREATE TRIGGER administrative_actions_append_only
  BEFORE UPDATE OR DELETE ON administrative_actions
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
