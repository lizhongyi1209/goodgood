CREATE TABLE announcements (
  id uuid PRIMARY KEY,
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 100),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 12000),
  important boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','withdrawn','deleted')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  publication_version integer NOT NULL DEFAULT 0 CHECK (publication_version >= 0),
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_mutation_id uuid NOT NULL,
  last_mutation_hash text NOT NULL CHECK (length(last_mutation_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',now()),
  updated_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',now()),
  CHECK (status <> 'published' OR (published_at IS NOT NULL AND publication_version > 0 AND length(title) > 0 AND length(body) > 0))
);
CREATE INDEX announcements_feed_idx ON announcements (pinned DESC, published_at DESC, id DESC) WHERE status = 'published';
CREATE INDEX announcements_management_idx ON announcements (updated_at DESC, id DESC) WHERE status <> 'deleted';

CREATE TABLE announcement_reads (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  publication_version integer NOT NULL CHECK (publication_version > 0),
  first_read_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, owner_id)
);
CREATE INDEX announcement_reads_owner_idx ON announcement_reads (owner_id, announcement_id);

CREATE TABLE announcement_likes (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, owner_id)
);
CREATE TABLE announcement_events (
  id uuid PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('save','publish','withdraw','delete')),
  version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcement_events_post_idx ON announcement_events (announcement_id, created_at DESC);
