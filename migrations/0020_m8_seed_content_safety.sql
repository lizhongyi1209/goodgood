ALTER TABLE reference_assets
  DROP CONSTRAINT IF EXISTS reference_assets_moderation_state_check;

UPDATE reference_assets
   SET moderation_state = 'not_reviewed', updated_at = now()
 WHERE moderation_state IN ('accepted', 'rejected');

ALTER TABLE reference_assets
  ADD CONSTRAINT reference_assets_moderation_state_check
    CHECK (moderation_state IN (
      'pending', 'not_reviewed', 'accepted', 'quarantined', 'rejected'
    ));

ALTER TABLE assets
  ALTER COLUMN moderation_state SET DEFAULT 'not_reviewed',
  DROP CONSTRAINT IF EXISTS assets_moderation_state_check;

UPDATE assets
   SET moderation_state = 'not_reviewed', updated_at = now()
 WHERE moderation_state = 'accepted';

ALTER TABLE assets
  ADD CONSTRAINT assets_moderation_state_check
    CHECK (moderation_state IN (
      'not_reviewed', 'accepted', 'quarantined', 'rejected'
    ));

CREATE TABLE IF NOT EXISTS content_policy_acceptances (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  policy_version text NOT NULL,
  document_hash text NOT NULL,
  source text NOT NULL DEFAULT 'web',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_policy_acceptances_primary
    PRIMARY KEY (owner_id, policy_version),
  CONSTRAINT content_policy_acceptances_version_check
    CHECK (policy_version ~ '^[a-z0-9][a-z0-9._-]{1,49}$'),
  CONSTRAINT content_policy_acceptances_hash_check
    CHECK (document_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT content_policy_acceptances_source_check
    CHECK (source IN ('web', 'local_fixture'))
);

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY,
  reporter_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  category text NOT NULL,
  state text NOT NULL DEFAULT 'open',
  resolution text,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  resolved_at timestamptz,
  retention_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_owner_check
    CHECK (reporter_owner_id = target_owner_id),
  CONSTRAINT content_reports_category_check
    CHECK (category IN (
      'child_safety',
      'non_consensual_intimate',
      'fraud_impersonation',
      'extremism_violence',
      'illegal_activity',
      'privacy_ip',
      'other'
    )),
  CONSTRAINT content_reports_state_check
    CHECK (state IN ('open', 'resolved')),
  CONSTRAINT content_reports_resolution_check CHECK (
    (state = 'open' AND resolution IS NULL AND resolved_at IS NULL
      AND retention_until IS NULL)
    OR
    (state = 'resolved' AND resolution IN ('dismissed', 'removed')
      AND resolved_at IS NOT NULL
      AND retention_until = resolved_at + interval '12 months')
  ),
  CONSTRAINT content_reports_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT content_reports_operation_hash_check
    CHECK (operation_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT content_reports_reporter_idempotency_unique
    UNIQUE (reporter_owner_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_asset_unique
  ON content_reports (reporter_owner_id, asset_id)
  WHERE state = 'open' AND asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_reports_open_created_idx
  ON content_reports (created_at, id)
  WHERE state = 'open';
CREATE INDEX IF NOT EXISTS content_reports_target_created_idx
  ON content_reports (target_owner_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS content_moderation_actions (
  id uuid PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES content_reports(id) ON DELETE RESTRICT,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  previous_moderation_state text NOT NULL,
  resulting_moderation_state text NOT NULL,
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_moderation_actions_type_check
    CHECK (action_type IN ('review_opened', 'restore_asset', 'remove_asset')),
  CONSTRAINT content_moderation_actions_state_check CHECK (
    (action_type = 'review_opened'
      AND previous_moderation_state = 'quarantined'
      AND resulting_moderation_state = 'quarantined')
    OR
    (action_type = 'restore_asset'
      AND previous_moderation_state = 'quarantined'
      AND resulting_moderation_state = 'accepted')
    OR
    (action_type = 'remove_asset'
      AND previous_moderation_state = 'quarantined'
      AND resulting_moderation_state = 'rejected')
  ),
  CONSTRAINT content_moderation_actions_reason_check
    CHECK (length(reason) BETWEEN 2 AND 200),
  CONSTRAINT content_moderation_actions_idempotency_key_check
    CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT content_moderation_actions_operation_hash_check
    CHECK (operation_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT content_moderation_actions_actor_idempotency_unique
    UNIQUE (actor_owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS content_moderation_actions_report_created_idx
  ON content_moderation_actions (report_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS content_moderation_actions_target_created_idx
  ON content_moderation_actions (target_owner_id, created_at DESC, id DESC);

DROP TRIGGER IF EXISTS content_policy_acceptances_append_only
  ON content_policy_acceptances;
CREATE TRIGGER content_policy_acceptances_append_only
  BEFORE UPDATE OR DELETE ON content_policy_acceptances
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

DROP TRIGGER IF EXISTS content_moderation_actions_append_only
  ON content_moderation_actions;
CREATE TRIGGER content_moderation_actions_append_only
  BEFORE UPDATE OR DELETE ON content_moderation_actions
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
