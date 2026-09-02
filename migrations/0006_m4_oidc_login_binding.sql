ALTER TABLE auth_login_attempts
  ADD COLUMN IF NOT EXISTS browser_binding_hash text;

UPDATE auth_login_attempts
   SET browser_binding_hash = repeat('0', 64),
       consumed_at = COALESCE(consumed_at, now())
 WHERE browser_binding_hash IS NULL;

ALTER TABLE auth_login_attempts
  ALTER COLUMN browser_binding_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'auth_login_attempts_browser_binding_hash_check'
       AND conrelid = 'auth_login_attempts'::regclass
  ) THEN
    ALTER TABLE auth_login_attempts
      ADD CONSTRAINT auth_login_attempts_browser_binding_hash_check
      CHECK (length(browser_binding_hash) = 64);
  END IF;
END
$$;
