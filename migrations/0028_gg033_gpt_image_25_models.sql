ALTER TABLE creation_drafts
  DROP CONSTRAINT creation_drafts_model_check,
  DROP CONSTRAINT creation_drafts_gpt_options_check,
  ADD CONSTRAINT creation_drafts_model_check
    CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare')),
  ADD CONSTRAINT creation_drafts_gpt_options_check
    CHECK (model_id IN ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') OR (quality = 'auto' AND background = 'auto' AND output_format = 'png'));

ALTER TABLE projects
  DROP CONSTRAINT projects_model_check,
  DROP CONSTRAINT projects_gpt_options_check,
  ADD CONSTRAINT projects_model_check
    CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare')),
  ADD CONSTRAINT projects_gpt_options_check
    CHECK (model_id IN ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') OR (quality = 'auto' AND background = 'auto' AND output_format = 'png'));

ALTER TABLE generation_batches
  DROP CONSTRAINT generation_batches_model_check,
  DROP CONSTRAINT generation_batches_gpt_options_check,
  ADD CONSTRAINT generation_batches_model_check
    CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare')),
  ADD CONSTRAINT generation_batches_gpt_options_check
    CHECK (model_id IN ('gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare') OR (quality = 'auto' AND background = 'auto' AND output_format = 'png'));

ALTER TABLE price_versions
  DROP CONSTRAINT price_versions_model_check,
  ADD CONSTRAINT price_versions_model_check
    CHECK (model_id IN ('nano-banana-2', 'nano-banana-pro', 'gpt-image-2.5-sunburst', 'gpt-image-2', 'gpt-image-2.5-flare'));

INSERT INTO price_versions (
  id,
  model_id,
  resolution,
  output_count,
  plan_context,
  version,
  credit_unit,
  credit_amount,
  effective_from
) VALUES
  ('65000000-0000-4000-8000-000000000001', 'gpt-image-2.5-sunburst', '1K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000002', 'gpt-image-2.5-sunburst', '2K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000003', 'gpt-image-2.5-sunburst', '4K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000004', 'gpt-image-2.5-sunburst', '1K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000005', 'gpt-image-2.5-sunburst', '2K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000006', 'gpt-image-2.5-sunburst', '4K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000007', 'gpt-image-2.5-sunburst', '1K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000008', 'gpt-image-2.5-sunburst', '2K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000009', 'gpt-image-2.5-sunburst', '4K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000010', 'gpt-image-2.5-flare', '1K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000011', 'gpt-image-2.5-flare', '2K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000012', 'gpt-image-2.5-flare', '4K', 1, 'standard', 1, 'credit', 10, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000013', 'gpt-image-2.5-flare', '1K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000014', 'gpt-image-2.5-flare', '2K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000015', 'gpt-image-2.5-flare', '4K', 2, 'standard', 1, 'credit', 20, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000016', 'gpt-image-2.5-flare', '1K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000017', 'gpt-image-2.5-flare', '2K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08'),
  ('65000000-0000-4000-8000-000000000018', 'gpt-image-2.5-flare', '4K', 4, 'standard', 1, 'credit', 40, '2026-09-12 00:00:00+08');
