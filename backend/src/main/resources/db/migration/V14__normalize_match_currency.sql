-- Hibernate maps ISO currency codes as VARCHAR(3). PostgreSQL CHAR(3) is
-- reported as BPCHAR by JDBC and therefore fails ddl-auto=validate.
ALTER TABLE app.sports_matches
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);
