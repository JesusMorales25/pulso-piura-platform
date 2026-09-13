CREATE TABLE app.reservation_check_in_passes (
  reservation_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES app.users(id),
  CONSTRAINT fk_check_in_pass_reservation_tenant
    FOREIGN KEY (reservation_id, organization_id)
    REFERENCES app.reservations(id, organization_id),
  CONSTRAINT chk_check_in_pass_hash CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT chk_check_in_pass_validity CHECK (issued_at < valid_until),
  CONSTRAINT chk_check_in_pass_consumption
    CHECK ((consumed_at IS NULL AND consumed_by IS NULL) OR
           (consumed_at IS NOT NULL AND consumed_by IS NOT NULL))
);

CREATE INDEX idx_reservation_check_in_pass_org
  ON app.reservation_check_in_passes (organization_id, issued_at DESC);
