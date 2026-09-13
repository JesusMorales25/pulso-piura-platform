CREATE TABLE app.capability_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users(id),
  capability varchar(40) NOT NULL CHECK (capability IN ('MATCH_ORGANIZER','VENUE_OWNER')),
  status varchar(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','REVOKED')),
  reason varchar(1000),
  reviewed_by uuid REFERENCES app.users(id),
  review_note varchar(1000),
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0
);

CREATE INDEX idx_capability_requests_user
  ON app.capability_requests (user_id, created_at DESC);

CREATE UNIQUE INDEX uq_capability_requests_pending
  ON app.capability_requests (user_id, capability)
  WHERE status = 'PENDING';