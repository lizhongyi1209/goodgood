-- Extend image lines without rewriting historical jobs, prices or balances.
UPDATE managed_models SET lines = jsonb_build_object(
  'special', jsonb_build_object('enabled', true, 'prices', prices),
  'quality', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb),
  'dedicated', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb))
WHERE adapter_id IN ('gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare')
  AND lines = '{}'::jsonb;

ALTER TABLE generation_batches DROP CONSTRAINT generation_batches_image_line_check,
  ADD CONSTRAINT generation_batches_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2','nano-banana-pro',
      'gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare')
      AND image_line IN ('special','quality','dedicated')));
ALTER TABLE projects DROP CONSTRAINT projects_image_line_check,
  ADD CONSTRAINT projects_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2','nano-banana-pro',
      'gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare')
      AND image_line IN ('special','quality','dedicated')));
ALTER TABLE creation_drafts DROP CONSTRAINT creation_drafts_image_line_check,
  ADD CONSTRAINT creation_drafts_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2','nano-banana-pro',
      'gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare')
      AND image_line IN ('special','quality','dedicated')));
