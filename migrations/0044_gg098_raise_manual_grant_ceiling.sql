-- Raise the single manual credit-grant ceiling from 5,000 to 1,000,000 credits.
--
-- 1,000,000 credits is the site owner's stated maximum for one recharge entry
-- (RMB 10,000 at the accepted 100 credits / CNY). The previous 5,000-credit
-- ceiling (RMB 50) was enforced in three places; this migration moves the only
-- one that cannot be changed in application code.
--
-- Both constraints are reproduced in full here and rewritten with the new
-- bound. Every other clause is copied unchanged from
-- 0039_gg081_classified_credit_grants.sql; nothing is relaxed, and no existing
-- row is modified or deleted. A value above the old ceiling must already have
-- been rejected, so no stored row can violate the widened bound.
--
-- The application checks in server/admin/api.mjs and server/admin/repository.mjs
-- are updated in the same change; leaving this constraint at 5,000 would make a
-- larger grant fail on insert rather than return a clean validation error.

ALTER TABLE administrative_actions
  DROP CONSTRAINT IF EXISTS administrative_actions_status_check,
  DROP CONSTRAINT IF EXISTS administrative_actions_credit_grant_type_check;

ALTER TABLE administrative_actions
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
        AND credit_amount BETWEEN 1 AND 1000000
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
