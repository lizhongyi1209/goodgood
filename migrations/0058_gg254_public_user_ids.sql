-- UUID identity and all existing ownership relations remain unchanged.
-- The migration runner wraps this file in one transaction. Block registrations
-- while assigning every existing account its stable public number.
LOCK TABLE users IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
 IF (SELECT count(*) FROM users) > 1000000 THEN
  RAISE EXCEPTION 'Public user ID capacity exceeded' USING ERRCODE = '54000';
 END IF;
END $$;

ALTER TABLE users ADD COLUMN public_user_id integer;
WITH numbered AS (
 SELECT id, (row_number() OVER (ORDER BY created_at, id) - 1)::integer AS public_id
 FROM users
)
UPDATE users u SET public_user_id = numbered.public_id
FROM numbered WHERE numbered.id = u.id;
ALTER TABLE users
 ALTER COLUMN public_user_id SET NOT NULL,
 ADD CONSTRAINT users_public_user_id_range CHECK (public_user_id BETWEEN 0 AND 999999),
 ADD CONSTRAINT users_public_user_id_unique UNIQUE (public_user_id);

-- A locked transactional counter does not consume IDs on failed registrations.
-- Deleted accounts' numbers are never recycled.
CREATE TABLE user_public_id_allocator (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 next_id integer NOT NULL CHECK (next_id BETWEEN 0 AND 1000000)
);
INSERT INTO user_public_id_allocator(singleton, next_id)
SELECT true, count(*)::integer FROM users;

CREATE FUNCTION assign_public_user_id() RETURNS trigger LANGUAGE plpgsql VOLATILE AS $$
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
 -- BEFORE INSERT also runs for ON CONFLICT DO NOTHING. Serialize allocation,
 -- then reuse an existing conflict row's number instead of consuming a slot.
 PERFORM next_id FROM user_public_id_allocator WHERE singleton FOR UPDATE;
 SELECT public_user_id INTO NEW.public_user_id FROM users
 WHERE id = NEW.id OR email = NEW.email LIMIT 1;
 IF FOUND THEN
  RETURN NEW;
 END IF;
 UPDATE user_public_id_allocator SET next_id = next_id + 1
 WHERE singleton AND next_id < 1000000
 RETURNING next_id - 1 INTO NEW.public_user_id;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Public user ID capacity exceeded' USING ERRCODE = '54000';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER users_assign_public_user_id
 BEFORE INSERT OR UPDATE OF public_user_id ON users
 FOR EACH ROW EXECUTE FUNCTION assign_public_user_id();

-- Retain historical handles without accepting them as editable user identity.
ALTER TABLE personal_profiles ALTER COLUMN handle SET DEFAULT 'goder';
