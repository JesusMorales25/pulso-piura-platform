ALTER TABLE app.payment_orders DROP CONSTRAINT payment_orders_reservation_id_key;
ALTER TABLE app.payment_orders
  ADD COLUMN plan varchar(20) NOT NULL DEFAULT 'FULL' CHECK (plan IN ('DEPOSIT','FULL','BALANCE')),
  ADD COLUMN installment varchar(20) NOT NULL DEFAULT 'INITIAL' CHECK (installment IN ('INITIAL','BALANCE')),
  ADD COLUMN idempotency_key varchar(100),
  ADD CONSTRAINT uq_payment_reservation_installment UNIQUE (reservation_id, installment),
  ADD CONSTRAINT uq_payment_payer_idempotency UNIQUE (payer_user_id, idempotency_key);
CREATE TABLE app.payment_status_history (
  id uuid PRIMARY KEY,
  payment_order_id uuid NOT NULL REFERENCES app.payment_orders(id),
  previous_status varchar(30),
  new_status varchar(30) NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES app.users(id),
  correlation_id varchar(100),
  occurred_at timestamptz NOT NULL
);
CREATE INDEX idx_payment_history_order ON app.payment_status_history(payment_order_id, occurred_at);
