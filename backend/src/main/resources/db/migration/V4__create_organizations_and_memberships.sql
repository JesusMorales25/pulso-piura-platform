CREATE TABLE app.organizations (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  status varchar(30) NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0
);

CREATE TABLE app.organization_memberships (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  user_id uuid NOT NULL REFERENCES app.users(id),
  role varchar(30) NOT NULL CHECK (role IN ('OWNER','ADMIN','OPERATOR')),
  status varchar(30) NOT NULL CHECK (status IN ('ACTIVE','REVOKED')),
  created_at timestamptz NOT NULL,
  revoked_at timestamptz,
  version bigint NOT NULL DEFAULT 0,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_memberships_user_active
  ON app.organization_memberships (user_id, organization_id)
  WHERE status = 'ACTIVE';
