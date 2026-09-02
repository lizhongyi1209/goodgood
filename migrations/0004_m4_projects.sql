CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  create_idempotency_key text NOT NULL,
  create_input_hash text NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  reference_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_id text NOT NULL,
  aspect_ratio text NOT NULL,
  resolution text NOT NULL,
  generation_count integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_name_check CHECK (length(name) BETWEEN 1 AND 32),
  CONSTRAINT projects_prompt_check CHECK (length(prompt) <= 4000),
  CONSTRAINT projects_model_check CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')),
  CONSTRAINT projects_resolution_check CHECK (resolution IN ('1K', '2K', '4K')),
  CONSTRAINT projects_count_check CHECK (generation_count IN (1, 2, 4)),
  CONSTRAINT projects_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT projects_version_check CHECK (version > 0)
);

CREATE INDEX IF NOT EXISTS projects_owner_updated_idx
  ON projects (owner_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_create_idempotency_unique
  ON projects (owner_id, create_idempotency_key);

ALTER TABLE generation_batches
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS generation_batches_project_submitted_idx
  ON generation_batches (project_id, submitted_at DESC)
  WHERE project_id IS NOT NULL;
