-- Add product-line state; preserve historical prices, hashes and balances.
ALTER TABLE managed_models ADD COLUMN lines jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(lines) = 'object');
UPDATE managed_models SET lines = jsonb_build_object(
  'special', jsonb_build_object('enabled', true, 'prices', prices),
  'quality', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb),
  'dedicated', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb))
WHERE adapter_id IN ('nano-banana-2', 'nano-banana-pro');

ALTER TABLE generation_batches ADD COLUMN image_line text,
  ADD CONSTRAINT generation_batches_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2', 'nano-banana-pro')
      AND image_line IN ('special','quality','dedicated')));
ALTER TABLE projects ADD COLUMN image_line text,
  ADD CONSTRAINT projects_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2', 'nano-banana-pro')
      AND image_line IN ('special','quality','dedicated')));
ALTER TABLE creation_drafts ADD COLUMN image_line text,
  ADD CONSTRAINT creation_drafts_image_line_check CHECK (
    image_line IS NULL OR (model_id IN ('nano-banana-2', 'nano-banana-pro')
      AND image_line IN ('special','quality','dedicated')));
