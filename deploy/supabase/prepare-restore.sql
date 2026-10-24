-- Run as the database administrator BEFORE restoring an app-only dump.
-- pg_dump --schema=app does not include extension definitions/dependencies.
-- Do not create app here: the archive restores that schema itself.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Confirm btree_gist is installed; it enforces non-overlapping reservations.
SELECT e.extname, e.extversion, n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'btree_gist';
