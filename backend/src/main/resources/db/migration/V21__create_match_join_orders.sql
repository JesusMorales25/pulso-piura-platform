CREATE TABLE app.match_join_orders (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  match_id uuid NOT NULL,
  payer_user_id uuid NOT NULL REFERENCES app.users(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency = 'PEN'),
  method varchar(20) NOT NULL CHECK (method IN ('YAPE','PLIN')),
  status varchar(20) NOT NULL CHECK (status IN ('PENDING','PAID','EXPIRED')),
  expires_at timestamptz NOT NULL,
  idempotency_key varchar(100) NOT NULL,
  provider_reference varchar(120) UNIQUE,
  paid_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_match_join_orders_match_tenant
    FOREIGN KEY (match_id, organization_id)
    REFERENCES app.sports_matches(id, organization_id),
  CONSTRAINT uq_match_join_order_idempotency UNIQUE (payer_user_id, idempotency_key),
  CONSTRAINT chk_match_join_order_state CHECK (
    (status = 'PENDING' AND paid_at IS NULL AND provider_reference IS NULL) OR
    (status = 'PAID' AND paid_at IS NOT NULL AND provider_reference IS NOT NULL) OR
    (status = 'EXPIRED' AND paid_at IS NULL)
  )
);

CREATE INDEX idx_match_join_orders_capacity
  ON app.match_join_orders (match_id, status, expires_at);

CREATE INDEX idx_match_join_orders_payer
  ON app.match_join_orders (payer_user_id, created_at DESC);
