CREATE TABLE IF NOT EXISTS creation_drafts (
  owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  prompt text NOT NULL DEFAULT '',
  reference_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_id text NOT NULL,
  aspect_ratio text NOT NULL,
  resolution text NOT NULL,
  generation_count integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creation_drafts_prompt_check CHECK (length(prompt) <= 4000),
  CONSTRAINT creation_drafts_model_check CHECK (
    model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')
  ),
  CONSTRAINT creation_drafts_resolution_check CHECK (
    resolution IN ('1K', '2K', '4K')
  ),
  CONSTRAINT creation_drafts_count_check CHECK (
    generation_count IN (1, 2, 4)
  ),
  CONSTRAINT creation_drafts_version_check CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS creation_drafts_expiry_idx
  ON creation_drafts (expires_at, owner_id);
