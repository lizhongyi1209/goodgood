ALTER TABLE generation_batches
  ADD COLUMN thinking_level text NOT NULL DEFAULT 'low',
  ADD COLUMN google_search boolean NOT NULL DEFAULT false;

ALTER TABLE generation_batches
  ADD CONSTRAINT generation_batches_thinking_level_check
    CHECK (thinking_level IN ('low', 'high')),
  ADD CONSTRAINT generation_batches_banana_options_check
    CHECK (
      model_id = 'nano-banana-2'
      OR (thinking_level = 'low' AND google_search = false)
    );

ALTER TABLE projects
  ADD COLUMN thinking_level text NOT NULL DEFAULT 'low',
  ADD COLUMN google_search boolean NOT NULL DEFAULT false;

ALTER TABLE projects
  ADD CONSTRAINT projects_thinking_level_check
    CHECK (thinking_level IN ('low', 'high')),
  ADD CONSTRAINT projects_banana_options_check
    CHECK (
      model_id = 'nano-banana-2'
      OR (thinking_level = 'low' AND google_search = false)
    );

ALTER TABLE creation_drafts
  ADD COLUMN thinking_level text NOT NULL DEFAULT 'low',
  ADD COLUMN google_search boolean NOT NULL DEFAULT false;

ALTER TABLE creation_drafts
  ADD CONSTRAINT creation_drafts_thinking_level_check
    CHECK (thinking_level IN ('low', 'high')),
  ADD CONSTRAINT creation_drafts_banana_options_check
    CHECK (
      model_id = 'nano-banana-2'
      OR (thinking_level = 'low' AND google_search = false)
    );
