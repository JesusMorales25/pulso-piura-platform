ALTER TABLE app.match_join_orders
  ALTER COLUMN currency TYPE varchar(3)
  USING trim(currency)::varchar(3);
