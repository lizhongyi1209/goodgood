CREATE TABLE text_generation_jobs (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  canvas_project_id uuid REFERENCES canvas_projects(id) ON DELETE RESTRICT,
  source_project_name text,
  model_id text NOT NULL,
  input_hash text NOT NULL CHECK (length(input_hash) = 64),
  input_snapshot jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('running', 'succeeded', 'failed', 'cancelled')),
  output_markdown text NOT NULL DEFAULT '',
  error_code text,
  credit_reservation_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  organization_reservation_entry_id uuid REFERENCES workspace_credit_ledger_entries(id) ON DELETE RESTRICT,
  lease_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(model_id) BETWEEN 1 AND 80),
  CHECK (length(output_markdown) <= 16000),
  CHECK (credit_reservation_entry_id IS NULL OR organization_reservation_entry_id IS NULL)
);
CREATE INDEX text_generation_jobs_owner_created_idx ON text_generation_jobs(owner_id, created_at DESC);
CREATE INDEX text_generation_jobs_expiry_idx ON text_generation_jobs(lease_expires_at) WHERE state = 'running';

ALTER TABLE credit_ledger_entries ADD COLUMN related_text_job_id uuid REFERENCES text_generation_jobs(id) ON DELETE RESTRICT;
ALTER TABLE credit_ledger_entries DROP CONSTRAINT credit_ledger_entries_relation_check;
ALTER TABLE credit_ledger_entries ADD CONSTRAINT credit_ledger_entries_relation_check CHECK (
  (entry_type IN ('grant', 'expire', 'adjust'))
  OR (entry_type IN ('transfer_out', 'transfer_in') AND prior_entry_id IS NULL
    AND related_job_id IS NULL AND related_text_job_id IS NULL AND related_payment_ref IS NULL)
  OR (entry_type = 'reserve' AND prior_entry_id IS NULL
    AND num_nonnulls(related_job_id, related_text_job_id) = 1)
  OR (entry_type IN ('settle', 'release', 'refund') AND prior_entry_id IS NOT NULL
    AND num_nonnulls(related_job_id, related_text_job_id) = 1)
);
CREATE UNIQUE INDEX credit_ledger_entries_text_reserve_unique
  ON credit_ledger_entries(related_text_job_id) WHERE entry_type = 'reserve' AND related_text_job_id IS NOT NULL;
