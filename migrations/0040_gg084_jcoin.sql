CREATE TABLE IF NOT EXISTS jcoin_treasury (
  symbol text PRIMARY KEY CHECK (symbol = 'JCOIN'),
  supply_atoms bigint NOT NULL CHECK (supply_atoms = 10000000000000000),
  user_pool_atoms bigint NOT NULL CHECK (user_pool_atoms = 5000000000000000),
  assigned_atoms bigint NOT NULL CHECK (assigned_atoms = 100000000000000),
  issued_atoms bigint NOT NULL DEFAULT 0 CHECK (issued_atoms >= 0 AND issued_atoms <= assigned_atoms),
  recovered_atoms bigint NOT NULL DEFAULT 0 CHECK (recovered_atoms >= 0 AND recovered_atoms <= issued_atoms),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jcoin_batches (
  id uuid PRIMARY KEY,
  number integer NOT NULL UNIQUE CHECK (number > 0),
  budget_atoms bigint NOT NULL CHECK (budget_atoms > 0),
  reward_atoms_per_credit bigint NOT NULL CHECK (reward_atoms_per_credit > 0),
  starts_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','exhausted')),
  issued_atoms bigint NOT NULL DEFAULT 0 CHECK (issued_atoms >= 0 AND issued_atoms <= budget_atoms),
  recovered_atoms bigint NOT NULL DEFAULT 0 CHECK (recovered_atoms >= 0 AND recovered_atoms <= issued_atoms),
  activated_at timestamptz,
  exhausted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (number <> 1 OR (budget_atoms = 100000000000000 AND reward_atoms_per_credit = 2000000 AND starts_at = '2026-09-17T16:00:00Z')),
  CHECK ((status = 'draft' AND activated_at IS NULL) OR (status <> 'draft' AND activated_at IS NOT NULL)),
  CHECK ((status = 'exhausted' AND issued_atoms = budget_atoms AND exhausted_at IS NOT NULL) OR (status <> 'exhausted' AND exhausted_at IS NULL))
);
CREATE TABLE IF NOT EXISTS jcoin_accounts (
  owner_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  balance_atoms bigint NOT NULL DEFAULT 0 CHECK (balance_atoms >= 0),
  earned_atoms bigint NOT NULL DEFAULT 0 CHECK (earned_atoms >= 0),
  reversed_atoms bigint NOT NULL DEFAULT 0 CHECK (reversed_atoms >= 0 AND reversed_atoms <= earned_atoms),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_atoms = earned_atoms - reversed_atoms)
);
CREATE TABLE IF NOT EXISTS jcoin_source_events (
  source_id uuid PRIMARY KEY REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  outcome text NOT NULL CHECK (outcome IN ('rewarded','refunded_before_reward','not_paid','unsupported_unit','outside_batch','zero_source','refund_applied')),
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jcoin_ledger_entries (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES jcoin_accounts(owner_id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES jcoin_batches(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL UNIQUE REFERENCES jcoin_source_events(source_id) ON DELETE RESTRICT,
  prior_entry_id uuid UNIQUE REFERENCES jcoin_ledger_entries(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('mining_reward','refund_reversal')),
  amount_atoms bigint NOT NULL,
  consumption_credits bigint,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'mining_reward' AND amount_atoms > 0 AND prior_entry_id IS NULL AND consumption_credits IS NOT NULL AND consumption_credits > 0)
    OR (kind = 'refund_reversal' AND amount_atoms < 0 AND prior_entry_id IS NOT NULL AND consumption_credits IS NULL))
);
CREATE INDEX IF NOT EXISTS jcoin_ledger_owner_time_idx ON jcoin_ledger_entries(owner_id, occurred_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS jcoin_administrative_actions (
  id uuid PRIMARY KEY,
  actor_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('start','pause','resume','process')),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  operation_hash text NOT NULL CHECK (length(operation_hash) = 64),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_owner_id,idempotency_key)
);
DROP TRIGGER IF EXISTS jcoin_ledger_immutable ON jcoin_ledger_entries;
CREATE TRIGGER jcoin_ledger_immutable BEFORE UPDATE OR DELETE ON jcoin_ledger_entries FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
DROP TRIGGER IF EXISTS jcoin_sources_immutable ON jcoin_source_events;
CREATE TRIGGER jcoin_sources_immutable BEFORE UPDATE OR DELETE ON jcoin_source_events FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
DROP TRIGGER IF EXISTS jcoin_actions_immutable ON jcoin_administrative_actions;
CREATE TRIGGER jcoin_actions_immutable BEFORE UPDATE OR DELETE ON jcoin_administrative_actions FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
INSERT INTO jcoin_treasury(symbol,supply_atoms,user_pool_atoms,assigned_atoms)
VALUES ('JCOIN',10000000000000000,5000000000000000,100000000000000) ON CONFLICT DO NOTHING;
INSERT INTO jcoin_batches(id,number,budget_atoms,reward_atoms_per_credit,starts_at)
VALUES ('84000000-0000-4000-8000-000000000001',1,100000000000000,2000000,'2026-09-17T16:00:00Z') ON CONFLICT DO NOTHING;
