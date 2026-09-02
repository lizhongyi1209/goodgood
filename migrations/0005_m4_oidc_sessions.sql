CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id uuid PRIMARY KEY,
  state_hash text NOT NULL,
  code_verifier text NOT NULL,
  nonce text NOT NULL,
  return_to text NOT NULL DEFAULT '/',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_login_attempts_state_hash_check CHECK (length(state_hash) = 64),
  CONSTRAINT auth_login_attempts_code_verifier_check CHECK (length(code_verifier) BETWEEN 43 AND 128),
  CONSTRAINT auth_login_attempts_nonce_check CHECK (length(nonce) BETWEEN 32 AND 512),
  CONSTRAINT auth_login_attempts_return_to_check CHECK (
    length(return_to) BETWEEN 1 AND 1000
    AND left(return_to, 1) = '/'
    AND left(return_to, 2) <> '//'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_login_attempts_state_hash_unique
  ON auth_login_attempts (state_hash);
CREATE INDEX IF NOT EXISTS auth_login_attempts_expiry_idx
  ON auth_login_attempts (expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  auth_identity_id uuid NOT NULL REFERENCES auth_identities(id) ON DELETE RESTRICT,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_token_hash_check CHECK (length(token_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_unique
  ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_owner_active_idx
  ON auth_sessions (owner_id, expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;
