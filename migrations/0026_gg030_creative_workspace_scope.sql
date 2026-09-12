ALTER TABLE reference_assets
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid;
ALTER TABLE creation_drafts
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid;
ALTER TABLE generation_batches
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid;
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid,
  ADD COLUMN IF NOT EXISTS workspace_credit_reservation_entry_id uuid;
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS creator_owner_id uuid;

UPDATE reference_assets r
   SET workspace_id = w.id, creator_owner_id = r.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = r.owner_id
   AND (r.workspace_id IS NULL OR r.creator_owner_id IS NULL);
UPDATE creation_drafts d
   SET workspace_id = w.id, creator_owner_id = d.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = d.owner_id
   AND (d.workspace_id IS NULL OR d.creator_owner_id IS NULL);
UPDATE projects p
   SET workspace_id = w.id, creator_owner_id = p.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = p.owner_id
   AND (p.workspace_id IS NULL OR p.creator_owner_id IS NULL);
UPDATE generation_batches b
   SET workspace_id = w.id, creator_owner_id = b.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = b.owner_id
   AND (b.workspace_id IS NULL OR b.creator_owner_id IS NULL);
UPDATE generation_jobs j
   SET workspace_id = w.id, creator_owner_id = j.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = j.owner_id
   AND (j.workspace_id IS NULL OR j.creator_owner_id IS NULL);
UPDATE assets a
   SET workspace_id = w.id, creator_owner_id = a.owner_id
  FROM workspaces w
 WHERE w.kind = 'personal' AND w.personal_owner_id = a.owner_id
   AND (a.workspace_id IS NULL OR a.creator_owner_id IS NULL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reference_assets WHERE workspace_id IS NULL OR creator_owner_id IS NULL
    UNION ALL
    SELECT 1 FROM creation_drafts WHERE workspace_id IS NULL OR creator_owner_id IS NULL
    UNION ALL
    SELECT 1 FROM projects WHERE workspace_id IS NULL OR creator_owner_id IS NULL
    UNION ALL
    SELECT 1 FROM generation_batches WHERE workspace_id IS NULL OR creator_owner_id IS NULL
    UNION ALL
    SELECT 1 FROM generation_jobs WHERE workspace_id IS NULL OR creator_owner_id IS NULL
    UNION ALL
    SELECT 1 FROM assets WHERE workspace_id IS NULL OR creator_owner_id IS NULL
  ) THEN
    RAISE EXCEPTION 'GG-030 creative Workspace backfill is incomplete';
  END IF;
END;
$$;

ALTER TABLE reference_assets
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT reference_assets_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT reference_assets_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT reference_assets_creator_owner_check
    CHECK (creator_owner_id = owner_id);
ALTER TABLE creation_drafts
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT creation_drafts_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT creation_drafts_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT creation_drafts_creator_owner_check
    CHECK (creator_owner_id = owner_id);
ALTER TABLE projects
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT projects_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT projects_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT projects_creator_owner_check
    CHECK (creator_owner_id = owner_id);
ALTER TABLE generation_batches
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT generation_batches_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_batches_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_batches_creator_owner_check
    CHECK (creator_owner_id = owner_id);
ALTER TABLE generation_jobs
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT generation_jobs_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_jobs_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_jobs_creator_owner_check
    CHECK (creator_owner_id = owner_id);
ALTER TABLE assets
  ALTER COLUMN workspace_id SET NOT NULL,
  ALTER COLUMN creator_owner_id SET NOT NULL,
  ADD CONSTRAINT assets_workspace_fk
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  ADD CONSTRAINT assets_creator_fk
    FOREIGN KEY (creator_owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT assets_creator_owner_check
    CHECK (creator_owner_id = owner_id);

ALTER TABLE creation_drafts DROP CONSTRAINT creation_drafts_pkey;
ALTER TABLE creation_drafts
  ADD CONSTRAINT creation_drafts_pkey PRIMARY KEY (workspace_id, creator_owner_id);

DROP INDEX IF EXISTS projects_owner_create_idempotency_unique;
CREATE UNIQUE INDEX projects_workspace_creator_idempotency_unique
  ON projects (workspace_id, creator_owner_id, create_idempotency_key);
DROP INDEX IF EXISTS generation_jobs_owner_idempotency_unique;
CREATE UNIQUE INDEX generation_jobs_workspace_creator_idempotency_unique
  ON generation_jobs (workspace_id, creator_owner_id, idempotency_key);

CREATE UNIQUE INDEX projects_id_workspace_unique ON projects (id, workspace_id);
CREATE UNIQUE INDEX generation_batches_id_workspace_unique
  ON generation_batches (id, workspace_id);
CREATE UNIQUE INDEX generation_jobs_id_workspace_unique
  ON generation_jobs (id, workspace_id);
CREATE UNIQUE INDEX workspace_credit_ledger_id_workspace_unique
  ON workspace_credit_ledger_entries (id, workspace_id);

ALTER TABLE generation_batches
  ADD CONSTRAINT generation_batches_project_workspace_fk
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES projects(id, workspace_id) ON DELETE RESTRICT;
ALTER TABLE generation_jobs
  ADD CONSTRAINT generation_jobs_batch_workspace_fk
    FOREIGN KEY (batch_id, workspace_id)
    REFERENCES generation_batches(id, workspace_id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_jobs_retry_workspace_fk
    FOREIGN KEY (retry_of_job_id, workspace_id)
    REFERENCES generation_jobs(id, workspace_id) ON DELETE RESTRICT,
  ADD CONSTRAINT generation_jobs_workspace_credit_reservation_fk
    FOREIGN KEY (workspace_credit_reservation_entry_id, workspace_id)
    REFERENCES workspace_credit_ledger_entries(id, workspace_id)
    ON DELETE RESTRICT;
ALTER TABLE assets
  ADD CONSTRAINT assets_batch_workspace_fk
    FOREIGN KEY (batch_id, workspace_id)
    REFERENCES generation_batches(id, workspace_id) ON DELETE RESTRICT,
  ADD CONSTRAINT assets_job_workspace_fk
    FOREIGN KEY (job_id, workspace_id)
    REFERENCES generation_jobs(id, workspace_id) ON DELETE RESTRICT;
ALTER TABLE workspace_credit_ledger_entries
  ADD CONSTRAINT workspace_credit_ledger_job_workspace_fk
    FOREIGN KEY (related_job_id, workspace_id)
    REFERENCES generation_jobs(id, workspace_id) ON DELETE RESTRICT;
ALTER TABLE member_budget_events
  ADD CONSTRAINT member_budget_events_job_workspace_fk
    FOREIGN KEY (related_job_id, workspace_id)
    REFERENCES generation_jobs(id, workspace_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX generation_jobs_workspace_credit_reservation_unique
  ON generation_jobs (workspace_credit_reservation_entry_id)
  WHERE workspace_credit_reservation_entry_id IS NOT NULL;
CREATE INDEX reference_assets_workspace_creator_created_idx
  ON reference_assets (workspace_id, creator_owner_id, created_at DESC, id DESC);
CREATE INDEX projects_workspace_creator_updated_idx
  ON projects (workspace_id, creator_owner_id, updated_at DESC, id DESC);
CREATE INDEX generation_batches_workspace_submitted_idx
  ON generation_batches (workspace_id, submitted_at DESC, id DESC);
CREATE INDEX generation_jobs_workspace_creator_submitted_idx
  ON generation_jobs (workspace_id, creator_owner_id, submitted_at DESC, id DESC);
CREATE INDEX assets_workspace_creator_created_idx
  ON assets (workspace_id, creator_owner_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION goodgood_assign_creative_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.creator_owner_id := COALESCE(NEW.creator_owner_id, NEW.owner_id);
  IF NEW.workspace_id IS NULL THEN
    SELECT id INTO NEW.workspace_id
      FROM workspaces
     WHERE kind = 'personal' AND personal_owner_id = NEW.owner_id;
  END IF;
  IF NEW.creator_owner_id <> NEW.owner_id THEN
    RAISE EXCEPTION 'creative creator must equal the legacy owner projection';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM workspaces w
      LEFT JOIN workspace_memberships m
        ON m.workspace_id = w.id AND m.owner_id = NEW.creator_owner_id
     WHERE w.id = NEW.workspace_id
       AND (
         (w.kind = 'personal' AND w.personal_owner_id = NEW.creator_owner_id)
         OR (w.kind = 'organization' AND m.id IS NOT NULL)
       )
  ) THEN
    RAISE EXCEPTION 'creative creator does not belong to the Workspace';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reference_assets_assign_workspace ON reference_assets;
CREATE TRIGGER reference_assets_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON reference_assets FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
DROP TRIGGER IF EXISTS creation_drafts_assign_workspace ON creation_drafts;
CREATE TRIGGER creation_drafts_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON creation_drafts FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
DROP TRIGGER IF EXISTS projects_assign_workspace ON projects;
CREATE TRIGGER projects_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON projects FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
DROP TRIGGER IF EXISTS generation_batches_assign_workspace ON generation_batches;
CREATE TRIGGER generation_batches_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON generation_batches FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
DROP TRIGGER IF EXISTS generation_jobs_assign_workspace ON generation_jobs;
CREATE TRIGGER generation_jobs_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON generation_jobs FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
DROP TRIGGER IF EXISTS assets_assign_workspace ON assets;
CREATE TRIGGER assets_assign_workspace
  BEFORE INSERT OR UPDATE OF owner_id, workspace_id, creator_owner_id
  ON assets FOR EACH ROW EXECUTE FUNCTION goodgood_assign_creative_workspace();
