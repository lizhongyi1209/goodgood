CREATE TABLE account_invitations (
  owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE account_invitation_uses (
  registered_owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  inviter_owner_id uuid NOT NULL REFERENCES account_invitations(owner_id) ON DELETE RESTRICT,
  challenge_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  CHECK (registered_owner_id <> inviter_owner_id)
);
CREATE INDEX account_invitation_uses_inviter_idx ON account_invitation_uses(inviter_owner_id);

CREATE FUNCTION gg091_allocate_account_invitation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  candidate text;
  attempts integer := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 1000 THEN
      RAISE EXCEPTION 'Account invitation allocation failed';
    END IF;
    candidate := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
    INSERT INTO account_invitations(owner_id, code) VALUES (NEW.id, candidate)
      ON CONFLICT (code) DO NOTHING;
    EXIT WHEN FOUND;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gg091_account_invitation_after_insert AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION gg091_allocate_account_invitation();

DO $$
DECLARE
  account record;
  candidate text;
  attempts integer;
BEGIN
  FOR account IN SELECT id FROM users ORDER BY id LOOP
    attempts := 0;
    LOOP
      attempts := attempts + 1;
      IF attempts > 1000 THEN RAISE EXCEPTION 'Account invitation allocation failed'; END IF;
      candidate := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
      INSERT INTO account_invitations(owner_id, code) VALUES (account.id, candidate)
        ON CONFLICT (code) DO NOTHING;
      EXIT WHEN FOUND;
    END LOOP;
  END LOOP;
END;
$$;
