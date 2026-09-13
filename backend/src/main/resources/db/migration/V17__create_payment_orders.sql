CREATE TABLE app.payment_orders (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL UNIQUE REFERENCES app.reservations(id),
  payer_user_id uuid NOT NULL REFERENCES app.users(id),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL CHECK (currency = 'PEN'),
  method varchar(30) NOT NULL CHECK (method IN ('YAPE','PLIN')),
  status varchar(30) NOT NULL CHECK (status IN ('CREATED','PENDING','PAID','FAILED','EXPIRED')),
  provider_reference varchar(120) UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  paid_at timestamptz,
  version bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_payment_orders_payer ON app.payment_orders(payer_user_id, created_at DESC);