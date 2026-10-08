-- Expand only model/MIME contracts; do not rewrite existing jobs or asset data.
ALTER TABLE video_generation_jobs DROP CONSTRAINT video_generation_jobs_model_id_check;
ALTER TABLE video_generation_jobs ADD CONSTRAINT video_generation_jobs_model_id_check
  CHECK (model_id IN ('kling-3.0-omni','kling-3.0','seedance-2-5','seedance-2-0','seedance-2-0-fast','seedance-2-0-mini')) NOT VALID;
ALTER TABLE video_generation_jobs VALIDATE CONSTRAINT video_generation_jobs_model_id_check;
-- Two Seedance lines may have separate upstream task ID namespaces.
ALTER TABLE video_generation_jobs ADD COLUMN provider_usage jsonb;
ALTER TABLE video_generation_jobs ADD COLUMN provider_duration_seconds double precision;
DROP INDEX video_generation_jobs_provider_idx;
CREATE UNIQUE INDEX video_generation_jobs_provider_idx
  ON video_generation_jobs(model_id, (COALESCE(input_snapshot->>'seedanceLine','standard')), provider_task_id)
  WHERE provider_task_id IS NOT NULL;
ALTER TABLE audio_materials DROP CONSTRAINT audio_materials_declared_mime_type_check;
ALTER TABLE audio_materials ADD CONSTRAINT audio_materials_declared_mime_type_check
  CHECK (declared_mime_type IN ('audio/mpeg','audio/wav')) NOT VALID;
ALTER TABLE audio_materials VALIDATE CONSTRAINT audio_materials_declared_mime_type_check;
