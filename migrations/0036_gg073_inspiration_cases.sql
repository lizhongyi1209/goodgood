CREATE TABLE inspiration_cases (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id),
 source_asset_id uuid NOT NULL REFERENCES assets(id),
 before_reference_id uuid REFERENCES reference_assets(id),
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 60),
 description text NOT NULL DEFAULT '' CHECK(char_length(description)<=1000),
 prompt text NOT NULL,
 parameters jsonb NOT NULL CHECK(jsonb_typeof(parameters)='object'),
 author_snapshot jsonb NOT NULL CHECK(jsonb_typeof(author_snapshot)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 deleted_by uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX inspiration_cases_active_source_idx ON inspiration_cases(owner_id,source_asset_id) WHERE deleted_at IS NULL;
CREATE INDEX inspiration_cases_directory_idx ON inspiration_cases(created_at DESC,id DESC) WHERE deleted_at IS NULL;
CREATE INDEX inspiration_cases_before_idx ON inspiration_cases(before_reference_id) WHERE deleted_at IS NULL;
CREATE TABLE inspiration_likes (
 case_id uuid NOT NULL REFERENCES inspiration_cases(id),
 owner_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(case_id,owner_id)
);
CREATE TABLE inspiration_events (
 id uuid PRIMARY KEY,
 case_id uuid NOT NULL REFERENCES inspiration_cases(id),
 actor_owner_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK(action IN ('publish','withdraw','owner_remove')),
 created_at timestamptz NOT NULL DEFAULT now()
);
