-- Preserve legacy audit rows and ledger source classes; never infer recharge from notes.
ALTER TABLE administrative_actions ADD COLUMN credit_grant_type text;

ALTER TABLE administrative_actions
  DROP CONSTRAINT IF EXISTS administrative_actions_type_check,
  DROP CONSTRAINT IF EXISTS administrative_actions_status_check;

ALTER TABLE administrative_actions
  ADD CONSTRAINT administrative_actions_type_check
    CHECK (action_type IN (
      'bootstrap_site_owner', 'approve_account', 'suspend_account',
      'restore_account', 'grant_test_credits', 'grant_credits', 'set_business_role',
      'set_direct_parent'
    )),
  ADD CONSTRAINT administrative_actions_status_check
    CHECK (
      (action_type = 'bootstrap_site_owner'
        AND previous_status IN ('pending', 'active')
        AND resulting_status = 'active'
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type IN ('approve_account', 'suspend_account', 'restore_account')
        AND previous_status IN ('pending', 'active', 'suspended')
        AND resulting_status IN ('active', 'suspended')
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type IN ('grant_test_credits','grant_credits')
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount BETWEEN 1 AND 5000
        AND credit_ledger_entry_id IS NOT NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type = 'set_business_role'
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND (previous_business_role IS NULL OR previous_business_role IN ('enterprise', 'distributor'))
        AND (resulting_business_role IS NULL OR resulting_business_role IN ('enterprise', 'distributor'))
        AND previous_business_role IS DISTINCT FROM resulting_business_role
        AND business_role_assignment_id IS NOT NULL
        AND previous_parent_owner_id IS NULL AND resulting_parent_owner_id IS NULL
        AND account_relationship_id IS NULL)
      OR
      (action_type = 'set_direct_parent'
        AND previous_status IS NULL AND resulting_status IS NULL
        AND credit_amount IS NULL AND credit_ledger_entry_id IS NULL
        AND previous_business_role IS NULL AND resulting_business_role IS NULL
        AND business_role_assignment_id IS NULL
        AND previous_parent_owner_id IS DISTINCT FROM resulting_parent_owner_id
        AND account_relationship_id IS NOT NULL)
    );

ALTER TABLE administrative_actions ADD CONSTRAINT administrative_actions_credit_grant_type_check CHECK (
 (action_type='grant_credits' AND credit_amount IS NOT NULL AND credit_grant_type IS NOT NULL AND credit_grant_type IN ('paid_recharge','gift','promotion','test','service_compensation','other'))
 OR (action_type<>'grant_credits' AND credit_grant_type IS NULL)
);
