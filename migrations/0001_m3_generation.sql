CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  locale text NOT NULL DEFAULT 'zh-CN',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS generation_batches (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  prompt text NOT NULL,
  reference_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_id text NOT NULL,
  aspect_ratio text NOT NULL,
  resolution text NOT NULL,
  requested_count integer NOT NULL,
  input_hash text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_batches_model_check CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')),
  CONSTRAINT generation_batches_resolution_check CHECK (resolution IN ('1K', '2K', '4K')),
  CONSTRAINT generation_batches_count_check CHECK (requested_count IN (1, 2, 4))
);

CREATE INDEX IF NOT EXISTS generation_batches_owner_submitted_idx
  ON generation_batches (owner_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id uuid PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES generation_batches(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  retry_of_job_id uuid REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  error_code text,
  error_title text,
  error_message text,
  error_retryable boolean,
  lease_owner text,
  lease_expires_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_jobs_state_check CHECK (state IN ('queued', 'running', 'refining', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT generation_jobs_progress_check CHECK (progress BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_batch_unique ON generation_jobs (batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_owner_idempotency_unique
  ON generation_jobs (owner_id, idempotency_key);
CREATE INDEX IF NOT EXISTS generation_jobs_state_submitted_idx
  ON generation_jobs (state, submitted_at);

CREATE TABLE IF NOT EXISTS generation_attempts (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  ordinal integer NOT NULL,
  route_version text NOT NULL,
  provider text NOT NULL,
  provider_model text NOT NULL,
  provider_task_id text,
  state text NOT NULL DEFAULT 'created',
  request_hash text NOT NULL,
  result_hash text,
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_attempts_state_check CHECK (state IN ('created', 'submitted', 'running', 'succeeded', 'failed')),
  CONSTRAINT generation_attempts_ordinal_check CHECK (ordinal > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_attempts_job_ordinal_unique
  ON generation_attempts (job_id, ordinal);
CREATE UNIQUE INDEX IF NOT EXISTS generation_attempts_provider_task_unique
  ON generation_attempts (provider, provider_task_id)
  WHERE provider_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS generation_attempts_job_idx ON generation_attempts (job_id);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES generation_batches(id) ON DELETE RESTRICT,
  job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  object_key text NOT NULL,
  checksum text NOT NULL,
  mime_type text NOT NULL,
  pixel_width integer NOT NULL,
  pixel_height integer NOT NULL,
  aspect_ratio text NOT NULL,
  byte_size bigint NOT NULL,
  moderation_state text NOT NULL DEFAULT 'accepted',
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_pixel_width_check CHECK (pixel_width > 0),
  CONSTRAINT assets_pixel_height_check CHECK (pixel_height > 0),
  CONSTRAINT assets_byte_size_check CHECK (byte_size > 0),
  CONSTRAINT assets_moderation_state_check CHECK (moderation_state IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT assets_visibility_check CHECK (visibility IN ('private', 'project', 'public'))
);

CREATE UNIQUE INDEX IF NOT EXISTS assets_job_unique ON assets (job_id);
CREATE UNIQUE INDEX IF NOT EXISTS assets_object_key_unique ON assets (object_key);
CREATE INDEX IF NOT EXISTS assets_owner_created_idx ON assets (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generation_job_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  sequence integer NOT NULL,
  from_state text,
  to_state text NOT NULL,
  event_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_job_events_job_sequence_unique
  ON generation_job_events (job_id, sequence);
CREATE INDEX IF NOT EXISTS generation_job_events_job_idx ON generation_job_events (job_id);

CREATE TABLE IF NOT EXISTS generation_queue_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_queue_outbox_job_unique
  ON generation_queue_outbox (job_id);
CREATE INDEX IF NOT EXISTS generation_queue_outbox_pending_idx
  ON generation_queue_outbox (created_at)
  WHERE dispatched_at IS NULL;

INSERT INTO users (id, email, locale, status)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'm3-local@goodgood.invalid',
  'zh-CN',
  'active'
)
ON CONFLICT (id) DO NOTHING;
