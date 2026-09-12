CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  kind text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  personal_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_by_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_kind_check
    CHECK (kind IN ('personal', 'organization')),
  CONSTRAINT workspaces_name_check
    CHECK (length(name) BETWEEN 1 AND 100),
  CONSTRAINT workspaces_status_check
    CHECK (status IN ('active', 'suspended')),
  CONSTRAINT workspaces_personal_owner_check CHECK (
    (kind = 'personal' AND personal_owner_id IS NOT NULL)
    OR (kind = 'organization' AND personal_owner_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_personal_owner_unique
  ON workspaces (personal_owner_id)
  WHERE kind = 'personal';
CREATE INDEX IF NOT EXISTS workspaces_kind_status_idx
  ON workspaces (kind, status, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION goodgood_create_personal_workspace()
RETURNS trigger AS $$
DECLARE
  workspace_hash text;
  workspace_id uuid;
BEGIN
  workspace_hash := md5('goodgood:personal-workspace:v1:' || NEW.id::text);
  workspace_id := (
    substr(workspace_hash, 1, 8) || '-' ||
    substr(workspace_hash, 9, 4) || '-' ||
    substr(workspace_hash, 13, 4) || '-' ||
    substr(workspace_hash, 17, 4) || '-' ||
    substr(workspace_hash, 21, 12)
  )::uuid;
  INSERT INTO workspaces (
    id, kind, name, status, personal_owner_id, created_by_owner_id
  ) VALUES (
    workspace_id, 'personal', 'Personal workspace', 'active', NEW.id, NEW.id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_create_personal_workspace ON users;
CREATE TRIGGER users_create_personal_workspace
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION goodgood_create_personal_workspace();

WITH personal_workspace_rows AS (
  SELECT
    (
      substr(workspace_hash, 1, 8) || '-' ||
      substr(workspace_hash, 9, 4) || '-' ||
      substr(workspace_hash, 13, 4) || '-' ||
      substr(workspace_hash, 17, 4) || '-' ||
      substr(workspace_hash, 21, 12)
    )::uuid AS workspace_id,
    owner_id
  FROM (
    SELECT id AS owner_id,
           md5('goodgood:personal-workspace:v1:' || id::text) AS workspace_hash
      FROM users
  ) owners
)
INSERT INTO workspaces (
  id, kind, name, status, personal_owner_id, created_by_owner_id
)
SELECT workspace_id, 'personal', 'Personal workspace', 'active', owner_id, owner_id
  FROM personal_workspace_rows
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM users u
      LEFT JOIN workspaces w
        ON w.personal_owner_id = u.id AND w.kind = 'personal'
     WHERE w.id IS NULL
  ) THEN
    RAISE EXCEPTION 'every existing user must have one personal workspace';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  invited_by_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  activated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_memberships_workspace_owner_unique
    UNIQUE (workspace_id, owner_id),
  CONSTRAINT workspace_memberships_role_check
    CHECK (role IN ('org_owner', 'org_admin', 'org_member')),
  CONSTRAINT workspace_memberships_status_check
    CHECK (status IN ('active', 'suspended', 'removed')),
  CONSTRAINT workspace_memberships_version_check CHECK (version > 0),
  CONSTRAINT workspace_memberships_interval_check CHECK (
    (status IN ('active', 'suspended') AND ended_at IS NULL)
    OR (status = 'removed' AND ended_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS workspace_memberships_owner_status_idx
  ON workspace_memberships (owner_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS workspace_memberships_workspace_status_idx
  ON workspace_memberships (workspace_id, status, role, created_at, id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  normalized_email text NOT NULL,
  intended_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  membership_id uuid REFERENCES workspace_memberships(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_invitations_intended_role_check
    CHECK (intended_role IN ('org_admin', 'org_member')),
  CONSTRAINT workspace_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  CONSTRAINT workspace_invitations_email_check CHECK (
    length(normalized_email) BETWEEN 3 AND 320
    AND normalized_email = lower(btrim(normalized_email))
    AND normalized_email LIKE '%@%'
  ),
  CONSTRAINT workspace_invitations_idempotency_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT workspace_invitations_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT workspace_invitations_expiry_check
    CHECK (expires_at > created_at),
  CONSTRAINT workspace_invitations_terminal_check CHECK (
    (status = 'pending'
      AND accepted_by_owner_id IS NULL AND membership_id IS NULL
      AND accepted_at IS NULL AND revoked_at IS NULL)
    OR (status = 'accepted'
      AND accepted_by_owner_id IS NOT NULL AND membership_id IS NOT NULL
      AND accepted_at IS NOT NULL AND revoked_at IS NULL)
    OR (status = 'revoked'
      AND accepted_by_owner_id IS NULL AND membership_id IS NULL
      AND accepted_at IS NULL AND revoked_at IS NOT NULL)
    OR (status = 'expired'
      AND accepted_by_owner_id IS NULL AND membership_id IS NULL
      AND accepted_at IS NULL AND revoked_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_actor_idempotency_unique
  ON workspace_invitations (invited_by_owner_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_pending_email_unique
  ON workspace_invitations (workspace_id, normalized_email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS workspace_invitations_email_status_idx
  ON workspace_invitations (normalized_email, status, expires_at, id);

CREATE TABLE IF NOT EXISTS workspace_audit_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  membership_id uuid REFERENCES workspace_memberships(id) ON DELETE RESTRICT,
  invitation_id uuid REFERENCES workspace_invitations(id) ON DELETE RESTRICT,
  action_type text NOT NULL,
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_audit_events_action_check CHECK (action_type IN (
    'create_organization',
    'invite_member',
    'accept_invitation',
    'revoke_invitation',
    'change_member_role',
    'suspend_member',
    'restore_member',
    'remove_member'
  )),
  CONSTRAINT workspace_audit_events_reason_check
    CHECK (length(reason) BETWEEN 2 AND 200),
  CONSTRAINT workspace_audit_events_idempotency_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT workspace_audit_events_operation_hash_check
    CHECK (length(operation_hash) = 64),
  CONSTRAINT workspace_audit_events_actor_idempotency_unique
    UNIQUE (actor_owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS workspace_audit_events_workspace_created_idx
  ON workspace_audit_events (workspace_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS workspace_audit_events_target_created_idx
  ON workspace_audit_events (target_owner_id, created_at DESC, id DESC)
  WHERE target_owner_id IS NOT NULL;

DROP TRIGGER IF EXISTS workspace_audit_events_append_only
  ON workspace_audit_events;
CREATE TRIGGER workspace_audit_events_append_only
  BEFORE UPDATE OR DELETE ON workspace_audit_events
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
