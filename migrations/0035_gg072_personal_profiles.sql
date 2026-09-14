CREATE TABLE personal_profiles (
 owner_id uuid PRIMARY KEY REFERENCES users(id),
 display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 30),
 handle text NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,24}$'),
 avatar_reference_id uuid REFERENCES reference_assets(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_profiles_avatar_reference_idx ON personal_profiles(avatar_reference_id) WHERE avatar_reference_id IS NOT NULL;
