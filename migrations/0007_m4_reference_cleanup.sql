ALTER TABLE reference_assets
  ADD COLUMN IF NOT EXISTS cleanup_eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleanup_lease_owner text,
  ADD COLUMN IF NOT EXISTS cleanup_lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleanup_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleanup_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleanup_error_code text,
  ADD COLUMN IF NOT EXISTS object_deleted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'reference_assets_cleanup_attempt_count_check'
  ) THEN
    ALTER TABLE reference_assets
      ADD CONSTRAINT reference_assets_cleanup_attempt_count_check
      CHECK (cleanup_attempt_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reference_assets_cleanup_due_idx
  ON reference_assets (cleanup_eligible_at, id)
  WHERE object_deleted_at IS NULL;
