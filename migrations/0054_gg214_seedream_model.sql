-- GG-214: ordinary Seedream generation, current credits, one requested output.
-- Add a new catalog entry only; preserve any already configured Seedream model.
-- No historical quote, balance, reservation, asset or job is rewritten.
WITH new_model AS (
  INSERT INTO managed_models (
    id, name, description, media_type, adapter_id, enabled, prices, lines
  ) VALUES (
    'seedream-5.0-pro', 'Seedream 5.0 Pro', '', 'image',
    'seedream-5.0-pro', true,
    '{"1K":{"output":30},"2K":{"output":60}}'::jsonb,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), specifications (resolution, credit_amount) AS (
  VALUES ('1K'::text, 30::bigint), ('2K'::text, 60::bigint)
)
INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
SELECT md5('gg214:seedream:ordinary:' || specifications.resolution)::uuid,
  new_model.id, specifications.resolution, 1, 'standard',
  COALESCE((SELECT MAX(prior.version) FROM price_versions AS prior
    WHERE prior.model_id = new_model.id
      AND prior.resolution = specifications.resolution
      AND prior.output_count = 1
      AND prior.plan_context = 'standard'), 0) + 1,
  'credit-cny-cent', specifications.credit_amount, now()
FROM new_model
CROSS JOIN specifications
WHERE NOT EXISTS (
  SELECT 1 FROM price_versions AS existing
  WHERE existing.model_id = new_model.id
    AND existing.resolution = specifications.resolution
    AND existing.output_count = 1
    AND existing.plan_context = 'standard'
    AND existing.effective_from <= now()
    AND (existing.effective_until IS NULL OR existing.effective_until > now())
)
ON CONFLICT (id) DO NOTHING;
