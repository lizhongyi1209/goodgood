ALTER TABLE generation_batches
  ADD COLUMN provider_routing_policy text,
  ADD CONSTRAINT generation_batches_provider_routing_policy_check
    CHECK (provider_routing_policy IS NULL OR provider_routing_policy = 'canvas-image-v1');
