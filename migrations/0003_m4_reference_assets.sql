CREATE TABLE IF NOT EXISTS reference_assets (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  object_key text NOT NULL,
  original_file_name text NOT NULL,
  declared_mime_type text NOT NULL,
  detected_mime_type text,
  declared_byte_size bigint NOT NULL,
  byte_size bigint,
  pixel_width integer,
  pixel_height integer,
  checksum text,
  upload_state text NOT NULL DEFAULT 'pending',
  moderation_state text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  uploaded_at timestamptz,
  validated_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reference_assets_file_name_check CHECK (length(original_file_name) BETWEEN 1 AND 255),
  CONSTRAINT reference_assets_declared_mime_check CHECK (declared_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT reference_assets_detected_mime_check CHECK (detected_mime_type IS NULL OR detected_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT reference_assets_declared_byte_size_check CHECK (declared_byte_size BETWEEN 1 AND 20971520),
  CONSTRAINT reference_assets_byte_size_check CHECK (byte_size IS NULL OR byte_size BETWEEN 1 AND 20971520),
  CONSTRAINT reference_assets_pixel_width_check CHECK (pixel_width IS NULL OR pixel_width BETWEEN 64 AND 8192),
  CONSTRAINT reference_assets_pixel_height_check CHECK (pixel_height IS NULL OR pixel_height BETWEEN 64 AND 8192),
  CONSTRAINT reference_assets_upload_state_check CHECK (upload_state IN ('pending', 'ready', 'rejected', 'expired')),
  CONSTRAINT reference_assets_moderation_state_check CHECK (moderation_state IN ('pending', 'accepted', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS reference_assets_object_key_unique
  ON reference_assets (object_key);
CREATE INDEX IF NOT EXISTS reference_assets_owner_created_idx
  ON reference_assets (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reference_assets_owner_state_idx
  ON reference_assets (owner_id, upload_state, created_at DESC);
