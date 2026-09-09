ALTER TABLE credit_accounts
  ADD COLUMN IF NOT EXISTS payment_funded_available_balance bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_funded_reserved_balance bigint NOT NULL DEFAULT 0;

ALTER TABLE credit_ledger_entries
  ADD COLUMN IF NOT EXISTS payment_funded_amount bigint NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS credit_ledger_entries_append_only ON credit_ledger_entries;

UPDATE credit_accounts
   SET payment_funded_available_balance = 0,
       payment_funded_reserved_balance = 0;

UPDATE credit_ledger_entries
   SET payment_funded_amount = 0;

DO $$
DECLARE
  account_row record;
  entry_row record;
  prior_payment_amount bigint;
  payment_available bigint;
  payment_reserved bigint;
  non_payment_available bigint;
  non_payment_reserved bigint;
  operation_amount bigint;
  payment_amount bigint;
  non_payment_amount bigint;
BEGIN
  FOR account_row IN
    SELECT * FROM credit_accounts ORDER BY id
  LOOP
    payment_available := 0;
    payment_reserved := 0;
    non_payment_available := 0;
    non_payment_reserved := 0;

    FOR entry_row IN
      SELECT entry.*,
             EXISTS (
               SELECT 1
                 FROM payment_orders payment
                WHERE payment.paid_ledger_entry_id = entry.id
                  AND payment.state = 'paid'
             ) AS is_paid_order_grant
        FROM credit_ledger_entries entry
       WHERE entry.account_id = account_row.id
       ORDER BY entry.created_at, entry.id
    LOOP
      payment_amount := 0;

      IF entry_row.entry_type = 'grant' THEN
        IF entry_row.is_paid_order_grant THEN
          payment_amount := entry_row.amount;
          payment_available := payment_available + entry_row.amount;
        ELSE
          non_payment_available := non_payment_available + entry_row.amount;
        END IF;
      ELSIF entry_row.entry_type = 'reserve' THEN
        operation_amount := -entry_row.amount;
        non_payment_amount := LEAST(non_payment_available, operation_amount);
        payment_amount := operation_amount - non_payment_amount;
        IF payment_amount > payment_available THEN
          RAISE EXCEPTION 'credit provenance rebuild overdraws account % at reserve %',
            account_row.id, entry_row.id;
        END IF;
        non_payment_available := non_payment_available - non_payment_amount;
        non_payment_reserved := non_payment_reserved + non_payment_amount;
        payment_available := payment_available - payment_amount;
        payment_reserved := payment_reserved + payment_amount;
        payment_amount := -payment_amount;
      ELSIF entry_row.entry_type IN ('settle', 'release') THEN
        SELECT payment_funded_amount
          INTO prior_payment_amount
          FROM credit_ledger_entries
         WHERE id = entry_row.prior_entry_id
           AND entry_type = 'reserve';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'credit provenance rebuild cannot find reservation for %',
            entry_row.id;
        END IF;
        payment_amount := -prior_payment_amount;
        operation_amount := abs(entry_row.amount);
        non_payment_amount := operation_amount - payment_amount;
        IF payment_amount < 0 OR non_payment_amount < 0
          OR payment_amount > payment_reserved
          OR non_payment_amount > non_payment_reserved THEN
          RAISE EXCEPTION 'credit provenance rebuild has inconsistent reservation closure %',
            entry_row.id;
        END IF;
        payment_reserved := payment_reserved - payment_amount;
        non_payment_reserved := non_payment_reserved - non_payment_amount;
        IF entry_row.entry_type = 'release' THEN
          payment_available := payment_available + payment_amount;
          non_payment_available := non_payment_available + non_payment_amount;
        ELSE
          payment_amount := -payment_amount;
        END IF;
      ELSIF entry_row.entry_type = 'refund' THEN
        SELECT payment_funded_amount
          INTO prior_payment_amount
          FROM credit_ledger_entries
         WHERE id = entry_row.prior_entry_id
           AND entry_type = 'settle';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'credit provenance rebuild cannot find settlement for refund %',
            entry_row.id;
        END IF;
        payment_amount := -prior_payment_amount;
        non_payment_amount := entry_row.amount - payment_amount;
        IF payment_amount < 0 OR non_payment_amount < 0 THEN
          RAISE EXCEPTION 'credit provenance rebuild has inconsistent refund %',
            entry_row.id;
        END IF;
        payment_available := payment_available + payment_amount;
        non_payment_available := non_payment_available + non_payment_amount;
      ELSIF entry_row.entry_type IN ('expire', 'adjust')
        AND entry_row.amount < 0 THEN
        operation_amount := -entry_row.amount;
        non_payment_amount := LEAST(non_payment_available, operation_amount);
        payment_amount := operation_amount - non_payment_amount;
        IF payment_amount > payment_available THEN
          RAISE EXCEPTION 'credit provenance rebuild overdraws account % at entry %',
            account_row.id, entry_row.id;
        END IF;
        non_payment_available := non_payment_available - non_payment_amount;
        payment_available := payment_available - payment_amount;
        payment_amount := -payment_amount;
      ELSIF entry_row.entry_type = 'adjust' AND entry_row.amount > 0 THEN
        non_payment_available := non_payment_available + entry_row.amount;
      ELSE
        RAISE EXCEPTION 'credit provenance rebuild found unsupported entry type %',
          entry_row.entry_type;
      END IF;

      UPDATE credit_ledger_entries
         SET payment_funded_amount = payment_amount
       WHERE id = entry_row.id;
    END LOOP;

    IF payment_available + non_payment_available <> account_row.available_balance
      OR payment_reserved + non_payment_reserved <> account_row.reserved_balance THEN
      RAISE EXCEPTION 'credit provenance rebuild disagrees with cached account %',
        account_row.id;
    END IF;

    UPDATE credit_accounts
       SET payment_funded_available_balance = payment_available,
           payment_funded_reserved_balance = payment_reserved
     WHERE id = account_row.id;
  END LOOP;
END;
$$;

ALTER TABLE credit_accounts
  DROP CONSTRAINT IF EXISTS credit_accounts_payment_funded_available_check,
  DROP CONSTRAINT IF EXISTS credit_accounts_payment_funded_reserved_check,
  ADD CONSTRAINT credit_accounts_payment_funded_available_check CHECK (
    payment_funded_available_balance >= 0
    AND payment_funded_available_balance <= available_balance
  ),
  ADD CONSTRAINT credit_accounts_payment_funded_reserved_check CHECK (
    payment_funded_reserved_balance >= 0
    AND payment_funded_reserved_balance <= reserved_balance
  );

ALTER TABLE credit_ledger_entries
  DROP CONSTRAINT IF EXISTS credit_ledger_entries_payment_funded_amount_check,
  ADD CONSTRAINT credit_ledger_entries_payment_funded_amount_check CHECK (
    (amount > 0 AND payment_funded_amount BETWEEN 0 AND amount)
    OR (amount < 0 AND payment_funded_amount BETWEEN amount AND 0)
  );

DROP TRIGGER IF EXISTS credit_ledger_entries_append_only ON credit_ledger_entries;
CREATE TRIGGER credit_ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON credit_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION goodgood_reject_immutable_mutation();
