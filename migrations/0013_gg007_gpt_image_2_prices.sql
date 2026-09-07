INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('60000000-0000-4000-8000-000000000004', 'gpt-image-2', '1K', 1, 'standard', 1, 'credit', 10, '2026-09-07 16:00:00+00'),
  ('60000000-0000-4000-8000-000000000005', 'gpt-image-2', '2K', 1, 'standard', 1, 'credit', 10, '2026-09-07 16:00:00+00'),
  ('60000000-0000-4000-8000-000000000006', 'gpt-image-2', '4K', 1, 'standard', 1, 'credit', 10, '2026-09-07 16:00:00+00')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;
