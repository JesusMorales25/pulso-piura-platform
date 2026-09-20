CREATE TABLE app.match_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  match_id uuid NOT NULL,
  email varchar(320) NOT NULL,
  status varchar(20) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  invited_by uuid NOT NULL REFERENCES app.users(id),
  invited_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES app.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_match_invitations_match_tenant
    FOREIGN KEY (match_id, organization_id)
    REFERENCES app.sports_matches(id, organization_id),
  CONSTRAINT chk_match_invitations_expiry CHECK (invited_at < expires_at)
);

CREATE UNIQUE INDEX uq_pending_match_invitation_email
  ON app.match_invitations (match_id, lower(email))
  WHERE status = 'PENDING';

CREATE INDEX idx_match_invitations_match
  ON app.match_invitations (match_id, invited_at DESC);

CREATE INDEX idx_match_invitations_accepted_access
  ON app.match_invitations (match_id, accepted_by)
  WHERE status = 'ACCEPTED';
