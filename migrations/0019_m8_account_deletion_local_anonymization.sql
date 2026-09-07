ALTER TABLE users
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_anonymized_check;

ALTER TABLE users
  ADD CONSTRAINT users_anonymized_check CHECK (
    anonymized_at IS NULL
    OR (
      status = 'suspended'
      AND email ~ '^deleted-[a-f0-9]{32}@deleted[.]goodgood[.]invalid$'
    )
  );

ALTER TABLE account_deletion_register
  ADD COLUMN IF NOT EXISTS audit_retention_until timestamptz;

UPDATE account_deletion_register
   SET audit_retention_until = completed_at + interval '12 months'
 WHERE state = 'completed'
   AND completed_at IS NOT NULL
   AND audit_retention_until IS NULL;

ALTER TABLE account_deletion_register
  DROP CONSTRAINT IF EXISTS account_deletion_register_completion_check,
  DROP CONSTRAINT IF EXISTS account_deletion_register_audit_retention_check;

ALTER TABLE account_deletion_register
  ADD CONSTRAINT account_deletion_register_completion_check CHECK (
    (
      state = 'processing'
      AND completed_at IS NULL
      AND audit_retention_until IS NULL
    )
    OR (
      state = 'completed'
      AND completed_at IS NOT NULL
      AND audit_retention_until IS NOT NULL
    )
  ),
  ADD CONSTRAINT account_deletion_register_audit_retention_check CHECK (
    audit_retention_until IS NULL
    OR audit_retention_until = completed_at + interval '12 months'
  );

ALTER TABLE account_deletion_steps
  ADD COLUMN IF NOT EXISTS deleted_local_session_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_local_identity_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expired_credit_amount bigint NOT NULL DEFAULT 0;

ALTER TABLE account_deletion_steps
  DROP CONSTRAINT IF EXISTS account_deletion_steps_name_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_block_code_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_inventory_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_deleted_local_session_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_deleted_local_identity_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_expired_credit_amount_check;

ALTER TABLE account_deletion_steps
  ADD CONSTRAINT account_deletion_steps_name_check CHECK (
    step_name IN (
      'wait_for_submitted_jobs',
      'delete_private_objects',
      'delete_creative_records',
      'delete_external_identities',
      'anonymize_goodgood_account'
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
    OR (
      step_name = 'delete_external_identities'
      AND last_block_code = 'IDENTITY_DELETE_FAILED'
    )
    OR (
      step_name = 'anonymize_goodgood_account'
      AND last_block_code = 'LOCAL_ANONYMIZATION_FAILED'
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
      AND last_target_identity_count = 0
      AND disabled_identity_count = 0
      AND deleted_identity_count = 0
      AND last_failed_identity_count = 0
      AND deleted_local_session_count = 0
      AND deleted_local_identity_count = 0
      AND expired_credit_amount = 0
    )
    OR (
      step_name = 'delete_private_objects'
      AND last_target_creative_record_count = 0
      AND deleted_creative_record_count = 0
      AND last_failed_creative_record_count = 0
      AND last_target_identity_count = 0
      AND disabled_identity_count = 0
      AND deleted_identity_count = 0
      AND last_failed_identity_count = 0
      AND deleted_local_session_count = 0
      AND deleted_local_identity_count = 0
      AND expired_credit_amount = 0
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
      AND last_target_identity_count = 0
      AND disabled_identity_count = 0
      AND deleted_identity_count = 0
      AND last_failed_identity_count = 0
      AND deleted_local_session_count = 0
      AND deleted_local_identity_count = 0
      AND expired_credit_amount = 0
      AND (
        (inventory_version IS NULL AND inventory_sha256 IS NULL)
        OR (inventory_version = 1 AND inventory_sha256 ~ '^[0-9a-f]{64}$')
      )
    )
    OR (
      step_name = 'delete_external_identities'
      AND inventory_version IS NULL
      AND inventory_sha256 IS NULL
      AND last_target_object_count = 0
      AND deleted_object_count = 0
      AND last_failed_object_count = 0
      AND last_target_creative_record_count = 0
      AND deleted_creative_record_count = 0
      AND last_failed_creative_record_count = 0
      AND deleted_local_session_count = 0
      AND deleted_local_identity_count = 0
      AND expired_credit_amount = 0
    )
    OR (
      step_name = 'anonymize_goodgood_account'
      AND inventory_version IS NULL
      AND inventory_sha256 IS NULL
      AND last_target_object_count = 0
      AND deleted_object_count = 0
      AND last_failed_object_count = 0
      AND last_target_creative_record_count = 0
      AND deleted_creative_record_count = 0
      AND last_failed_creative_record_count = 0
      AND last_target_identity_count = 0
      AND disabled_identity_count = 0
      AND deleted_identity_count = 0
      AND last_failed_identity_count = 0
    )
  ),
  ADD CONSTRAINT account_deletion_steps_deleted_local_session_count_check
    CHECK (deleted_local_session_count >= 0),
  ADD CONSTRAINT account_deletion_steps_deleted_local_identity_count_check
    CHECK (deleted_local_identity_count >= 0),
  ADD CONSTRAINT account_deletion_steps_expired_credit_amount_check
    CHECK (expired_credit_amount >= 0);

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
  'anonymize_goodgood_account',
  CASE WHEN register.state = 'completed' THEN 'completed' ELSE 'pending' END,
  CASE WHEN register.state = 'completed' THEN NULL ELSE register.created_at END,
  register.completed_at,
  register.created_at,
  register.updated_at
FROM account_deletion_register register
ON CONFLICT (request_id, step_name) DO NOTHING;
