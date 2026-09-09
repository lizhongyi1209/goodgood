ALTER TABLE credit_ledger_entries
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_type_check,
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_amount_sign_check,
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_actor_check,
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_relation_check;

ALTER TABLE credit_ledger_entries
  ADD CONSTRAINT credit_ledger_entries_type_check
    CHECK (entry_type IN (
      'grant', 'reserve', 'settle', 'release', 'refund', 'expire', 'adjust',
      'transfer_out', 'transfer_in'
    )),
  ADD CONSTRAINT credit_ledger_entries_amount_sign_check
    CHECK (
      (entry_type IN ('grant', 'release', 'refund', 'transfer_in') AND amount > 0)
      OR (entry_type IN ('reserve', 'settle', 'expire', 'transfer_out') AND amount < 0)
      OR (entry_type = 'adjust' AND amount <> 0)
    ),
  ADD CONSTRAINT credit_ledger_entries_actor_check
    CHECK (actor IN ('system', 'worker', 'operator', 'payment', 'owner')),
  ADD CONSTRAINT credit_ledger_entries_relation_check
    CHECK (
      (entry_type IN ('settle', 'release', 'refund')
        AND prior_entry_id IS NOT NULL AND related_job_id IS NOT NULL)
      OR (entry_type = 'reserve'
        AND prior_entry_id IS NULL AND related_job_id IS NOT NULL)
      OR (entry_type IN ('transfer_out', 'transfer_in')
        AND prior_entry_id IS NULL AND related_job_id IS NULL
        AND related_payment_ref IS NULL)
      OR (entry_type IN ('grant', 'expire', 'adjust'))
    );

CREATE TABLE IF NOT EXISTS credit_transfers (
  id uuid PRIMARY KEY,
  public_id text NOT NULL,
  parent_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  child_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  relationship_id uuid NOT NULL REFERENCES account_relationships(id) ON DELETE RESTRICT,
  unit text NOT NULL,
  amount bigint NOT NULL,
  parent_ledger_entry_id uuid NOT NULL REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  child_ledger_entry_id uuid NOT NULL REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  remark text,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_transfers_public_id_unique UNIQUE (public_id),
  CONSTRAINT credit_transfers_parent_idempotency_unique
    UNIQUE (parent_owner_id, idempotency_key),
  CONSTRAINT credit_transfers_parent_entry_unique UNIQUE (parent_ledger_entry_id),
  CONSTRAINT credit_transfers_child_entry_unique UNIQUE (child_ledger_entry_id),
  CONSTRAINT credit_transfers_public_id_check
    CHECK (public_id ~ '^trf_[0-9a-f]{32}$'),
  CONSTRAINT credit_transfers_owner_shape_check
    CHECK (parent_owner_id <> child_owner_id AND actor_owner_id = parent_owner_id),
  CONSTRAINT credit_transfers_unit_check CHECK (unit = 'credit'),
  CONSTRAINT credit_transfers_amount_check CHECK (amount > 0),
  CONSTRAINT credit_transfers_entry_shape_check
    CHECK (parent_ledger_entry_id <> child_ledger_entry_id),
  CONSTRAINT credit_transfers_remark_check
    CHECK (remark IS NULL OR length(remark) BETWEEN 1 AND 200),
  CONSTRAINT credit_transfers_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT credit_transfers_operation_hash_check
    CHECK (length(operation_hash) = 64)
);

CREATE INDEX IF NOT EXISTS credit_transfers_parent_created_idx
  ON credit_transfers (parent_owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS credit_transfers_child_created_idx
  ON credit_transfers (child_owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS credit_transfers_relationship_created_idx
  ON credit_transfers (relationship_id, created_at DESC, id DESC);

DROP TRIGGER IF EXISTS credit_transfers_append_only ON credit_transfers;
CREATE TRIGGER credit_transfers_append_only
  BEFORE UPDATE OR DELETE ON credit_transfers
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
