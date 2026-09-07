CREATE TABLE IF NOT EXISTS account_deletion_register (
  request_id uuid PRIMARY KEY,
  target_owner_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'processing',
  deadline_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_deletion_register_target_unique UNIQUE (target_owner_id),
  CONSTRAINT account_deletion_register_state_check
    CHECK (state IN ('processing', 'completed')),
  CONSTRAINT account_deletion_register_completion_check CHECK (
    (state = 'processing' AND completed_at IS NULL)
    OR (state = 'completed' AND completed_at IS NOT NULL)
  ),
  CONSTRAINT account_deletion_register_deadline_check
    CHECK (deadline_at > created_at)
);

CREATE INDEX IF NOT EXISTS account_deletion_register_state_deadline_idx
  ON account_deletion_register (state, deadline_at, request_id);

CREATE TABLE IF NOT EXISTS account_deletion_steps (
  request_id uuid NOT NULL
    REFERENCES account_deletion_register(request_id) ON DELETE RESTRICT,
  step_name text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  last_active_job_count integer NOT NULL DEFAULT 0,
  last_block_code text,
  lease_owner text,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, step_name),
  CONSTRAINT account_deletion_steps_name_check
    CHECK (step_name IN ('wait_for_submitted_jobs')),
  CONSTRAINT account_deletion_steps_state_check
    CHECK (state IN ('pending', 'running', 'completed')),
  CONSTRAINT account_deletion_steps_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT account_deletion_steps_active_job_count_check
    CHECK (last_active_job_count >= 0),
  CONSTRAINT account_deletion_steps_block_code_check
    CHECK (last_block_code IS NULL OR last_block_code = 'SUBMITTED_JOBS_ACTIVE'),
  CONSTRAINT account_deletion_steps_lease_check CHECK (
    (
      state = 'running'
      AND lease_owner IS NOT NULL
      AND lease_expires_at IS NOT NULL
    ) OR (
      state IN ('pending', 'completed')
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL
    )
  ),
  CONSTRAINT account_deletion_steps_completion_check CHECK (
    (state = 'completed' AND completed_at IS NOT NULL AND next_attempt_at IS NULL)
    OR (state IN ('pending', 'running') AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS account_deletion_steps_claim_idx
  ON account_deletion_steps (state, next_attempt_at, lease_expires_at, request_id)
  WHERE state IN ('pending', 'running');

INSERT INTO account_deletion_register (
  request_id,
  target_owner_id,
  state,
  deadline_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  request.id,
  request.target_owner_id,
  request.state,
  request.deadline_at,
  request.completed_at,
  request.created_at,
  request.updated_at
FROM account_deletion_requests request
ON CONFLICT (request_id) DO NOTHING;

INSERT INTO account_deletion_steps (
  request_id,
  step_name,
  state,
  next_attempt_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  register.request_id,
  'wait_for_submitted_jobs',
  CASE WHEN register.state = 'completed' THEN 'completed' ELSE 'pending' END,
  CASE WHEN register.state = 'completed' THEN NULL ELSE register.created_at END,
  register.completed_at,
  register.created_at,
  register.updated_at
FROM account_deletion_register register
ON CONFLICT (request_id, step_name) DO NOTHING;
