CREATE TABLE IF NOT EXISTS video_materials (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  object_key text NOT NULL UNIQUE,
  original_file_name text NOT NULL,
  declared_mime_type text NOT NULL,
  declared_byte_size bigint NOT NULL,
  upload_state text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  uploaded_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_materials_name_check CHECK (length(original_file_name) BETWEEN 1 AND 255),
  CONSTRAINT video_materials_type_check CHECK (declared_mime_type IN ('video/mp4', 'video/quicktime')),
  CONSTRAINT video_materials_size_check CHECK (declared_byte_size BETWEEN 1 AND 209715200),
  CONSTRAINT video_materials_state_check CHECK (upload_state IN ('pending', 'ready', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS video_materials_owner_ready_idx
  ON video_materials (workspace_id, owner_id, upload_state, uploaded_at DESC);
