-- Retire the inspiration board (灵感板, GG-073..GG-077) and drop its five tables.
--
-- This is an irreversible data drop: the rows in these tables cannot be restored
-- from any later migration. It is authorized by the operator for the local
-- isolated database only. Executing it against production is a separate step
-- that requires its own explicit authorization and its own backup.
--
-- Drop order is child-before-parent, written out explicitly rather than leaning
-- on CASCADE: inspiration_cases has inbound foreign keys from the four child
-- tables, and each of them must be gone before the parent can be dropped.
-- CASCADE would also silently remove any object we did not intend to touch, so
-- the ordering is deliberate and CASCADE is not used.
--
-- The runner (server/persistence/migrate.mjs) wraps this file in a single
-- transaction together with its goodgood_schema_migrations row, so a failure
-- part-way through leaves every table in place.
DROP TABLE IF EXISTS inspiration_interactions;
DROP TABLE IF EXISTS inspiration_generation_prompts;
DROP TABLE IF EXISTS inspiration_likes;
DROP TABLE IF EXISTS inspiration_events;
DROP TABLE IF EXISTS inspiration_cases;
