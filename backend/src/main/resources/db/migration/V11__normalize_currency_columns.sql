-- Hibernate maps ISO currency codes as VARCHAR(3). Earlier migrations used
-- CHAR(3), whose PostgreSQL JDBC type is BPCHAR and fails schema validation.
ALTER TABLE app.availability_rules
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);

ALTER TABLE app.availability_exceptions
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);

ALTER TABLE app.reservations
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);
