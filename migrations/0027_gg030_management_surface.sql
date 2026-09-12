ALTER TABLE workspace_audit_events
  DROP CONSTRAINT IF EXISTS workspace_audit_events_action_check;

ALTER TABLE workspace_audit_events
  ADD CONSTRAINT workspace_audit_events_action_check CHECK (action_type IN (
    'create_organization',
    'invite_member',
    'accept_invitation',
    'revoke_invitation',
    'change_member_role',
    'suspend_member',
    'restore_member',
    'remove_member',
    'grant_organization_credits',
    'set_member_budget',
    'download_organization_asset'
  ));
