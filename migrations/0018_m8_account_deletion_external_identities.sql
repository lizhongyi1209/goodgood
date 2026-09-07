ALTER TABLE auth_identities
  ADD COLUMN IF NOT EXISTS external_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_deleted_at timestamptz;

ALTER TABLE auth_identities
  DROP CONSTRAINT IF EXISTS auth_identities_external_deletion_check;

ALTER TABLE auth_identities
  ADD CONSTRAINT auth_identities_external_deletion_check CHECK (
    external_deleted_at IS NULL
    OR (
      external_disabled_at IS NOT NULL
      AND external_deleted_at >= external_disabled_at
    )
  );

CREATE INDEX IF NOT EXISTS auth_identities_owner_external_pending_idx
  ON auth_identities (owner_id, id)
  WHERE external_deleted_at IS NULL;

ALTER TABLE account_deletion_steps
  ADD COLUMN IF NOT EXISTS last_target_identity_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disabled_identity_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_identity_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_identity_count integer NOT NULL DEFAULT 0;

ALTER TABLE account_deletion_steps
  DROP CONSTRAINT IF EXISTS account_deletion_steps_name_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_block_code_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_inventory_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_target_identity_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_disabled_identity_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_deleted_identity_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_failed_identity_count_check;

ALTER TABLE account_deletion_steps
  ADD CONSTRAINT account_deletion_steps_name_check CHECK (
    step_name IN (
      'wait_for_submitted_jobs',
      'delete_private_objects',
      'delete_creative_records',
      'delete_external_identities'
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
    )
  ),
  ADD CONSTRAINT account_deletion_steps_target_identity_count_check CHECK (
    last_target_identity_count >= 0
  ),
  ADD CONSTRAINT account_deletion_steps_disabled_identity_count_check CHECK (
    disabled_identity_count >= 0
    AND disabled_identity_count <= last_target_identity_count
  ),
  ADD CONSTRAINT account_deletion_steps_deleted_identity_count_check CHECK (
    deleted_identity_count >= 0
    AND deleted_identity_count <= disabled_identity_count
  ),
  ADD CONSTRAINT account_deletion_steps_failed_identity_count_check CHECK (
    last_failed_identity_count >= 0
    AND last_failed_identity_count <= last_target_identity_count
  );

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
  'delete_external_identities',
  CASE WHEN register.state = 'completed' THEN 'completed' ELSE 'pending' END,
  CASE WHEN register.state = 'completed' THEN NULL ELSE register.created_at END,
  register.completed_at,
  register.created_at,
  register.updated_at
FROM account_deletion_register register
ON CONFLICT (request_id, step_name) DO NOTHING;
