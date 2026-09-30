-- GG-203: eight outputs are an existing single-image Nano task fan-out.
-- Preserve historical batches, immutable prices, balances and ledger entries.
ALTER TABLE generation_batches
  DROP CONSTRAINT generation_batches_count_check,
  ADD CONSTRAINT generation_batches_count_check CHECK (
    requested_count IN (1, 2, 4) OR
    (requested_count = 8 AND model_id IN ('nano-banana-2', 'nano-banana-pro'))
  );

-- Price records use catalog IDs, so adapter-specific admission remains in the
-- generation capability and managed-price publication code.
ALTER TABLE price_versions
  DROP CONSTRAINT price_versions_output_count_check,
  ADD CONSTRAINT price_versions_output_count_check CHECK (output_count IN (1, 2, 4, 8));

WITH single_prices AS (
  SELECT DISTINCT ON (p.model_id, p.resolution, p.plan_context)
    p.id, p.model_id, p.resolution, p.plan_context,
    p.credit_unit, p.credit_amount
  FROM price_versions AS p
  JOIN managed_models AS model ON model.id = p.model_id
  WHERE model.adapter_id IN ('nano-banana-2', 'nano-banana-pro')
    AND p.output_count = 1
    AND p.effective_from <= now()
    AND (p.effective_until IS NULL OR p.effective_until > now())
    AND CASE p.plan_context
      WHEN 'standard' THEN
        COALESCE(model.lines->'special'->>'enabled', 'true') = 'true'
      WHEN 'banana-quality' THEN
        model.lines->'quality'->>'enabled' = 'true'
      WHEN 'banana-dedicated' THEN
        model.lines->'dedicated'->>'enabled' = 'true'
      ELSE false
    END
  ORDER BY p.model_id, p.resolution, p.plan_context,
    p.effective_from DESC, p.version DESC
)
INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
SELECT md5('gg203:nano-eight:' || single_prices.id::text)::uuid,
  single_prices.model_id, single_prices.resolution, 8,
  single_prices.plan_context,
  COALESCE((SELECT MAX(prior.version) FROM price_versions AS prior
    WHERE prior.model_id = single_prices.model_id
      AND prior.resolution = single_prices.resolution
      AND prior.output_count = 8
      AND prior.plan_context = single_prices.plan_context), 0) + 1,
  single_prices.credit_unit,
  single_prices.credit_amount * 8,
  now()
FROM single_prices
WHERE NOT EXISTS (
  SELECT 1 FROM price_versions AS existing
  WHERE existing.model_id = single_prices.model_id
    AND existing.resolution = single_prices.resolution
    AND existing.output_count = 8
    AND existing.plan_context = single_prices.plan_context
    AND existing.effective_from <= now()
    AND (existing.effective_until IS NULL OR existing.effective_until > now())
);
