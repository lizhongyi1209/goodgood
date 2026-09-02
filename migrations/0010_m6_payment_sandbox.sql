CREATE TABLE IF NOT EXISTS payment_product_versions (
  id uuid PRIMARY KEY,
  product_id text NOT NULL,
  version integer NOT NULL,
  currency text NOT NULL,
  money_amount_minor bigint NOT NULL,
  credit_unit text NOT NULL,
  credit_amount bigint NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_product_versions_product_id_check CHECK (length(product_id) BETWEEN 1 AND 100),
  CONSTRAINT payment_product_versions_version_check CHECK (version > 0),
  CONSTRAINT payment_product_versions_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT payment_product_versions_money_amount_check CHECK (money_amount_minor > 0),
  CONSTRAINT payment_product_versions_credit_unit_check CHECK (length(credit_unit) BETWEEN 1 AND 32),
  CONSTRAINT payment_product_versions_credit_amount_check CHECK (credit_amount > 0),
  CONSTRAINT payment_product_versions_effective_interval_check CHECK (effective_until IS NULL OR effective_until > effective_from),
  CONSTRAINT payment_product_versions_product_version_unique UNIQUE (product_id, version)
);

CREATE INDEX IF NOT EXISTS payment_product_versions_active_lookup_idx
  ON payment_product_versions (product_id, effective_from DESC, version DESC);

INSERT INTO payment_product_versions (
  id, product_id, version, currency, money_amount_minor,
  credit_unit, credit_amount, effective_from
)
VALUES (
  '61000000-0000-4000-8000-000000000001',
  'credits-500-cny',
  1,
  'CNY',
  1000,
  'credit',
  500,
  '2026-09-01 16:00:00+00'
)
ON CONFLICT (product_id, version) DO NOTHING;

DROP TRIGGER IF EXISTS payment_product_versions_immutable ON payment_product_versions;
CREATE TRIGGER payment_product_versions_immutable
  BEFORE UPDATE OR DELETE ON payment_product_versions
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  public_id text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_version_id uuid NOT NULL REFERENCES payment_product_versions(id) ON DELETE RESTRICT,
  product_id text NOT NULL,
  product_version integer NOT NULL,
  currency text NOT NULL,
  money_amount_minor bigint NOT NULL,
  credit_unit text NOT NULL,
  credit_amount bigint NOT NULL,
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL,
  operation_hash text NOT NULL,
  paid_ledger_entry_id uuid REFERENCES credit_ledger_entries(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT payment_orders_public_id_unique UNIQUE (public_id),
  CONSTRAINT payment_orders_owner_idempotency_unique UNIQUE (owner_id, idempotency_key),
  CONSTRAINT payment_orders_provider_order_unique UNIQUE (provider, provider_order_id),
  CONSTRAINT payment_orders_public_id_check CHECK (public_id ~ '^ord_[a-f0-9]{32}$'),
  CONSTRAINT payment_orders_product_id_check CHECK (length(product_id) BETWEEN 1 AND 100),
  CONSTRAINT payment_orders_product_version_check CHECK (product_version > 0),
  CONSTRAINT payment_orders_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT payment_orders_money_amount_check CHECK (money_amount_minor > 0),
  CONSTRAINT payment_orders_credit_unit_check CHECK (length(credit_unit) BETWEEN 1 AND 32),
  CONSTRAINT payment_orders_credit_amount_check CHECK (credit_amount > 0),
  CONSTRAINT payment_orders_provider_check CHECK (length(provider) BETWEEN 1 AND 64),
  CONSTRAINT payment_orders_provider_order_id_check CHECK (length(provider_order_id) BETWEEN 8 AND 200),
  CONSTRAINT payment_orders_state_check CHECK (state IN ('pending', 'paid')),
  CONSTRAINT payment_orders_idempotency_key_check CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT payment_orders_operation_hash_check CHECK (length(operation_hash) = 64),
  CONSTRAINT payment_orders_paid_state_check CHECK (
    (state = 'pending' AND paid_at IS NULL AND paid_ledger_entry_id IS NULL)
    OR (state = 'paid' AND paid_at IS NOT NULL AND paid_ledger_entry_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS payment_orders_owner_created_idx
  ON payment_orders (owner_id, created_at DESC, id);

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_entries_payment_grant_unique
  ON credit_ledger_entries (related_payment_ref)
  WHERE entry_type = 'grant' AND actor = 'payment' AND related_payment_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION goodgood_guard_payment_order_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.public_id IS DISTINCT FROM OLD.public_id
    OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.product_version_id IS DISTINCT FROM OLD.product_version_id
    OR NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.product_version IS DISTINCT FROM OLD.product_version
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.money_amount_minor IS DISTINCT FROM OLD.money_amount_minor
    OR NEW.credit_unit IS DISTINCT FROM OLD.credit_unit
    OR NEW.credit_amount IS DISTINCT FROM OLD.credit_amount
    OR NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.provider_order_id IS DISTINCT FROM OLD.provider_order_id
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.operation_hash IS DISTINCT FROM OLD.operation_hash
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'payment order snapshots are immutable';
  END IF;

  IF OLD.state = 'pending' AND NEW.state = 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.state IS DISTINCT FROM OLD.state
    OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
    OR NEW.paid_ledger_entry_id IS DISTINCT FROM OLD.paid_ledger_entry_id THEN
    RAISE EXCEPTION 'payment order transition is invalid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_orders_guard_update ON payment_orders;
CREATE TRIGGER payment_orders_guard_update
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION goodgood_guard_payment_order_update();

DROP TRIGGER IF EXISTS payment_orders_reject_delete ON payment_orders;
CREATE TRIGGER payment_orders_reject_delete
  BEFORE DELETE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  payment_order_id uuid NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  applied boolean NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_webhook_events_provider_event_unique UNIQUE (provider, provider_event_id),
  CONSTRAINT payment_webhook_events_provider_check CHECK (length(provider) BETWEEN 1 AND 64),
  CONSTRAINT payment_webhook_events_provider_event_id_check CHECK (length(provider_event_id) BETWEEN 8 AND 200),
  CONSTRAINT payment_webhook_events_type_check CHECK (event_type = 'payment.succeeded'),
  CONSTRAINT payment_webhook_events_payload_hash_check CHECK (length(payload_hash) = 64)
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_order_received_idx
  ON payment_webhook_events (payment_order_id, received_at, id);

DROP TRIGGER IF EXISTS payment_webhook_events_append_only ON payment_webhook_events;
CREATE TRIGGER payment_webhook_events_append_only
  BEFORE UPDATE OR DELETE ON payment_webhook_events
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
