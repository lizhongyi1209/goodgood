-- The shared default is not an individual user identity; custom handles stay unique.
CREATE UNIQUE INDEX personal_profiles_custom_handle_unique
 ON personal_profiles(handle) WHERE handle <> 'goder';
ALTER TABLE personal_profiles DROP CONSTRAINT personal_profiles_handle_key;
