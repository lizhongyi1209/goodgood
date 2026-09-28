-- A user-facing name is separate from the immutable uploaded filename/object key.
-- Generated images have no source filename, so all four asset kinds share this alias.
ALTER TABLE asset_organization
  ADD COLUMN display_name text CHECK (
    display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 255
  );
