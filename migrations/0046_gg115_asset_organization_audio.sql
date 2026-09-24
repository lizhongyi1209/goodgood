-- Add organization metadata without moving or rewriting existing private objects.
CREATE TABLE asset_folders (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id, owner_id)
);
CREATE UNIQUE INDEX asset_folders_owner_name_idx
  ON asset_folders (workspace_id, owner_id, lower(name));

CREATE TABLE asset_organization (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_kind text NOT NULL CHECK (asset_kind IN ('generated', 'reference', 'video', 'audio')),
  asset_id uuid NOT NULL,
  folder_id uuid,
  tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 8),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, owner_id, asset_kind, asset_id),
  FOREIGN KEY (folder_id, workspace_id, owner_id)
    REFERENCES asset_folders (id, workspace_id, owner_id) ON DELETE RESTRICT
);
CREATE INDEX asset_organization_folder_idx
  ON asset_organization (workspace_id, owner_id, folder_id);

CREATE TABLE audio_materials (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  object_key text NOT NULL UNIQUE,
  original_file_name text NOT NULL CHECK (char_length(original_file_name) BETWEEN 1 AND 255),
  declared_mime_type text NOT NULL CHECK (declared_mime_type = 'audio/mpeg'),
  declared_byte_size bigint NOT NULL CHECK (declared_byte_size BETWEEN 1 AND 20971520),
  upload_state text NOT NULL DEFAULT 'pending'
    CHECK (upload_state IN ('pending', 'ready', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL,
  uploaded_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audio_materials_owner_ready_idx
  ON audio_materials (workspace_id, owner_id, upload_state, uploaded_at DESC);

ALTER TABLE feedback_images DROP CONSTRAINT feedback_images_byte_size_check;
ALTER TABLE feedback_images ADD CONSTRAINT feedback_images_byte_size_check
  CHECK (byte_size BETWEEN 1 AND 20971520);
