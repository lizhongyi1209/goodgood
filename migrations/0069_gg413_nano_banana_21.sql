-- GG-413: add the separate Nano Banana 2.1 catalog and inherited special prices.
-- Existing models, price versions, jobs, user records and balances are untouched.
-- Match schema checks before accepting the new model's Banana request options.
ALTER TABLE generation_batches
  DROP CONSTRAINT generation_batches_banana_options_check,
  ADD CONSTRAINT generation_batches_banana_options_check CHECK (
    model_id IN ('nano-banana-2','nano-banana-2.1') OR
    (thinking_level = 'low' AND google_search = false)),
  DROP CONSTRAINT generation_batches_image_line_check,
  ADD CONSTRAINT generation_batches_image_line_check CHECK (
    image_line IS NULL OR
    (model_id = 'nano-banana-2.1' AND image_line = 'special') OR
    (model_id IN ('nano-banana-2','nano-banana-pro','gpt-image-2',
      'gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND
      image_line IN ('special','quality','dedicated')));

ALTER TABLE projects
  DROP CONSTRAINT projects_banana_options_check,
  ADD CONSTRAINT projects_banana_options_check CHECK (
    model_id IN ('nano-banana-2','nano-banana-2.1') OR
    (thinking_level = 'low' AND google_search = false)),
  DROP CONSTRAINT projects_image_line_check,
  ADD CONSTRAINT projects_image_line_check CHECK (
    image_line IS NULL OR
    (model_id = 'nano-banana-2.1' AND image_line = 'special') OR
    (model_id IN ('nano-banana-2','nano-banana-pro','gpt-image-2',
      'gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND
      image_line IN ('special','quality','dedicated')));

ALTER TABLE creation_drafts
  DROP CONSTRAINT creation_drafts_banana_options_check,
  ADD CONSTRAINT creation_drafts_banana_options_check CHECK (
    model_id IN ('nano-banana-2','nano-banana-2.1') OR
    (thinking_level = 'low' AND google_search = false)),
  DROP CONSTRAINT creation_drafts_image_line_check,
  ADD CONSTRAINT creation_drafts_image_line_check CHECK (
    image_line IS NULL OR
    (model_id = 'nano-banana-2.1' AND image_line = 'special') OR
    (model_id IN ('nano-banana-2','nano-banana-pro','gpt-image-2',
      'gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND
      image_line IN ('special','quality','dedicated')));

-- Pin the current canonical Banana 2 special single-image prices, without
-- overwriting an already configured 2.1 model or its quotes. Missing complete
-- prices leave the new catalog disabled for the owner to configure explicitly.
WITH single_prices AS (
  SELECT DISTINCT ON (p.resolution)
    p.resolution, p.credit_amount, p.credit_unit
  FROM price_versions p
  JOIN managed_models m ON m.id = p.model_id
  WHERE m.id = 'nano-banana-2' AND m.adapter_id = 'nano-banana-2'
    AND p.output_count = 1 AND p.plan_context = 'standard'
    AND p.credit_unit = 'credit-cny-cent' AND p.credit_amount > 0
    AND p.resolution IN ('1K','2K','4K')
    AND p.effective_from <= now()
    AND (p.effective_until IS NULL OR p.effective_until > now())
  ORDER BY p.resolution, p.effective_from DESC, p.version DESC
), configuration AS (
  SELECT count(*) = 3 AS ready,
    COALESCE(jsonb_object_agg(resolution,
      jsonb_build_object('output', credit_amount)), '{}'::jsonb) AS prices
  FROM single_prices
), new_model AS (
  INSERT INTO managed_models (
    id, name, description, media_type, adapter_id, enabled, prices, lines
  )
  SELECT 'nano-banana-2.1', 'Nano Banana 2.1', '', 'image',
    'nano-banana-2.1', ready, prices,
    jsonb_build_object(
      'special', jsonb_build_object('enabled', ready, 'prices', prices),
      'quality', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb),
      'dedicated', jsonb_build_object('enabled', false, 'prices', '{}'::jsonb))
  FROM configuration
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO price_versions (
  id, model_id, resolution, output_count, plan_context, version,
  credit_unit, credit_amount, effective_from
)
SELECT md5('gg413:nano-banana-2.1:' || p.resolution || ':' || counts.n::text)::uuid,
  m.id, p.resolution, counts.n, 'standard',
  COALESCE((SELECT MAX(prior.version) FROM price_versions prior
    WHERE prior.model_id = m.id AND prior.resolution = p.resolution
      AND prior.output_count = counts.n AND prior.plan_context = 'standard'), 0) + 1,
  p.credit_unit, p.credit_amount * counts.n, now()
FROM new_model m CROSS JOIN single_prices p
CROSS JOIN generate_series(1, 12) AS counts(n)
WHERE NOT EXISTS (
  SELECT 1 FROM price_versions existing
  WHERE existing.model_id = m.id AND existing.resolution = p.resolution
    AND existing.output_count = counts.n AND existing.plan_context = 'standard'
    AND existing.effective_from <= now()
    AND (existing.effective_until IS NULL OR existing.effective_until > now())
)
ON CONFLICT (id) DO NOTHING;
