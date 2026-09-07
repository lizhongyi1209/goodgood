ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS object_deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS assets_owner_live_object_idx
  ON assets (owner_id, id)
  WHERE object_deleted_at IS NULL;

ALTER TABLE account_deletion_steps
  ADD COLUMN IF NOT EXISTS inventory_version integer,
  ADD COLUMN IF NOT EXISTS inventory_sha256 text,
  ADD COLUMN IF NOT EXISTS last_target_object_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_object_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_object_count integer NOT NULL DEFAULT 0;

ALTER TABLE account_deletion_steps
  DROP CONSTRAINT IF EXISTS account_deletion_steps_name_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_block_code_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_inventory_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_target_object_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_deleted_object_count_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_failed_object_count_check;

ALTER TABLE account_deletion_steps
  ADD CONSTRAINT account_deletion_steps_name_check
    CHECK (step_name IN ('wait_for_submitted_jobs', 'delete_private_objects')),
  ADD CONSTRAINT account_deletion_steps_block_code_check CHECK (
    last_block_code IS NULL
    OR last_block_code IN ('SUBMITTED_JOBS_ACTIVE', 'OBJECT_DELETE_FAILED')
  ),
  ADD CONSTRAINT account_deletion_steps_inventory_check CHECK (
    (inventory_version IS NULL AND inventory_sha256 IS NULL)
    OR (inventory_version = 1 AND length(inventory_sha256) = 64)
  ),
  ADD CONSTRAINT account_deletion_steps_target_object_count_check
    CHECK (last_target_object_count >= 0),
  ADD CONSTRAINT account_deletion_steps_deleted_object_count_check
    CHECK (deleted_object_count >= 0),
  ADD CONSTRAINT account_deletion_steps_failed_object_count_check
    CHECK (last_failed_object_count >= 0);

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
  'delete_private_objects',
  CASE WHEN register.state = 'completed' THEN 'completed' ELSE 'pending' END,
  CASE WHEN register.state = 'completed' THEN NULL ELSE register.created_at END,
  register.completed_at,
  register.created_at,
  register.updated_at
FROM account_deletion_register register
ON CONFLICT (request_id, step_name) DO NOTHING;
