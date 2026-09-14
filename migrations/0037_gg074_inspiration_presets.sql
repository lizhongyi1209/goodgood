ALTER TABLE inspiration_cases ADD COLUMN prompt_visibility text NOT NULL DEFAULT 'public'
  CHECK (prompt_visibility IN ('public','hidden'));
ALTER TABLE inspiration_cases ADD COLUMN comparison_mode text NOT NULL DEFAULT 'side_by_side'
  CHECK (comparison_mode IN ('side_by_side','hover'));
CREATE TABLE inspiration_generation_prompts (
  job_id uuid PRIMARY KEY REFERENCES generation_jobs(id),
  case_id uuid NOT NULL REFERENCES inspiration_cases(id),
  effective_prompt text NOT NULL CHECK (char_length(effective_prompt) BETWEEN 1 AND 8001)
);
COMMENT ON TABLE inspiration_generation_prompts IS 'Server-only frozen effective prompts; never include in browser DTOs';
