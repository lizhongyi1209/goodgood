CREATE TABLE feedback_tickets (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK(category IN ('generation','account','billing','assets','suggestion','other')),
  message text NOT NULL CHECK(char_length(message) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','processing','resolved','closed')),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  request_key text NOT NULL CHECK(char_length(request_key) BETWEEN 8 AND 200),
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,request_key)
);
CREATE INDEX feedback_owner_time_idx ON feedback_tickets(owner_id,created_at DESC,id DESC);
CREATE INDEX feedback_time_idx ON feedback_tickets(created_at DESC,id DESC);
CREATE TABLE feedback_images (
  ticket_id uuid NOT NULL REFERENCES feedback_tickets(id),
  position integer NOT NULL CHECK(position BETWEEN 1 AND 5),
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 10485760),
  PRIMARY KEY(ticket_id,position)
);
CREATE TABLE feedback_events (
  id uuid PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES feedback_tickets(id),
  actor_owner_id uuid NOT NULL REFERENCES users(id),
  message text CHECK(message IS NULL OR char_length(message) BETWEEN 1 AND 4000),
  status text NOT NULL CHECK(status IN ('open','processing','resolved','closed')),
  request_key text NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_owner_id,request_key)
);
CREATE INDEX feedback_event_ticket_idx ON feedback_events(ticket_id,created_at,id);
CREATE FUNCTION reject_feedback_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'feedback history is immutable'; END $$;
CREATE TRIGGER feedback_history_immutable BEFORE UPDATE OR DELETE ON feedback_events
FOR EACH ROW EXECUTE FUNCTION reject_feedback_event_mutation();
