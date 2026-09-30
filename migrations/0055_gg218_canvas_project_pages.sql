-- Versioned multi-page documents share the existing project row and CAS.
-- Existing v1 JSON stays untouched; only the supported version check widens.
ALTER TABLE canvas_projects DROP CONSTRAINT canvas_projects_document_check;
ALTER TABLE canvas_projects ADD CONSTRAINT canvas_projects_document_check CHECK (
  jsonb_typeof(document) = 'object'
  AND document->>'schemaVersion' IN ('1', '2')
  AND pg_column_size(document) <= 1048576
);
