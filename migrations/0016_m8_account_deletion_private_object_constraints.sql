ALTER TABLE account_deletion_steps
  DROP CONSTRAINT IF EXISTS account_deletion_steps_block_code_check,
  DROP CONSTRAINT IF EXISTS account_deletion_steps_inventory_check;

ALTER TABLE account_deletion_steps
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
  ),
  ADD CONSTRAINT account_deletion_steps_inventory_check CHECK (
    (
      step_name = 'wait_for_submitted_jobs'
      AND inventory_version IS NULL
      AND inventory_sha256 IS NULL
      AND last_target_object_count = 0
      AND deleted_object_count = 0
      AND last_failed_object_count = 0
    )
    OR (
      step_name = 'delete_private_objects'
      AND (
        (inventory_version IS NULL AND inventory_sha256 IS NULL)
        OR (
          inventory_version = 1
          AND inventory_sha256 ~ '^[0-9a-f]{64}$'
        )
      )
    )
  );
