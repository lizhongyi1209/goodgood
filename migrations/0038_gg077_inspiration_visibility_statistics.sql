ALTER TABLE inspiration_cases ADD COLUMN parameter_visibility text NOT NULL DEFAULT 'public';
UPDATE inspiration_cases SET parameter_visibility='prompt_hidden' WHERE prompt_visibility='hidden';
ALTER TABLE inspiration_cases ADD CONSTRAINT inspiration_cases_parameter_visibility_check
 CHECK (parameter_visibility IN ('public','prompt_hidden','hidden') AND (prompt_visibility='hidden')=(parameter_visibility<>'public'));
ALTER TABLE inspiration_cases ADD COLUMN view_count bigint NOT NULL DEFAULT 0 CHECK (view_count>=0);
ALTER TABLE inspiration_cases ADD COLUMN use_count bigint NOT NULL DEFAULT 0 CHECK (use_count>=0);
ALTER TABLE inspiration_generation_prompts ADD COLUMN parameters_hidden boolean NOT NULL DEFAULT false;
CREATE TABLE inspiration_interactions (
 case_id uuid NOT NULL REFERENCES inspiration_cases(id),
 owner_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK (action IN ('view','use')),
 interaction_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(case_id,owner_id,action,interaction_id)
);
