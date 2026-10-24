-- New demo: run as postgres BEFORE the backend starts Flyway.
-- Existing-data migration: run AFTER restoring the app schema.
-- No real passwords in this file. Enable LOGIN/set password separately in SQL Editor.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulso_app') THEN
    CREATE ROLE pulso_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT CONNECT ON DATABASE postgres TO pulso_app;
GRANT USAGE ON SCHEMA app TO pulso_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO pulso_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO pulso_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pulso_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app
  GRANT USAGE, SELECT ON SEQUENCES TO pulso_app;
-- No direct API grants to the app schema; application authorization is in Spring.
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA app FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA app FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
COMMIT;
