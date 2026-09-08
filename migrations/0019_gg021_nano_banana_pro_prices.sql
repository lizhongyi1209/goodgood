INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('63000000-0000-4000-8000-000000000001', 'nano-banana-pro', '1K', 1, 'standard', 1, 'credit', 15, '2026-09-09 00:00:00+08'),
  ('63000000-0000-4000-8000-000000000002', 'nano-banana-pro', '2K', 1, 'standard', 1, 'credit', 15, '2026-09-09 00:00:00+08'),
  ('63000000-0000-4000-8000-000000000003', 'nano-banana-pro', '4K', 1, 'standard', 1, 'credit', 15, '2026-09-09 00:00:00+08')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;
