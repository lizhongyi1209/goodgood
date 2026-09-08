INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('62000000-0000-4000-8000-000000000001', 'nano-banana-2', '1K', 2, 'standard', 1, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('62000000-0000-4000-8000-000000000002', 'nano-banana-2', '2K', 2, 'standard', 1, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('62000000-0000-4000-8000-000000000003', 'nano-banana-2', '4K', 2, 'standard', 1, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('62000000-0000-4000-8000-000000000004', 'nano-banana-2', '1K', 4, 'standard', 1, 'credit', 40, '2026-09-07 00:00:00+00'),
  ('62000000-0000-4000-8000-000000000005', 'nano-banana-2', '2K', 4, 'standard', 1, 'credit', 40, '2026-09-07 00:00:00+00'),
  ('62000000-0000-4000-8000-000000000006', 'nano-banana-2', '4K', 4, 'standard', 1, 'credit', 40, '2026-09-07 00:00:00+00')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;
