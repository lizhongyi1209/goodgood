-- Unit exchange, never rewrite immutable ledger/price/order/job history.
LOCK TABLE credit_accounts, workspace_credit_accounts, member_budgets,
  generation_jobs, payment_orders IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM generation_jobs WHERE state IN ('queued','running','refining'))
    OR EXISTS (SELECT 1 FROM credit_accounts WHERE reserved_balance <> 0)
    OR EXISTS (SELECT 1 FROM workspace_credit_accounts WHERE reserved_balance <> 0)
    OR EXISTS (SELECT 1 FROM member_budgets WHERE reserved_usage <> 0)
    OR EXISTS (SELECT 1 FROM payment_orders WHERE state = 'pending') THEN
    RAISE EXCEPTION 'GG-052 unit exchange requires drained jobs, reservations and pending orders';
  END IF;
END $$;

CREATE TABLE credit_unit_exchanges (
  source_kind text NOT NULL,
  source_id uuid NOT NULL,
  target_id uuid,
  original_record jsonb NOT NULL,
  multiplier integer NOT NULL DEFAULT 2 CHECK (multiplier = 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_kind, source_id)
);
CREATE TRIGGER credit_unit_exchanges_append_only BEFORE UPDATE OR DELETE
  ON credit_unit_exchanges FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();

INSERT INTO credit_unit_exchanges (source_kind,source_id,target_id,original_record)
SELECT 'personal', id, md5('gg052:personal:'||id::text)::uuid, to_jsonb(a)
  FROM credit_accounts a WHERE unit='credit';
INSERT INTO credit_accounts (id,owner_id,unit,available_balance,reserved_balance,
  payment_funded_available_balance,payment_funded_reserved_balance,version,status)
SELECT e.target_id,a.owner_id,'credit-cny-cent',a.available_balance*2,0,
  a.payment_funded_available_balance*2,0,1,a.status
  FROM credit_accounts a JOIN credit_unit_exchanges e ON e.source_id=a.id AND e.source_kind='personal';
INSERT INTO credit_ledger_entries (id,account_id,owner_id,entry_type,amount,
  payment_funded_amount,idempotency_key,operation_hash,reason,actor,metadata)
SELECT md5('gg052:grant:'||a.id::text)::uuid,e.target_id,a.owner_id,'grant',
  a.available_balance*2,a.payment_funded_available_balance*2,
  'unit-exchange:gg052:'||a.id::text,
  md5('gg052:'||a.id::text)||md5('gg052:'||a.id::text),
  'credit_unit_exchange','system',jsonb_build_object('sourceAccountId',a.id,'sourceUnit','credit','multiplier',2)
  FROM credit_accounts a JOIN credit_unit_exchanges e ON e.source_id=a.id AND e.source_kind='personal'
 WHERE a.available_balance>0;
UPDATE credit_accounts SET status='closed',version=version+1,updated_at=now() WHERE unit='credit';

INSERT INTO credit_unit_exchanges (source_kind,source_id,target_id,original_record)
SELECT 'workspace', id, md5('gg052:workspace:'||id::text)::uuid, to_jsonb(a)
  FROM workspace_credit_accounts a WHERE unit='credit';
INSERT INTO workspace_credit_accounts (id,workspace_id,unit,available_balance,
  reserved_balance,allocated_balance,version,status)
SELECT e.target_id,a.workspace_id,'credit-cny-cent',a.available_balance*2,0,
  a.allocated_balance*2,1,a.status
  FROM workspace_credit_accounts a JOIN credit_unit_exchanges e ON e.source_id=a.id AND e.source_kind='workspace';
INSERT INTO workspace_credit_ledger_entries (id,account_id,workspace_id,entry_type,
  amount,idempotency_key,operation_hash,reason,actor,metadata)
SELECT md5('gg052:workspace-grant:'||a.id::text)::uuid,e.target_id,a.workspace_id,'grant',
  a.available_balance*2,'unit-exchange:gg052:'||a.id::text,
  md5('gg052:'||a.id::text)||md5('gg052:'||a.id::text),
  'credit_unit_exchange','system',jsonb_build_object('sourceAccountId',a.id,'sourceUnit','credit','multiplier',2)
  FROM workspace_credit_accounts a JOIN credit_unit_exchanges e ON e.source_id=a.id AND e.source_kind='workspace'
 WHERE a.available_balance>0;
UPDATE workspace_credit_accounts SET status='closed',version=version+1,updated_at=now() WHERE unit='credit';
INSERT INTO credit_unit_exchanges (source_kind,source_id,original_record)
SELECT 'budget',id,to_jsonb(b) FROM member_budgets b;
UPDATE member_budgets SET credit_limit=credit_limit*2,settled_usage=settled_usage*2,
  version=version+1,updated_at=now();
ALTER TABLE workspace_credit_accounts ALTER COLUMN unit SET DEFAULT 'credit-cny-cent';
ALTER TABLE credit_transfers DROP CONSTRAINT credit_transfers_unit_check;
ALTER TABLE credit_transfers ADD CONSTRAINT credit_transfers_unit_check
  CHECK (unit IN ('credit','credit-cny-cent'));

INSERT INTO price_versions (id,model_id,resolution,output_count,plan_context,version,
  credit_unit,credit_amount,effective_from)
SELECT md5('gg052:price:'||p.id::text)::uuid,p.model_id,p.resolution,p.output_count,
  p.plan_context,p.version+1,'credit-cny-cent',p.credit_amount*2,now()
FROM (SELECT DISTINCT ON (model_id,resolution,output_count,plan_context) *
  FROM price_versions ORDER BY model_id,resolution,output_count,plan_context,version DESC) p;
INSERT INTO payment_product_versions (id,product_id,version,currency,money_amount_minor,
  credit_unit,credit_amount,effective_from)
SELECT md5('gg052:product:'||p.id::text)::uuid,p.product_id,p.version+1,p.currency,
  p.money_amount_minor,'credit-cny-cent',p.credit_amount*2,now()
FROM (SELECT DISTINCT ON (product_id) * FROM payment_product_versions ORDER BY product_id,version DESC) p;

CREATE TABLE managed_models (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description)<=200),
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  adapter_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE price_versions DROP CONSTRAINT price_versions_model_check;
ALTER TABLE price_versions ADD CONSTRAINT price_versions_model_check
  CHECK (model_id ~ '^[a-z0-9][a-z0-9._-]{1,79}$');
CREATE TABLE managed_model_events (
  id uuid PRIMARY KEY,
  model_id text NOT NULL REFERENCES managed_models(id),
  actor_owner_id uuid NOT NULL REFERENCES users(id),
  before_record jsonb,
  after_record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER managed_model_events_append_only BEFORE UPDATE OR DELETE
  ON managed_model_events FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
INSERT INTO managed_models (id,name,description,media_type,adapter_id,enabled,prices) VALUES
 ('nano-banana-2','Nano Banana 2','快速，批量','image','nano-banana-2',true,'{"1K":{"output":20},"2K":{"output":20},"4K":{"output":20}}'),
 ('nano-banana-pro','Nano Banana Pro','高质量资产，视觉优先','image','nano-banana-pro',false,'{"1K":{"output":30},"2K":{"output":30},"4K":{"output":30}}'),
 ('gpt-image-2.5-sunburst','GPT IMAGE 2.5 sunburst','高真实感，提示词遵循','image','gpt-image-2.5-sunburst',true,'{"1K":{"output":20},"2K":{"output":20},"4K":{"output":20}}'),
 ('gpt-image-2','GPT IMAGE 2','高真实感，提示词遵循','image','gpt-image-2',true,'{"1K":{"output":20},"2K":{"output":20},"4K":{"output":20}}'),
 ('gpt-image-2.5-flare','GPT IMAGE 2.5 flare','高真实感，提示词遵循','image','gpt-image-2.5-flare',true,'{"1K":{"output":20},"2K":{"output":20},"4K":{"output":20}}'),
 ('seedance-2-0','Seedance 2.0','','video','seedance-2-0',false,'{}'),
 ('seedance-2-0-fast','Seedance 2.0 Fast','','video','seedance-2-0-fast',false,'{}'),
 ('seedance-2-5','Seedance 2.5','','video','seedance-2-5',false,'{}'),
 ('seedance-2-0-mini','Seedance 2.0 Mini','','video','seedance-2-0-mini',false,'{}');
ALTER TABLE generation_batches ADD COLUMN catalog_model_id text,
  ADD COLUMN catalog_model_name text;
ALTER TABLE projects ADD COLUMN catalog_model_id text;
ALTER TABLE creation_drafts ADD COLUMN catalog_model_id text;
