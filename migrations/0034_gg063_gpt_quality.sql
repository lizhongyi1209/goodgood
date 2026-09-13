-- Add quality tiers without changing any historical record or model price.
ALTER TABLE generation_batches DROP CONSTRAINT generation_batches_gpt_quality_check;
ALTER TABLE generation_batches ADD CONSTRAINT generation_batches_gpt_quality_check CHECK (quality IN ('auto','low','medium','high') OR (model_id IN ('gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND quality IN ('xhigh','max')));
ALTER TABLE projects DROP CONSTRAINT projects_gpt_quality_check;
ALTER TABLE projects ADD CONSTRAINT projects_gpt_quality_check CHECK (quality IN ('auto','low','medium','high') OR (model_id IN ('gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND quality IN ('xhigh','max')));
ALTER TABLE creation_drafts DROP CONSTRAINT creation_drafts_gpt_quality_check;
ALTER TABLE creation_drafts ADD CONSTRAINT creation_drafts_gpt_quality_check CHECK (quality IN ('auto','low','medium','high') OR (model_id IN ('gpt-image-2.5-sunburst','gpt-image-2.5-flare') AND quality IN ('xhigh','max')));
