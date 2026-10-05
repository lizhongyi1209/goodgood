ALTER TABLE reference_assets
  ADD COLUMN IF NOT EXISTS declared_checksum text,
  ADD COLUMN IF NOT EXISTS upload_client_key text,
  ADD COLUMN IF NOT EXISTS upload_reuse_existing boolean NOT NULL DEFAULT true;

ALTER TABLE reference_assets ADD CONSTRAINT reference_assets_declared_checksum_check
  CHECK (declared_checksum IS NULL OR declared_checksum ~ '^[0-9a-f]{64}$');
ALTER TABLE reference_assets ADD CONSTRAINT reference_assets_upload_client_key_check
  CHECK (upload_client_key IS NULL OR upload_client_key ~ '^[0-9a-f]{64}$');

CREATE INDEX reference_assets_upload_client_key_idx
  ON reference_assets (workspace_id, creator_owner_id, upload_client_key)
  WHERE upload_client_key IS NOT NULL AND object_deleted_at IS NULL;
CREATE INDEX reference_assets_ready_checksum_idx
  ON reference_assets (workspace_id, creator_owner_id, checksum)
  WHERE upload_state = 'ready' AND moderation_state = 'accepted' AND object_deleted_at IS NULL;
CREATE INDEX reference_assets_pending_checksum_idx
  ON reference_assets (workspace_id, creator_owner_id, declared_checksum)
  WHERE upload_state = 'pending' AND declared_checksum IS NOT NULL AND object_deleted_at IS NULL;
