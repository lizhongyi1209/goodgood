-- Initialize untouched model settings from converted prices, including prior
-- operator customizations. Never overwrite a model already edited in the panel.
UPDATE managed_models model
   SET prices = configured.prices
  FROM (
    SELECT model_id, jsonb_object_agg(resolution,
      jsonb_build_object('output', credit_amount)) AS prices
      FROM (
        SELECT DISTINCT ON (model_id, resolution) model_id, resolution, credit_amount
          FROM price_versions
         WHERE credit_unit = 'credit-cny-cent' AND output_count = 1
           AND plan_context = 'standard' AND effective_from <= now()
           AND (effective_until IS NULL OR effective_until > now())
         ORDER BY model_id, resolution, effective_from DESC, version DESC
      ) current_prices
     GROUP BY model_id
  ) configured
 WHERE model.id = configured.model_id AND model.media_type = 'image'
   AND NOT EXISTS (SELECT 1 FROM managed_model_events event WHERE event.model_id = model.id);
