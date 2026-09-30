-- GG-189: derive Pro batch prices from the active single-image version.
-- Existing prices and ledger entries are preserved. A missing single-image
-- quote yields no new batch quote, so admission continues to fail closed.
WITH single_prices AS (
  SELECT DISTINCT ON (p.model_id, p.resolution, p.plan_context)
    p.id, p.model_id, p.resolution, p.plan_context,
    p.credit_unit, p.credit_amount
  FROM price_versions AS p
  JOIN managed_models AS model ON model.id = p.model_id
  WHERE model.adapter_id = 'nano-banana-pro'
    AND p.output_count = 1
    AND p.effective_from <= now()
    AND (p.effective_until IS NULL OR p.effective_until > now())
  ORDER BY p.model_id, p.resolution, p.plan_context,
    p.effective_from DESC, p.version DESC
), counts AS (
  SELECT output_count FROM (VALUES (2), (4)) AS choices(output_count)
)
INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
SELECT md5('gg189:pro:' || single_prices.id::text || ':' || counts.output_count)::uuid,
  single_prices.model_id, single_prices.resolution, counts.output_count,
  single_prices.plan_context,
  COALESCE((SELECT MAX(prior.version) FROM price_versions AS prior
    WHERE prior.model_id = single_prices.model_id
      AND prior.resolution = single_prices.resolution
      AND prior.output_count = counts.output_count
      AND prior.plan_context = single_prices.plan_context), 0) + 1,
  single_prices.credit_unit,
  single_prices.credit_amount * counts.output_count,
  now()
FROM single_prices CROSS JOIN counts
WHERE NOT EXISTS (
  SELECT 1 FROM price_versions AS existing
  WHERE existing.model_id = single_prices.model_id
    AND existing.resolution = single_prices.resolution
    AND existing.output_count = counts.output_count
    AND existing.plan_context = single_prices.plan_context
    AND existing.effective_from <= now()
    AND (existing.effective_until IS NULL OR existing.effective_until > now())
);
