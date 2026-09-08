ALTER TABLE creation_drafts
  ADD COLUMN quality text NOT NULL DEFAULT 'auto',
  ADD COLUMN background text NOT NULL DEFAULT 'auto',
  ADD COLUMN output_format text NOT NULL DEFAULT 'png';

ALTER TABLE projects
  ADD COLUMN quality text NOT NULL DEFAULT 'auto',
  ADD COLUMN background text NOT NULL DEFAULT 'auto',
  ADD COLUMN output_format text NOT NULL DEFAULT 'png';

ALTER TABLE generation_batches
  ADD COLUMN quality text NOT NULL DEFAULT 'auto',
  ADD COLUMN background text NOT NULL DEFAULT 'auto',
  ADD COLUMN output_format text NOT NULL DEFAULT 'png';

ALTER TABLE creation_drafts
  ADD CONSTRAINT creation_drafts_gpt_quality_check
    CHECK (quality IN ('auto', 'low', 'medium', 'high')),
  ADD CONSTRAINT creation_drafts_gpt_background_check
    CHECK (background IN ('auto', 'transparent')),
  ADD CONSTRAINT creation_drafts_gpt_output_format_check
    CHECK (output_format IN ('png', 'jpeg', 'webp')),
  ADD CONSTRAINT creation_drafts_gpt_options_check
    CHECK (model_id = 'gpt-image-2' OR (quality = 'auto' AND background = 'auto' AND output_format = 'png')),
  ADD CONSTRAINT creation_drafts_transparent_format_check
    CHECK (background <> 'transparent' OR output_format IN ('png', 'webp'));

ALTER TABLE projects
  ADD CONSTRAINT projects_gpt_quality_check
    CHECK (quality IN ('auto', 'low', 'medium', 'high')),
  ADD CONSTRAINT projects_gpt_background_check
    CHECK (background IN ('auto', 'transparent')),
  ADD CONSTRAINT projects_gpt_output_format_check
    CHECK (output_format IN ('png', 'jpeg', 'webp')),
  ADD CONSTRAINT projects_gpt_options_check
    CHECK (model_id = 'gpt-image-2' OR (quality = 'auto' AND background = 'auto' AND output_format = 'png')),
  ADD CONSTRAINT projects_transparent_format_check
    CHECK (background <> 'transparent' OR output_format IN ('png', 'webp'));

ALTER TABLE generation_batches
  ADD CONSTRAINT generation_batches_gpt_quality_check
    CHECK (quality IN ('auto', 'low', 'medium', 'high')),
  ADD CONSTRAINT generation_batches_gpt_background_check
    CHECK (background IN ('auto', 'transparent')),
  ADD CONSTRAINT generation_batches_gpt_output_format_check
    CHECK (output_format IN ('png', 'jpeg', 'webp')),
  ADD CONSTRAINT generation_batches_gpt_options_check
    CHECK (model_id = 'gpt-image-2' OR (quality = 'auto' AND background = 'auto' AND output_format = 'png')),
  ADD CONSTRAINT generation_batches_transparent_format_check
    CHECK (background <> 'transparent' OR output_format IN ('png', 'webp'));
