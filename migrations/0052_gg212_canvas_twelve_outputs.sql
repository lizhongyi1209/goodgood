-- GG-212: canvas image batches accept every integer output count from 1 to 12.
-- Preserve lobby draft/project limits, historical jobs, prices and ledger data.
ALTER TABLE generation_batches
  DROP CONSTRAINT generation_batches_count_check,
  ADD CONSTRAINT generation_batches_count_check CHECK (requested_count BETWEEN 1 AND 12);

ALTER TABLE price_versions
  DROP CONSTRAINT price_versions_output_count_check,
  ADD CONSTRAINT price_versions_output_count_check CHECK (output_count BETWEEN 1 AND 12);

WITH single_prices AS (
  SELECT DISTINCT ON (p.model_id, p.resolution, p.plan_context)
    p.id, p.model_id, p.resolution, p.plan_context,
    p.credit_unit, p.credit_amount, p.effective_until
  FROM price_versions AS p
  JOIN managed_models AS model ON model.id = p.model_id
  WHERE model.adapter_id IN (
      'nano-banana-2', 'nano-banana-pro',
      'gpt-image-2', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare'
    )
    AND p.output_count = 1
    AND p.effective_from <= now()
    AND (p.effective_until IS NULL OR p.effective_until > now())
    -- Keep the complete quality context; only its line selects admission.
    AND p.plan_context ~ '^(standard|banana-(quality|dedicated))(:gpt-(auto|low|medium|high|xhigh|max))?$'
    AND CASE split_part(p.plan_context, ':gpt-', 1)
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
  credit_unit, credit_amount, effective_from, effective_until
)
SELECT md5('gg212:canvas-count:' || single_prices.id::text || ':' || counts.output_count::text)::uuid,
  single_prices.model_id, single_prices.resolution, counts.output_count,
  single_prices.plan_context,
  COALESCE((SELECT MAX(prior.version) FROM price_versions AS prior
    WHERE prior.model_id = single_prices.model_id
      AND prior.resolution = single_prices.resolution
      AND prior.output_count = counts.output_count
      AND prior.plan_context = single_prices.plan_context), 0) + 1,
  single_prices.credit_unit,
  single_prices.credit_amount * counts.output_count,
  now(), single_prices.effective_until
FROM single_prices
CROSS JOIN generate_series(2, 12) AS counts(output_count)
WHERE NOT EXISTS (
  SELECT 1 FROM price_versions AS existing
  WHERE existing.model_id = single_prices.model_id
    AND existing.resolution = single_prices.resolution
    AND existing.output_count = counts.output_count
    AND existing.plan_context = single_prices.plan_context
    AND existing.effective_from <= now()
    AND (existing.effective_until IS NULL OR existing.effective_until > now())
);
