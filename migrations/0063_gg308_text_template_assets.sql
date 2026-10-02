-- Private text templates are independent content snapshots, not generated image jobs.
CREATE TABLE text_assets (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  markdown text NOT NULL CHECK (char_length(markdown) BETWEEN 1 AND 100000),
  text_content text NOT NULL CHECK (char_length(text_content) BETWEEN 1 AND 16000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX text_assets_owner_created_idx ON text_assets(workspace_id, owner_id, created_at DESC, id);
ALTER TABLE asset_organization DROP CONSTRAINT asset_organization_asset_kind_check;
ALTER TABLE asset_organization ADD CONSTRAINT asset_organization_asset_kind_check
  CHECK (asset_kind IN ('generated', 'reference', 'video', 'audio', 'text'));

