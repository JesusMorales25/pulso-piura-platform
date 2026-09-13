CREATE TABLE app.organization_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  email varchar(320) NOT NULL,
  role varchar(30) NOT NULL CHECK (role IN ('ADMIN','OPERATOR')),
  status varchar(30) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  invited_by uuid NOT NULL REFERENCES app.users(id),
  invited_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES app.users(id),
  accepted_at timestamptz,
  version bigint NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uq_pending_invitation_per_email
  ON app.organization_invitations (organization_id, lower(email))
  WHERE status = 'PENDING';
