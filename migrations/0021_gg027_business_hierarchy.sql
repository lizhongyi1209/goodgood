CREATE TABLE IF NOT EXISTS business_role_assignments (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  assigned_by_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assignment_reason text NOT NULL,
  assigned_idempotency_key text NOT NULL,
  assigned_operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_by_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  end_reason text,
  ended_idempotency_key text,
  ended_operation_hash text,
  CONSTRAINT business_role_assignments_role_check
    CHECK (role IN ('enterprise', 'distributor')),
  CONSTRAINT business_role_assignments_assignment_reason_check
    CHECK (length(assignment_reason) BETWEEN 2 AND 200),
  CONSTRAINT business_role_assignments_assigned_idempotency_key_check
    CHECK (length(assigned_idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT business_role_assignments_assigned_operation_hash_check
    CHECK (length(assigned_operation_hash) = 64),
  CONSTRAINT business_role_assignments_end_shape_check
    CHECK (
      (ended_at IS NULL AND ended_by_owner_id IS NULL AND end_reason IS NULL
        AND ended_idempotency_key IS NULL AND ended_operation_hash IS NULL)
      OR
      (ended_at IS NOT NULL AND ended_at >= created_at
        AND ended_by_owner_id IS NOT NULL
        AND length(end_reason) BETWEEN 2 AND 200
        AND length(ended_idempotency_key) BETWEEN 8 AND 200
        AND length(ended_operation_hash) = 64)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS business_role_assignments_active_owner_unique
  ON business_role_assignments (owner_id)
  WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS business_role_assignments_assigned_action_unique
  ON business_role_assignments (assigned_by_owner_id, assigned_idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS business_role_assignments_ended_action_unique
  ON business_role_assignments (ended_by_owner_id, ended_idempotency_key)
  WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_role_assignments_owner_history_idx
  ON business_role_assignments (owner_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS account_relationships (
  id uuid PRIMARY KEY,
  parent_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  child_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  relationship_reason text NOT NULL,
  created_idempotency_key text NOT NULL,
  created_operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_by_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  end_reason text,
  ended_idempotency_key text,
  ended_operation_hash text,
  CONSTRAINT account_relationships_distinct_owners_check
    CHECK (parent_owner_id <> child_owner_id),
  CONSTRAINT account_relationships_reason_check
    CHECK (length(relationship_reason) BETWEEN 2 AND 200),
  CONSTRAINT account_relationships_created_idempotency_key_check
    CHECK (length(created_idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT account_relationships_created_operation_hash_check
    CHECK (length(created_operation_hash) = 64),
  CONSTRAINT account_relationships_end_shape_check
    CHECK (
      (ended_at IS NULL AND ended_by_owner_id IS NULL AND end_reason IS NULL
        AND ended_idempotency_key IS NULL AND ended_operation_hash IS NULL)
      OR
      (ended_at IS NOT NULL AND ended_at >= created_at
        AND ended_by_owner_id IS NOT NULL
        AND length(end_reason) BETWEEN 2 AND 200
        AND length(ended_idempotency_key) BETWEEN 8 AND 200
        AND length(ended_operation_hash) = 64)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS account_relationships_active_child_unique
  ON account_relationships (child_owner_id)
  WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS account_relationships_created_action_unique
  ON account_relationships (created_by_owner_id, created_idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS account_relationships_ended_action_unique
  ON account_relationships (ended_by_owner_id, ended_idempotency_key)
  WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS account_relationships_active_parent_idx
  ON account_relationships (parent_owner_id, child_owner_id)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS account_relationships_child_history_idx
  ON account_relationships (child_owner_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION goodgood_guard_assignment_interval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
  END IF;
  IF OLD.ended_at IS NOT NULL
     OR NEW.ended_at IS NULL
     OR NEW.ended_by_owner_id IS NULL
     OR NEW.end_reason IS NULL
     OR NEW.ended_idempotency_key IS NULL
     OR NEW.ended_operation_hash IS NULL
     OR ROW(NEW.id, NEW.owner_id, NEW.role, NEW.assigned_by_owner_id,
            NEW.assignment_reason, NEW.assigned_idempotency_key,
            NEW.assigned_operation_hash, NEW.created_at)
        IS DISTINCT FROM
        ROW(OLD.id, OLD.owner_id, OLD.role, OLD.assigned_by_owner_id,
            OLD.assignment_reason, OLD.assigned_idempotency_key,
            OLD.assigned_operation_hash, OLD.created_at) THEN
    RAISE EXCEPTION 'business role assignment may only be ended once';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_role_assignments_guard
  ON business_role_assignments;
CREATE TRIGGER business_role_assignments_guard
  BEFORE UPDATE OR DELETE ON business_role_assignments
  FOR EACH ROW EXECUTE FUNCTION goodgood_guard_assignment_interval();

CREATE OR REPLACE FUNCTION goodgood_guard_relationship_interval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
  END IF;
  IF OLD.ended_at IS NOT NULL
     OR NEW.ended_at IS NULL
     OR NEW.ended_by_owner_id IS NULL
     OR NEW.end_reason IS NULL
     OR NEW.ended_idempotency_key IS NULL
     OR NEW.ended_operation_hash IS NULL
     OR ROW(NEW.id, NEW.parent_owner_id, NEW.child_owner_id,
            NEW.created_by_owner_id, NEW.relationship_reason,
            NEW.created_idempotency_key, NEW.created_operation_hash,
            NEW.created_at)
        IS DISTINCT FROM
        ROW(OLD.id, OLD.parent_owner_id, OLD.child_owner_id,
            OLD.created_by_owner_id, OLD.relationship_reason,
            OLD.created_idempotency_key, OLD.created_operation_hash,
            OLD.created_at) THEN
    RAISE EXCEPTION 'account relationship may only be ended once';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_relationships_guard
  ON account_relationships;
CREATE TRIGGER account_relationships_guard
  BEFORE UPDATE OR DELETE ON account_relationships
  FOR EACH ROW EXECUTE FUNCTION goodgood_guard_relationship_interval();

ALTER TABLE administrative_actions
  ADD COLUMN IF NOT EXISTS previous_business_role text,
  ADD COLUMN IF NOT EXISTS resulting_business_role text,
  ADD COLUMN IF NOT EXISTS business_role_assignment_id uuid
    REFERENCES business_role_assignments(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS previous_parent_owner_id uuid
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS resulting_parent_owner_id uuid
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS account_relationship_id uuid
    REFERENCES account_relationships(id) ON DELETE RESTRICT;

ALTER TABLE administrative_actions
  DROP CONSTRAINT IF EXISTS administrative_actions_type_check,
  DROP CONSTRAINT IF EXISTS administrative_actions_status_check;

ALTER TABLE administrative_actions
  ADD CONSTRAINT administrative_actions_type_check
    CHECK (action_type IN (
      'bootstrap_site_owner', 'approve_account', 'suspend_account',
      'restore_account', 'grant_test_credits', 'set_business_role',
      'set_direct_parent'
    )),
  ADD CONSTRAINT administrative_actions_status_check
    CHECK (
      (action_type = 'bootstrap_site_owner'
        AND previous_status IN ('pending', 'active')
        AND resulting_status = 'active'
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type IN ('approve_account', 'suspend_account', 'restore_account')
        AND previous_status IN ('pending', 'active', 'suspended')
        AND resulting_status IN ('active', 'suspended')
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type = 'grant_test_credits'
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount BETWEEN 1 AND 5000
        AND credit_ledger_entry_id IS NOT NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type = 'set_business_role'
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND (previous_business_role IS NULL OR previous_business_role IN ('enterprise', 'distributor'))
        AND (resulting_business_role IS NULL OR resulting_business_role IN ('enterprise', 'distributor'))
        AND previous_business_role IS DISTINCT FROM resulting_business_role
        AND business_role_assignment_id IS NOT NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type = 'set_direct_parent'
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS DISTINCT FROM resulting_parent_owner_id
        AND account_relationship_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS administrative_actions_business_role_assignment_idx
  ON administrative_actions (business_role_assignment_id)
  WHERE business_role_assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS administrative_actions_account_relationship_idx
  ON administrative_actions (account_relationship_id)
  WHERE account_relationship_id IS NOT NULL;
