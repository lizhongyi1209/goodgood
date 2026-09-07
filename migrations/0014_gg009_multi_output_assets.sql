ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS ordinal integer;

UPDATE assets
   SET ordinal = 1
 WHERE ordinal IS NULL;

ALTER TABLE assets
  ALTER COLUMN ordinal SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'assets_ordinal_check'
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT assets_ordinal_check CHECK (ordinal > 0);
  END IF;
END $$;

DROP INDEX IF EXISTS assets_job_unique;

CREATE UNIQUE INDEX IF NOT EXISTS assets_job_ordinal_unique
  ON assets (job_id, ordinal);

INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
VALUES
  ('60000000-0000-4000-8000-000000000007', 'gpt-image-2', '1K', 2, 'standard', 1, 'credit', 20, '2026-09-08 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000008', 'gpt-image-2', '2K', 2, 'standard', 1, 'credit', 20, '2026-09-08 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000009', 'gpt-image-2', '4K', 2, 'standard', 1, 'credit', 20, '2026-09-08 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000010', 'gpt-image-2', '1K', 4, 'standard', 1, 'credit', 40, '2026-09-08 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000011', 'gpt-image-2', '2K', 4, 'standard', 1, 'credit', 40, '2026-09-08 00:00:00+00'),
  ('60000000-0000-4000-8000-000000000012', 'gpt-image-2', '4K', 4, 'standard', 1, 'credit', 40, '2026-09-08 00:00:00+00')
ON CONFLICT (model_id, resolution, output_count, plan_context, version)
DO NOTHING;
