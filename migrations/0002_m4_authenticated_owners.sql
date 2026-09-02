CREATE TABLE IF NOT EXISTS auth_identities (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  issuer text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_authenticated_at timestamptz,
  CONSTRAINT auth_identities_issuer_check CHECK (length(issuer) BETWEEN 1 AND 500),
  CONSTRAINT auth_identities_subject_check CHECK (length(subject) BETWEEN 1 AND 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_issuer_subject_unique
  ON auth_identities (issuer, subject);
CREATE INDEX IF NOT EXISTS auth_identities_owner_idx
  ON auth_identities (owner_id);

INSERT INTO users (id, email, locale, status)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  'm4-local-b@goodgood.invalid',
  'zh-CN',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth_identities (id, owner_id, issuer, subject)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'goodgood-local',
    'local-user-a'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'goodgood-local',
    'local-user-b'
  )
ON CONFLICT (issuer, subject) DO NOTHING;
