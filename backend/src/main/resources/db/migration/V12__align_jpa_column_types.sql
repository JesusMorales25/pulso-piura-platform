-- Align legacy PostgreSQL types with the Java/JPA mappings used at runtime.
ALTER TABLE app.availability_rules
  ALTER COLUMN day_of_week TYPE integer
  USING day_of_week::integer;

ALTER TABLE app.reservations
  ALTER COLUMN request_fingerprint TYPE varchar(64)
  USING trim(request_fingerprint)::varchar(64);
