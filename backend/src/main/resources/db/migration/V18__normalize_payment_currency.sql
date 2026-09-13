-- Hibernate validates payment currency as VARCHAR(3), not PostgreSQL CHAR(3).
ALTER TABLE app.payment_orders
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);
