-- Preserve the immutable 0014 price history while making the launch prices
-- active for the full 2026-09-08 Asia/Shanghai validation day.
INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('61000000-0000-4000-8000-000000000007', 'gpt-image-2', '1K', 2, 'standard', 2, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('61000000-0000-4000-8000-000000000008', 'gpt-image-2', '2K', 2, 'standard', 2, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('61000000-0000-4000-8000-000000000009', 'gpt-image-2', '4K', 2, 'standard', 2, 'credit', 20, '2026-09-07 00:00:00+00'),
  ('61000000-0000-4000-8000-000000000010', 'gpt-image-2', '1K', 4, 'standard', 2, 'credit', 40, '2026-09-07 00:00:00+00'),
  ('61000000-0000-4000-8000-000000000011', 'gpt-image-2', '2K', 4, 'standard', 2, 'credit', 40, '2026-09-07 00:00:00+00'),
  ('61000000-0000-4000-8000-000000000012', 'gpt-image-2', '4K', 4, 'standard', 2, 'credit', 40, '2026-09-07 00:00:00+00')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;
