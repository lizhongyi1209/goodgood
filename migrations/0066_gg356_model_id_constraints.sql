-- GG-356: the Seedream catalog entry from 0054 was accepted by the API, but
-- the legacy five-model SQL checks rejected its batch before a job was created.
-- Match the existing model-ID checks in db/schema.ts. Supported adapters,
-- enabled models and prices are still validated at the application boundary.
-- Only constraint metadata changes; preserve every existing record and quote.
ALTER TABLE generation_batches
  DROP CONSTRAINT generation_batches_model_check,
  ADD CONSTRAINT generation_batches_model_check
    CHECK (model_id ~ '^[a-z0-9][a-z0-9._-]{1,79}$');

ALTER TABLE projects
  DROP CONSTRAINT projects_model_check,
  ADD CONSTRAINT projects_model_check
    CHECK (model_id ~ '^[a-z0-9][a-z0-9._-]{1,79}$');

ALTER TABLE creation_drafts
  DROP CONSTRAINT creation_drafts_model_check,
  ADD CONSTRAINT creation_drafts_model_check
    CHECK (model_id ~ '^[a-z0-9][a-z0-9._-]{1,79}$');
