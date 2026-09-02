CREATE TABLE IF NOT EXISTS price_versions (
  id uuid PRIMARY KEY,
  model_id text NOT NULL,
  resolution text NOT NULL,
  output_count integer NOT NULL,
  plan_context text NOT NULL,
  version integer NOT NULL,
  credit_unit text NOT NULL,
  credit_amount bigint NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_versions_model_check CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2')),
  CONSTRAINT price_versions_resolution_check CHECK (resolution IN ('1K', '2K', '4K')),
  CONSTRAINT price_versions_output_count_check CHECK (output_count IN (1, 2, 4)),
  CONSTRAINT price_versions_plan_context_check CHECK (length(plan_context) BETWEEN 1 AND 64),
  CONSTRAINT price_versions_version_check CHECK (version > 0),
  CONSTRAINT price_versions_credit_unit_check CHECK (length(credit_unit) BETWEEN 1 AND 32),
  CONSTRAINT price_versions_credit_amount_check CHECK (credit_amount > 0),
  CONSTRAINT price_versions_effective_interval_check CHECK (effective_until IS NULL OR effective_until > effective_from),
  CONSTRAINT price_versions_product_version_unique UNIQUE (model_id, resolution, output_count, plan_context, version)
);

CREATE INDEX IF NOT EXISTS price_versions_active_lookup_idx
  ON price_versions (
    model_id, resolution, output_count, plan_context,
    effective_from DESC, version DESC
  );

CREATE TABLE IF NOT EXISTS credit_accounts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  unit text NOT NULL,
  available_balance bigint NOT NULL DEFAULT 0,
  reserved_balance bigint NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_accounts_owner_unit_unique UNIQUE (owner_id, unit),
  CONSTRAINT credit_accounts_id_owner_unique UNIQUE (id, owner_id),
  CONSTRAINT credit_accounts_unit_check CHECK (length(unit) BETWEEN 1 AND 32),
  CONSTRAINT credit_accounts_available_balance_check CHECK (available_balance >= 0),
  CONSTRAINT credit_accounts_reserved_balance_check CHECK (reserved_balance >= 0),
  CONSTRAINT credit_accounts_version_check CHECK (version >= 0),
  CONSTRAINT credit_accounts_status_check CHECK (status IN ('active', 'frozen', 'closed'))
);

CREATE INDEX IF NOT EXISTS credit_accounts_owner_idx
  ON credit_accounts (owner_id);

CREATE TABLE IF NOT EXISTS credit_ledger_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  entry_type text NOT NULL,
  amount bigint NOT NULL,
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  reason text NOT NULL,
  related_job_id uuid REFERENCES generation_jobs(id) ON DELETE RESTRICT,
  related_payment_ref text,
  prior_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  actor text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_ledger_entries_account_owner_fk
    FOREIGN KEY (account_id, owner_id)
    REFERENCES credit_accounts(id, owner_id) ON DELETE RESTRICT,
  CONSTRAINT credit_ledger_entries_type_check CHECK (entry_type IN ('grant', 'reserve', 'settle', 'release', 'refund', 'expire', 'adjust')),
  CONSTRAINT credit_ledger_entries_amount_sign_check CHECK (
    (entry_type IN ('grant', 'release', 'refund') AND amount > 0)
    OR (entry_type IN ('reserve', 'settle', 'expire') AND amount < 0)
    OR (entry_type = 'adjust' AND amount <> 0)
  ),
  CONSTRAINT credit_ledger_entries_idempotency_key_check CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT credit_ledger_entries_operation_hash_check CHECK (length(operation_hash) = 64),
  CONSTRAINT credit_ledger_entries_reason_check CHECK (length(reason) BETWEEN 1 AND 200),
  CONSTRAINT credit_ledger_entries_actor_check CHECK (actor IN ('system', 'worker', 'operator', 'payment')),
  CONSTRAINT credit_ledger_entries_relation_check CHECK (
    (entry_type IN ('settle', 'release', 'refund') AND prior_entry_id IS NOT NULL AND related_job_id IS NOT NULL)
    OR (entry_type = 'reserve' AND prior_entry_id IS NULL AND related_job_id IS NOT NULL)
    OR (entry_type IN ('grant', 'expire', 'adjust'))
  ),
  CONSTRAINT credit_ledger_entries_account_idempotency_unique UNIQUE (account_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS credit_ledger_entries_owner_created_idx
  ON credit_ledger_entries (owner_id, created_at, id);
CREATE INDEX IF NOT EXISTS credit_ledger_entries_job_idx
  ON credit_ledger_entries (related_job_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_entries_job_reserve_unique
  ON credit_ledger_entries (related_job_id)
  WHERE entry_type = 'reserve' AND related_job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_entries_reservation_close_unique
  ON credit_ledger_entries (prior_entry_id)
  WHERE entry_type IN ('settle', 'release');
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_entries_settlement_refund_unique
  ON credit_ledger_entries (prior_entry_id)
  WHERE entry_type = 'refund';

ALTER TABLE generation_batches
  ADD COLUMN IF NOT EXISTS price_version_id uuid REFERENCES price_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS quoted_credit_unit text,
  ADD COLUMN IF NOT EXISTS quoted_credit_amount bigint;

ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS credit_reservation_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_credit_reservation_unique
  ON generation_jobs (credit_reservation_entry_id)
  WHERE credit_reservation_entry_id IS NOT NULL;

INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'nano-banana-2', '1K', 1, 'standard', 1, 'credit', 10, '2026-09-01 16:00:00+00'),
  ('60000000-0000-4000-8000-000000000002', 'nano-banana-2', '2K', 1, 'standard', 1, 'credit', 10, '2026-09-01 16:00:00+00'),
  ('60000000-0000-4000-8000-000000000003', 'nano-banana-2', '4K', 1, 'standard', 1, 'credit', 10, '2026-09-01 16:00:00+00')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;

INSERT INTO credit_accounts (id, owner_id, unit)
SELECT md5('goodgood-credit-account:credit:' || id::text)::uuid, id, 'credit'
  FROM users
ON CONFLICT (owner_id, unit) DO NOTHING;

WITH inserted_welcome_grants AS (
  INSERT INTO credit_ledger_entries (
    id, account_id, owner_id, entry_type, amount, idempotency_key,
    operation_hash, reason, actor, metadata
  )
  SELECT
    md5('goodgood-welcome-grant:v1:' || account.owner_id::text)::uuid,
    account.id,
    account.owner_id,
    'grant',
    100,
    'welcome-grant:v1:' || account.owner_id::text,
    md5('goodgood-welcome-grant-operation:v1:' || account.owner_id::text)
      || md5('goodgood-welcome-grant-operation-proof:v1:' || account.owner_id::text),
    'welcome_grant_v1',
    'system',
    '{"campaign":"welcome-v1","images":10}'::jsonb
  FROM credit_accounts account
  WHERE account.unit = 'credit'
  ON CONFLICT (account_id, idempotency_key) DO NOTHING
  RETURNING account_id, amount
)
UPDATE credit_accounts account
   SET available_balance = account.available_balance + seeded_grant.amount,
       version = account.version + 1,
       updated_at = now()
  FROM inserted_welcome_grants seeded_grant
 WHERE account.id = seeded_grant.account_id;

CREATE OR REPLACE FUNCTION goodgood_reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is immutable; append or publish a new record instead', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS price_versions_immutable ON price_versions;
CREATE TRIGGER price_versions_immutable
  BEFORE UPDATE OR DELETE ON price_versions
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

DROP TRIGGER IF EXISTS credit_ledger_entries_append_only ON credit_ledger_entries;
CREATE TRIGGER credit_ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON credit_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
