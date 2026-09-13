-- Remove catalog entries without deleting immutable audit or generation history.
ALTER TABLE managed_models ADD COLUMN archived_at timestamptz;
ALTER TABLE managed_models ADD CONSTRAINT managed_models_archive_disabled
  CHECK (archived_at IS NULL OR enabled = false);
