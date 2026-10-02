ALTER TABLE text_generation_jobs
  ADD COLUMN charged_credit_amount integer NOT NULL DEFAULT 0 CHECK (charged_credit_amount >= 0);
-- Historical cancellations were fully released. Record successful fees without rebilling.
UPDATE text_generation_jobs SET charged_credit_amount = 20 WHERE state = 'succeeded';

ALTER TABLE workspace_credit_ledger_entries DROP CONSTRAINT workspace_credit_ledger_type_check;
ALTER TABLE workspace_credit_ledger_entries ADD CONSTRAINT workspace_credit_ledger_type_check
  CHECK (entry_type IN ('grant', 'reserve', 'settle', 'release', 'refund'));
ALTER TABLE workspace_credit_ledger_entries DROP CONSTRAINT workspace_credit_ledger_amount_check;
ALTER TABLE workspace_credit_ledger_entries ADD CONSTRAINT workspace_credit_ledger_amount_check CHECK (
  (entry_type IN ('grant', 'release', 'refund') AND amount > 0)
  OR (entry_type IN ('reserve', 'settle') AND amount < 0)
);
ALTER TABLE workspace_credit_ledger_entries DROP CONSTRAINT workspace_credit_ledger_relation_check;
ALTER TABLE workspace_credit_ledger_entries ADD CONSTRAINT workspace_credit_ledger_relation_check CHECK (
  (entry_type = 'grant' AND member_budget_id IS NULL AND related_job_id IS NULL AND prior_entry_id IS NULL)
  OR (entry_type = 'reserve' AND member_budget_id IS NOT NULL AND related_job_id IS NOT NULL AND prior_entry_id IS NULL)
  OR (entry_type IN ('settle', 'release', 'refund') AND member_budget_id IS NOT NULL
    AND related_job_id IS NOT NULL AND prior_entry_id IS NOT NULL)
);
CREATE UNIQUE INDEX workspace_credit_ledger_settlement_refund_unique
  ON workspace_credit_ledger_entries(prior_entry_id) WHERE entry_type = 'refund';

ALTER TABLE member_budget_events DROP CONSTRAINT member_budget_events_type_check;
ALTER TABLE member_budget_events ADD CONSTRAINT member_budget_events_type_check
  CHECK (event_type IN ('allocate', 'reclaim', 'reserve', 'settle', 'release', 'refund'));
ALTER TABLE member_budget_events DROP CONSTRAINT member_budget_events_relation_check;
ALTER TABLE member_budget_events ADD CONSTRAINT member_budget_events_relation_check CHECK (
  (event_type IN ('allocate', 'reclaim') AND actor_owner_id IS NOT NULL AND related_job_id IS NULL
    AND prior_event_id IS NULL AND credit_ledger_entry_id IS NULL)
  OR (event_type = 'reserve' AND actor_owner_id IS NOT NULL AND related_job_id IS NOT NULL
    AND prior_event_id IS NULL AND credit_ledger_entry_id IS NOT NULL)
  OR (event_type IN ('settle', 'release', 'refund') AND actor_owner_id IS NULL AND related_job_id IS NOT NULL
    AND prior_event_id IS NOT NULL AND credit_ledger_entry_id IS NOT NULL)
);
CREATE UNIQUE INDEX member_budget_events_settlement_refund_unique
  ON member_budget_events(prior_event_id) WHERE event_type = 'refund';
