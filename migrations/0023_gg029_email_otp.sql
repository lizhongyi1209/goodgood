DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'auth_identities_id_owner_unique'
       AND conrelid = 'auth_identities'::regclass
  ) THEN
    ALTER TABLE auth_identities
      ADD CONSTRAINT auth_identities_id_owner_unique UNIQUE (id, owner_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth_email_bindings (
  identity_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  normalized_email text NOT NULL,
  display_email text NOT NULL,
  source text NOT NULL DEFAULT 'self_service',
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_email_bindings_identity_owner_fk
    FOREIGN KEY (identity_id, owner_id)
    REFERENCES auth_identities(id, owner_id) ON DELETE RESTRICT,
  CONSTRAINT auth_email_bindings_normalized_email_check CHECK (
    length(normalized_email) BETWEEN 3 AND 320
    AND normalized_email = lower(normalized_email)
    AND normalized_email = btrim(normalized_email)
    AND position(E'\r' in normalized_email) = 0
    AND position(E'\n' in normalized_email) = 0
    AND position(',' in normalized_email) = 0
  ),
  CONSTRAINT auth_email_bindings_display_email_check CHECK (
    length(display_email) BETWEEN 3 AND 320
    AND display_email = btrim(display_email)
    AND position(E'\r' in display_email) = 0
    AND position(E'\n' in display_email) = 0
    AND position(',' in display_email) = 0
  ),
  CONSTRAINT auth_email_bindings_source_check CHECK (
    source IN ('self_service', 'operator_migration')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_email_bindings_email_unique
  ON auth_email_bindings (normalized_email);
CREATE UNIQUE INDEX IF NOT EXISTS auth_email_bindings_owner_unique
  ON auth_email_bindings (owner_id);

CREATE TABLE IF NOT EXISTS auth_email_challenges (
  id uuid PRIMARY KEY,
  normalized_email text NOT NULL,
  display_email text NOT NULL,
  browser_binding_hash text NOT NULL,
  code_digest text NOT NULL,
  return_to text NOT NULL DEFAULT '/',
  send_state text NOT NULL DEFAULT 'sending',
  provider_message_id text,
  delivery_error_code text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  invalidated_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_email_challenges_email_check CHECK (
    length(normalized_email) BETWEEN 3 AND 320
    AND normalized_email = lower(normalized_email)
    AND normalized_email = btrim(normalized_email)
  ),
  CONSTRAINT auth_email_challenges_display_email_check CHECK (
    length(display_email) BETWEEN 3 AND 320
    AND display_email = btrim(display_email)
    AND position(E'\r' in display_email) = 0
    AND position(E'\n' in display_email) = 0
    AND position(',' in display_email) = 0
  ),
  CONSTRAINT auth_email_challenges_browser_binding_hash_check CHECK (
    length(browser_binding_hash) = 64
  ),
  CONSTRAINT auth_email_challenges_code_digest_check CHECK (
    length(code_digest) = 64
  ),
  CONSTRAINT auth_email_challenges_return_to_check CHECK (
    length(return_to) BETWEEN 1 AND 1000
    AND left(return_to, 1) = '/'
    AND left(return_to, 2) <> '//'
  ),
  CONSTRAINT auth_email_challenges_send_state_check CHECK (
    send_state IN ('sending', 'accepted', 'unknown', 'failed')
  ),
  CONSTRAINT auth_email_challenges_failed_attempts_check CHECK (
    failed_attempts BETWEEN 0 AND 5
  ),
  CONSTRAINT auth_email_challenges_terminal_check CHECK (
    consumed_at IS NULL OR invalidated_at IS NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_email_challenges_current_email_unique
  ON auth_email_challenges (normalized_email)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_email_challenges_expiry_idx
  ON auth_email_challenges (expires_at)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_email_challenges_browser_idx
  ON auth_email_challenges (browser_binding_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope text NOT NULL,
  subject_hash text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, subject_hash, window_started_at),
  CONSTRAINT auth_rate_limits_scope_check CHECK (
    scope IN (
      'email_send_hour', 'email_send_day',
      'ip_send_hour', 'ip_send_day',
      'global_send_hour', 'global_send_day',
      'email_verify_30m', 'ip_verify_15m', 'ip_entry_minute'
    )
  ),
  CONSTRAINT auth_rate_limits_subject_hash_check CHECK (
    length(subject_hash) = 64
  ),
  CONSTRAINT auth_rate_limits_request_count_check CHECK (
    request_count > 0
  )
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx
  ON auth_rate_limits (window_started_at);

CREATE TABLE IF NOT EXISTS auth_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  outcome text NOT NULL,
  subject_hash text,
  owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  challenge_id uuid REFERENCES auth_email_challenges(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  provider_message_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_events_event_type_check CHECK (
    event_type IN ('email_code_requested', 'email_code_verified', 'email_code_rejected')
  ),
  CONSTRAINT auth_events_outcome_check CHECK (
    outcome IN ('accepted', 'unknown', 'failed', 'succeeded', 'rejected')
  ),
  CONSTRAINT auth_events_subject_hash_check CHECK (
    subject_hash IS NULL OR length(subject_hash) = 64
  ),
  CONSTRAINT auth_events_request_id_check CHECK (
    length(request_id) BETWEEN 1 AND 200
  )
);

CREATE INDEX IF NOT EXISTS auth_events_created_idx
  ON auth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_owner_created_idx
  ON auth_events (owner_id, created_at DESC)
  WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auth_events_challenge_idx
  ON auth_events (challenge_id, created_at DESC)
  WHERE challenge_id IS NOT NULL;
