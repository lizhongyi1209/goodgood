DO $$
DECLARE
  unexpected_count bigint;
BEGIN
  SELECT count(*)
    INTO unexpected_count
    FROM users
   WHERE id IN (
     '00000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000002'
   )
     AND (id, email) NOT IN (
       ('00000000-0000-4000-8000-000000000001'::uuid, 'm3-local@goodgood.invalid'),
       ('00000000-0000-4000-8000-000000000002'::uuid, 'm4-local-b@goodgood.invalid')
     );
  IF unexpected_count <> 0 THEN
    RAISE EXCEPTION 'A reserved local fixture owner has unexpected identity data.';
  END IF;

  SELECT count(*)
    INTO unexpected_count
    FROM auth_identities
   WHERE owner_id IN (
     '00000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000002'
   )
     AND (owner_id, issuer, subject) NOT IN (
       ('00000000-0000-4000-8000-000000000001'::uuid, 'goodgood-local', 'local-user-a'),
       ('00000000-0000-4000-8000-000000000002'::uuid, 'goodgood-local', 'local-user-b')
     );
  IF unexpected_count <> 0 THEN
    RAISE EXCEPTION 'A reserved local fixture owner has unexpected authentication data.';
  END IF;

  SELECT count(*)
    INTO unexpected_count
    FROM credit_ledger_entries
   WHERE owner_id IN (
     '00000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000002'
   )
     AND NOT (
       entry_type = 'grant'
       AND amount = 100
       AND reason = 'welcome_grant_v1'
       AND actor = 'system'
       AND idempotency_key = 'welcome-grant:v1:' || owner_id::text
     );
  IF unexpected_count <> 0 THEN
    RAISE EXCEPTION 'A reserved local fixture owner has non-fixture credit history; reset the disposable local database before migrating.';
  END IF;
END
$$;

ALTER TABLE credit_ledger_entries
  DISABLE TRIGGER credit_ledger_entries_append_only;

DELETE FROM credit_ledger_entries
 WHERE owner_id IN (
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002'
 );

ALTER TABLE credit_ledger_entries
  ENABLE TRIGGER credit_ledger_entries_append_only;

DELETE FROM credit_accounts
 WHERE owner_id IN (
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002'
 );

DELETE FROM auth_identities
 WHERE owner_id IN (
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002'
 );

DELETE FROM users
 WHERE id IN (
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000002'
 );
