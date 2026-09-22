CREATE TABLE app.manual_match_participants (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  match_id uuid NOT NULL,
  display_name varchar(120) NOT NULL,
  phone varchar(30),
  payment_status varchar(20) NOT NULL CHECK (payment_status IN ('UNPAID', 'PAID_DIRECT')),
  paid_minor bigint NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  paid_at timestamptz,
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_manual_match_participants_match_tenant
    FOREIGN KEY (match_id, organization_id)
    REFERENCES app.sports_matches(id, organization_id),
  CONSTRAINT chk_manual_match_participants_payment CHECK (
    (payment_status = 'UNPAID' AND paid_minor = 0 AND paid_at IS NULL) OR
    (payment_status = 'PAID_DIRECT' AND paid_at IS NOT NULL)
  )
);

CREATE INDEX idx_manual_match_participants_match
  ON app.manual_match_participants (match_id, created_at, id);
