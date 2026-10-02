-- GG-292: widen storage only; submission limits remain model-specific.
-- Existing prompts and all other constraints are preserved.
ALTER TABLE projects DROP CONSTRAINT projects_prompt_check;
ALTER TABLE projects ADD CONSTRAINT projects_prompt_check CHECK (length(prompt) <= 32000);

ALTER TABLE creation_drafts DROP CONSTRAINT creation_drafts_prompt_check;
ALTER TABLE creation_drafts ADD CONSTRAINT creation_drafts_prompt_check CHECK (length(prompt) <= 32000);
