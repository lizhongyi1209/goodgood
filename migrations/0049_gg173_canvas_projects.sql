-- Canvas graphs are separate from creation-session projects: an empty canvas has
-- no generation batch, and its nodes/edges need their own versioned document.
CREATE TABLE canvas_projects (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  document jsonb NOT NULL CHECK (
    jsonb_typeof(document) = 'object'
    AND document->>'schemaVersion' = '1'
    AND pg_column_size(document) <= 1048576
  ),
  content_hash text NOT NULL CHECK (char_length(content_hash) = 64),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX canvas_projects_owner_updated_idx
  ON canvas_projects (workspace_id, owner_id, updated_at DESC, id DESC);
