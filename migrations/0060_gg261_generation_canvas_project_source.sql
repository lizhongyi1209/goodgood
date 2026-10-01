-- Keep classic creation projects and canvas projects as distinct source identities.
ALTER TABLE canvas_projects
  ADD CONSTRAINT canvas_projects_id_workspace_owner_unique UNIQUE (id, workspace_id, owner_id);

ALTER TABLE generation_batches
  ADD COLUMN canvas_project_id uuid,
  ADD COLUMN source_project_name text
    CHECK (source_project_name IS NULL OR char_length(source_project_name) BETWEEN 1 AND 32),
  ADD CONSTRAINT generation_batches_project_source_check
    CHECK (project_id IS NULL OR canvas_project_id IS NULL),
  ADD CONSTRAINT generation_batches_canvas_project_scope_fk
    FOREIGN KEY (canvas_project_id, workspace_id, creator_owner_id)
    REFERENCES canvas_projects (id, workspace_id, owner_id) ON DELETE RESTRICT;

CREATE INDEX generation_batches_canvas_project_idx
  ON generation_batches (canvas_project_id, submitted_at DESC)
  WHERE canvas_project_id IS NOT NULL;
