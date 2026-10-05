CREATE TABLE video_generation_jobs (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  canvas_project_id uuid NOT NULL REFERENCES canvas_projects(id) ON DELETE RESTRICT,
  source_project_name text,
  model_id text NOT NULL CHECK (model_id IN ('kling-3.0-omni', 'kling-3.0')),
  input_hash text NOT NULL CHECK (length(input_hash)=64),
  input_snapshot jsonb NOT NULL,
  price_snapshot jsonb NOT NULL,
  reserved_credit_amount bigint NOT NULL CHECK (reserved_credit_amount>0),
  charged_credit_amount bigint NOT NULL DEFAULT 0 CHECK (charged_credit_amount>=0),
  credit_reservation_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  organization_reservation_entry_id uuid REFERENCES workspace_credit_ledger_entries(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','submitting','submission_unknown','running','saving','save_failed','succeeded','failed')),
  provider_task_id text,
  provider_result_url text,
  provider_cost text,
  progress integer CHECK (progress BETWEEN 0 AND 100),
  output_asset_id uuid REFERENCES video_materials(id) ON DELETE RESTRICT,
  output_metadata jsonb,
  error_code text,
  failure_diagnostics jsonb,
  submitted_at timestamptz,
  next_poll_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  bridge_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX video_generation_jobs_pending_idx ON video_generation_jobs(next_poll_at, created_at) WHERE state IN ('queued','submitting','running','saving');
CREATE INDEX video_generation_jobs_owner_idx ON video_generation_jobs(workspace_id,owner_id,created_at DESC);
CREATE UNIQUE INDEX video_generation_jobs_provider_idx ON video_generation_jobs(model_id,provider_task_id) WHERE provider_task_id IS NOT NULL;
ALTER TABLE video_materials ADD COLUMN source_video_job_id uuid REFERENCES video_generation_jobs(id) ON DELETE RESTRICT;
ALTER TABLE video_materials ADD COLUMN pixel_width integer;
ALTER TABLE video_materials ADD COLUMN pixel_height integer;
ALTER TABLE video_materials ADD COLUMN duration_seconds double precision;
ALTER TABLE credit_ledger_entries ADD COLUMN related_video_job_id uuid REFERENCES video_generation_jobs(id) ON DELETE RESTRICT;
ALTER TABLE credit_ledger_entries DROP CONSTRAINT credit_ledger_entries_relation_check;
ALTER TABLE credit_ledger_entries ADD CONSTRAINT credit_ledger_entries_relation_check CHECK (
  (entry_type IN ('settle','release','refund') AND prior_entry_id IS NOT NULL AND num_nonnulls(related_job_id,related_text_job_id,related_image_cleanup_id,related_video_job_id)=1)
  OR (entry_type='reserve' AND prior_entry_id IS NULL AND num_nonnulls(related_job_id,related_text_job_id,related_image_cleanup_id,related_video_job_id)=1)
  OR (entry_type IN ('transfer_out','transfer_in') AND prior_entry_id IS NULL AND num_nonnulls(related_job_id,related_text_job_id,related_image_cleanup_id,related_video_job_id,related_payment_ref)=0)
  OR entry_type IN ('grant','expire','adjust')
);
CREATE UNIQUE INDEX credit_ledger_video_reservation_idx ON credit_ledger_entries(related_video_job_id) WHERE entry_type='reserve' AND related_video_job_id IS NOT NULL;
