ALTER TABLE credit_ledger_entries
  ADD COLUMN IF NOT EXISTS account_deletion_request_id uuid,
  ADD COLUMN IF NOT EXISTS creative_link_deleted_at timestamptz;

ALTER TABLE credit_ledger_entries
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_account_deletion_request_fk,
  ADD CONSTRAINT credit_ledger_entries_account_deletion_request_fk
    FOREIGN KEY (account_deletion_request_id)
    REFERENCES account_deletion_register(request_id) ON DELETE RESTRICT;

ALTER TABLE credit_ledger_entries
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_relation_check,
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_creative_link_deletion_check;

ALTER TABLE credit_ledger_entries
  ADD CONSTRAINT credit_ledger_entries_relation_check CHECK (
    (
      creative_link_deleted_at IS NULL
      AND account_deletion_request_id IS NULL
      AND (
        (entry_type IN ('settle', 'release', 'refund')
          AND prior_entry_id IS NOT NULL AND related_job_id IS NOT NULL)
        OR (entry_type = 'reserve'
          AND prior_entry_id IS NULL AND related_job_id IS NOT NULL)
        OR (entry_type IN ('grant', 'expire', 'adjust'))
      )
    )
    OR (
      creative_link_deleted_at IS NOT NULL
      AND account_deletion_request_id IS NOT NULL
      AND related_job_id IS NULL
      AND entry_type IN ('reserve', 'settle', 'release', 'refund')
    )
  ),
  ADD CONSTRAINT credit_ledger_entries_creative_link_deletion_check CHECK (
    (creative_link_deleted_at IS NULL AND account_deletion_request_id IS NULL)
    OR
    (creative_link_deleted_at IS NOT NULL AND account_deletion_request_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION goodgood_guard_credit_ledger_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.related_job_id IS NOT NULL
    AND NEW.related_job_id IS NULL
    AND OLD.creative_link_deleted_at IS NULL
    AND NEW.creative_link_deleted_at IS NOT NULL
    AND OLD.account_deletion_request_id IS NULL
    AND NEW.account_deletion_request_id IS NOT NULL
    AND NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW.account_id IS NOT DISTINCT FROM OLD.account_id
    AND NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id
    AND NEW.entry_type IS NOT DISTINCT FROM OLD.entry_type
    AND NEW.amount IS NOT DISTINCT FROM OLD.amount
    AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
    AND NEW.operation_hash IS NOT DISTINCT FROM OLD.operation_hash
    AND NEW.reason IS NOT DISTINCT FROM OLD.reason
    AND NEW.related_payment_ref IS NOT DISTINCT FROM OLD.related_payment_ref
    AND NEW.prior_entry_id IS NOT DISTINCT FROM OLD.prior_entry_id
    AND NEW.actor IS NOT DISTINCT FROM OLD.actor
    AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
    AND EXISTS (
      SELECT 1
        FROM generation_jobs job
        JOIN account_deletion_register register
          ON register.request_id = NEW.account_deletion_request_id
         AND register.target_owner_id = OLD.owner_id
         AND register.state = 'processing'
        JOIN account_deletion_steps object_step
          ON object_step.request_id = register.request_id
         AND object_step.step_name = 'delete_private_objects'
         AND object_step.state = 'completed'
        JOIN account_deletion_steps creative_step
          ON creative_step.request_id = register.request_id
         AND creative_step.step_name = 'delete_creative_records'
         AND creative_step.state = 'running'
         AND creative_step.lease_expires_at > statement_timestamp()
       WHERE job.id = OLD.related_job_id
         AND job.owner_id = OLD.owner_id
    ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'credit_ledger_entries is immutable outside reviewed account deletion';
END;
$$;

DROP TRIGGER IF EXISTS credit_ledger_entries_append_only
  ON credit_ledger_entries;
CREATE TRIGGER credit_ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON credit_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION goodgood_guard_credit_ledger_entry_mutation();

ALTER TABLE account_deletion_steps
  ADD COLUMN IF NOT EXISTS last_target_creative_record_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_creative_record_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_creative_record_count integer NOT NULL DEFAULT 0;

ALTER TABLE account_deletion_steps
  DROP CONSTRAINT IF EXISTS account_deletion_steps_name_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_block_code_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_inventory_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_target_creative_record_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_deleted_creative_record_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_failed_creative_record_count_check;

ALTER TABLE account_deletion_steps
  ADD CONSTRAINT account_deletion_steps_name_check CHECK (
    step_name IN (
      'wait_for_submitted_jobs',
      'delete_private_objects',
      'delete_creative_records'
    )
  ),
  ADD CONSTRAINT account_deletion_steps_block_code_check CHECK (
    last_block_code IS NULL
    OR (
      step_name = 'wait_for_submitted_jobs'
      AND last_block_code = 'SUBMITTED_JOBS_ACTIVE'
    )
    OR (
      step_name = 'delete_private_objects'
      AND last_block_code = 'OBJECT_DELETE_FAILED'
    )
    OR (
      step_name = 'delete_creative_records'
      AND last_block_code = 'CREATIVE_DELETE_FAILED'
    )
  ),
  ADD CONSTRAINT account_deletion_steps_inventory_check CHECK (
    (
      step_name = 'wait_for_submitted_jobs'
      AND inventory_version IS NULL
      AND inventory_sha256 IS NULL
      AND last_target_object_count = 0
      AND deleted_object_count = 0
      AND last_failed_object_count = 0
      AND last_target_creative_record_count = 0
      AND deleted_creative_record_count = 0
      AND last_failed_creative_record_count = 0
    )
    OR (
      step_name = 'delete_private_objects'
      AND last_target_creative_record_count = 0
      AND deleted_creative_record_count = 0
      AND last_failed_creative_record_count = 0
      AND (
        (inventory_version IS NULL AND inventory_sha256 IS NULL)
        OR (inventory_version = 1 AND inventory_sha256 ~ '^[0-9a-f]{64}$')
      )
    )
    OR (
      step_name = 'delete_creative_records'
      AND last_target_object_count = 0
      AND deleted_object_count = 0
      AND last_failed_object_count = 0
      AND (
        (inventory_version IS NULL AND inventory_sha256 IS NULL)
        OR (inventory_version = 1 AND inventory_sha256 ~ '^[0-9a-f]{64}$')
      )
    )
  ),
  ADD CONSTRAINT account_deletion_steps_target_creative_record_count_check
    CHECK (last_target_creative_record_count >= 0),
  ADD CONSTRAINT account_deletion_steps_deleted_creative_record_count_check
    CHECK (deleted_creative_record_count >= 0),
  ADD CONSTRAINT account_deletion_steps_failed_creative_record_count_check
    CHECK (last_failed_creative_record_count >= 0);

INSERT INTO account_deletion_steps (
  request_id,
  step_name,
  state,
  next_attempt_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  register.request_id,
  'delete_creative_records',
  CASE WHEN register.state = 'completed' THEN 'completed' ELSE 'pending' END,
  CASE WHEN register.state = 'completed' THEN NULL ELSE register.created_at END,
  register.completed_at,
  register.created_at,
  register.updated_at
FROM account_deletion_register register
ON CONFLICT (request_id, step_name) DO NOTHING;
