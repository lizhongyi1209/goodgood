CREATE TABLE image_cleanup_operations (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  canvas_project_id uuid REFERENCES canvas_projects(id) ON DELETE RESTRICT,
  source_kind text NOT NULL CHECK (source_kind IN ('asset', 'reference')),
  source_id uuid NOT NULL,
  input_hash text NOT NULL CHECK (length(input_hash) = 64),
  state text NOT NULL CHECK (state IN ('running', 'succeeded')),
  credit_amount bigint NOT NULL DEFAULT 10 CHECK (credit_amount = 10),
  result_reference_id uuid REFERENCES reference_assets(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((state = 'running' AND result_reference_id IS NULL AND completed_at IS NULL)
    OR (state = 'succeeded' AND result_reference_id IS NOT NULL AND completed_at IS NOT NULL))
);
CREATE INDEX image_cleanup_owner_created_idx ON image_cleanup_operations(owner_id, created_at DESC);

ALTER TABLE credit_ledger_entries ADD COLUMN related_image_cleanup_id uuid REFERENCES image_cleanup_operations(id) ON DELETE RESTRICT;
ALTER TABLE credit_ledger_entries DROP CONSTRAINT credit_ledger_entries_relation_check;
ALTER TABLE credit_ledger_entries ADD CONSTRAINT credit_ledger_entries_relation_check CHECK (
  (entry_type IN ('grant', 'expire', 'adjust'))
  OR (entry_type IN ('transfer_out', 'transfer_in') AND prior_entry_id IS NULL
    AND related_job_id IS NULL AND related_text_job_id IS NULL AND related_image_cleanup_id IS NULL AND related_payment_ref IS NULL)
  OR (entry_type = 'reserve' AND prior_entry_id IS NULL
    AND num_nonnulls(related_job_id, related_text_job_id, related_image_cleanup_id) = 1)
  OR (entry_type IN ('settle', 'release', 'refund') AND prior_entry_id IS NOT NULL
    AND num_nonnulls(related_job_id, related_text_job_id, related_image_cleanup_id) = 1)
);
CREATE UNIQUE INDEX credit_ledger_image_cleanup_reserve_unique
  ON credit_ledger_entries(related_image_cleanup_id) WHERE entry_type = 'reserve' AND related_image_cleanup_id IS NOT NULL;
