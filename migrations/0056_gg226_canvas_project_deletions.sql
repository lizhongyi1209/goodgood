-- Retain project documents and shared materials; the retirement identity also
-- covers a browser-local project that has never completed its first cloud PUT.
CREATE TABLE canvas_project_deletions (
  project_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, workspace_id, owner_id)
);

CREATE INDEX canvas_project_deletions_owner_idx
  ON canvas_project_deletions (workspace_id, owner_id, deleted_at DESC, project_id DESC);
