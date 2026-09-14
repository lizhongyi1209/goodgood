CREATE TABLE registration_invitations (
  id uuid PRIMARY KEY,
  code_digest text NOT NULL UNIQUE CHECK (code_digest ~ '^[0-9a-f]{64}$'),
  code_hint text NOT NULL CHECK (char_length(code_hint) = 6),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  used_at timestamptz,
  used_by uuid UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  challenge_id uuid UNIQUE, -- durable audit identifier; short-lived challenges may be cleaned
  UNIQUE (created_by, idempotency_key),
  CHECK ((used_at IS NULL AND used_by IS NULL AND challenge_id IS NULL)
      OR (used_at IS NOT NULL AND used_by IS NOT NULL AND challenge_id IS NOT NULL)),
  CHECK (revoked_at IS NULL OR used_at IS NULL),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);
CREATE INDEX registration_invitations_created_idx ON registration_invitations(created_at DESC, id DESC);
