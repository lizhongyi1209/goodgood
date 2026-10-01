-- One-time replacement of registration-order display numbers; UUIDs stay intact.
-- The migration runner wraps all DDL and reassignment in a single transaction.
LOCK TABLE users IN ACCESS EXCLUSIVE MODE;
LOCK TABLE user_public_id_allocator IN EXCLUSIVE MODE;

-- A virtual pool initially contains value=slot for every slot 0..999999.
-- Only swaps differing from that initial state need storage. Drawing removes
-- the chosen value by moving the last remaining value into its slot.
CREATE TABLE user_public_id_swaps (
 slot integer PRIMARY KEY CHECK (slot BETWEEN 0 AND 999999),
 value integer NOT NULL CHECK (value BETWEEN 0 AND 999999)
);

CREATE FUNCTION allocate_random_public_user_id() RETURNS integer
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
 used integer;
 remaining integer;
 chosen_slot integer;
 chosen_value integer;
 last_slot integer;
 last_value integer;
 random_bits bigint;
 accepted_limit bigint;
BEGIN
 SELECT next_id INTO used FROM user_public_id_allocator WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Public user ID allocator missing' USING ERRCODE = '55000';
 END IF;
 IF used >= 1000000 THEN
  RAISE EXCEPTION 'Public user ID capacity exceeded' USING ERRCODE = '54000';
 END IF;
 remaining := 1000000 - used;
 -- The UUID's first 32 bits are random, without its version/variant bits.
 -- Rejection avoids modulo bias while preserving the entire six-digit space.
 accepted_limit := 4294967296::bigint - (4294967296::bigint % remaining);
 LOOP
  random_bits := ('x' || substring(replace(pg_catalog.gen_random_uuid()::text, '-', '') FROM 1 FOR 8))::bit(32)::bigint;
  EXIT WHEN random_bits < accepted_limit;
 END LOOP;
 chosen_slot := (random_bits % remaining)::integer;
 last_slot := remaining - 1;
 SELECT value INTO chosen_value FROM user_public_id_swaps WHERE slot = chosen_slot;
 IF NOT FOUND THEN chosen_value := chosen_slot; END IF;
 SELECT value INTO last_value FROM user_public_id_swaps WHERE slot = last_slot;
 IF NOT FOUND THEN last_value := last_slot; END IF;

 DELETE FROM user_public_id_swaps WHERE slot = last_slot;
 IF chosen_slot <> last_slot THEN
  IF last_value = chosen_slot THEN
   DELETE FROM user_public_id_swaps WHERE slot = chosen_slot;
  ELSE
   INSERT INTO user_public_id_swaps(slot, value) VALUES(chosen_slot, last_value)
   ON CONFLICT(slot) DO UPDATE SET value = EXCLUDED.value;
  END IF;
 END IF;
 UPDATE user_public_id_allocator SET next_id = used + 1 WHERE singleton;
 RETURN chosen_value;
END $$;

-- Temporarily suspend the old immutability/unique checks under the users lock
-- so a newly drawn value can overlap an old number awaiting reassignment.
DROP TRIGGER users_assign_public_user_id ON users;
ALTER TABLE users DROP CONSTRAINT users_public_user_id_unique;
DO $$
DECLARE
 previous_used integer;
 live_users integer;
 account record;
 discarded integer;
BEGIN
 SELECT next_id INTO previous_used FROM user_public_id_allocator WHERE singleton FOR UPDATE;
 SELECT count(*)::integer INTO live_users FROM users;
 IF previous_used IS NULL OR previous_used < live_users THEN
  RAISE EXCEPTION 'Public user ID allocator inconsistent' USING ERRCODE = '55000';
 END IF;
 UPDATE user_public_id_allocator SET next_id = 0 WHERE singleton;
 FOR account IN SELECT id FROM users ORDER BY created_at, id LOOP
  UPDATE users SET public_user_id = allocate_random_public_user_id() WHERE id = account.id;
 END LOOP;
 -- Deleted accounts still consume their historical allocation slots.
 FOR discarded IN 1..(previous_used - live_users) LOOP
  PERFORM allocate_random_public_user_id();
 END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_public_user_id_unique UNIQUE(public_user_id);

CREATE OR REPLACE FUNCTION assign_public_user_id() RETURNS trigger
LANGUAGE plpgsql VOLATILE AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.public_user_id IS DISTINCT FROM OLD.public_user_id THEN
   RAISE EXCEPTION 'Public user ID is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.public_user_id IS NOT NULL THEN
  RAISE EXCEPTION 'Public user ID must be allocated' USING ERRCODE = '23514';
 END IF;
 -- BEFORE INSERT runs even for ON CONFLICT DO NOTHING. Check duplicates under
 -- the same allocator lock before consuming a remaining random number.
 PERFORM next_id FROM user_public_id_allocator WHERE singleton FOR UPDATE;
 SELECT public_user_id INTO NEW.public_user_id FROM users
 WHERE id = NEW.id OR email = NEW.email LIMIT 1;
 IF FOUND THEN RETURN NEW; END IF;
 NEW.public_user_id := allocate_random_public_user_id();
 RETURN NEW;
END $$;
CREATE TRIGGER users_assign_public_user_id
 BEFORE INSERT OR UPDATE OF public_user_id ON users
 FOR EACH ROW EXECUTE FUNCTION assign_public_user_id();
