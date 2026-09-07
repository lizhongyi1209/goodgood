ALTER TABLE generation_queue_outbox
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

DROP INDEX IF EXISTS generation_queue_outbox_pending_idx;
CREATE INDEX generation_queue_outbox_pending_idx
  ON generation_queue_outbox (created_at)
  WHERE dispatched_at IS NULL AND cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  administrative_action_id uuid NOT NULL
    REFERENCES administrative_actions(id) ON DELETE RESTRICT,
  verification_requested_at timestamptz NOT NULL,
  verification_confirmed_at timestamptz NOT NULL,
  mail_reference_id text NOT NULL,
  state text NOT NULL DEFAULT 'processing',
  deadline_at timestamptz NOT NULL,
  revoked_session_count integer NOT NULL DEFAULT 0,
  cancelled_job_count integer NOT NULL DEFAULT 0,
  released_credit_amount bigint NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_deletion_requests_actor_target_check
    CHECK (actor_owner_id <> target_owner_id),
  CONSTRAINT account_deletion_requests_verification_check CHECK (
    verification_confirmed_at >= verification_requested_at
    AND verification_confirmed_at <= verification_requested_at + interval '24 hours'
  ),
  CONSTRAINT account_deletion_requests_mail_reference_check
    CHECK (length(mail_reference_id) BETWEEN 2 AND 200),
  CONSTRAINT account_deletion_requests_state_check
    CHECK (state IN ('processing', 'completed')),
  CONSTRAINT account_deletion_requests_completion_check CHECK (
    (state = 'processing' AND completed_at IS NULL)
    OR (state = 'completed' AND completed_at IS NOT NULL)
  ),
  CONSTRAINT account_deletion_requests_deadline_check
    CHECK (deadline_at > created_at),
  CONSTRAINT account_deletion_requests_revoked_sessions_check
    CHECK (revoked_session_count >= 0),
  CONSTRAINT account_deletion_requests_cancelled_jobs_check
    CHECK (cancelled_job_count >= 0),
  CONSTRAINT account_deletion_requests_released_credit_check
    CHECK (released_credit_amount >= 0),
  CONSTRAINT account_deletion_requests_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT account_deletion_requests_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT account_deletion_requests_target_unique
    UNIQUE (target_owner_id),
  CONSTRAINT account_deletion_requests_action_unique
    UNIQUE (administrative_action_id),
  CONSTRAINT account_deletion_requests_actor_idempotency_unique
    UNIQUE (actor_owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_state_deadline_idx
  ON account_deletion_requests (state, deadline_at, id);

ALTER TABLE administrative_actions
  DROP CONSTRAINT IF EXISTS administrative_actions_type_check,
  DROP CONSTRAINT IF EXISTS administrative_actions_status_check;

ALTER TABLE administrative_actions
  ADD CONSTRAINT administrative_actions_type_check
    CHECK (action_type IN (
      'bootstrap_site_owner',
      'approve_account',
      'suspend_account',
      'restore_account',
      'grant_test_credits',
      'create_account_deletion_request'
    )),
  ADD CONSTRAINT administrative_actions_status_check CHECK (
    (
      action_type = 'bootstrap_site_owner'
      AND previous_status IN ('pending', 'active')
      AND resulting_status = 'active'
      AND credit_amount IS NULL
      AND credit_ledger_entry_id IS NULL
    ) OR (
      action_type IN ('approve_account', 'suspend_account', 'restore_account')
      AND previous_status IN ('pending', 'active', 'suspended')
      AND resulting_status IN ('active', 'suspended')
      AND credit_amount IS NULL
      AND credit_ledger_entry_id IS NULL
    ) OR (
      action_type = 'grant_test_credits'
      AND previous_status IS NULL
      AND resulting_status IS NULL
      AND credit_amount BETWEEN 1 AND 5000
      AND credit_ledger_entry_id IS NOT NULL
    ) OR (
      action_type = 'create_account_deletion_request'
      AND previous_status IN ('pending', 'active', 'suspended')
      AND resulting_status = 'suspended'
      AND credit_amount IS NULL
      AND credit_ledger_entry_id IS NULL
    )
  );
