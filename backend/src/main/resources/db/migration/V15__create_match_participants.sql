ALTER TABLE app.sports_matches
  ADD CONSTRAINT uq_sports_matches_id_org UNIQUE (id, organization_id);

CREATE TABLE app.match_participants (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  match_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app.users(id),
  status varchar(20) NOT NULL CHECK (status IN ('JOINED','WAITLISTED','WITHDRAWN')),
  joined_at timestamptz,
  waitlisted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_match_participants_match_tenant
    FOREIGN KEY (match_id, organization_id)
    REFERENCES app.sports_matches(id, organization_id),
  CONSTRAINT uq_match_participants_user UNIQUE (match_id, user_id),
  CONSTRAINT chk_match_participants_timestamps CHECK (
    (status = 'JOINED' AND joined_at IS NOT NULL AND withdrawn_at IS NULL) OR
    (status = 'WAITLISTED' AND waitlisted_at IS NOT NULL AND withdrawn_at IS NULL) OR
    (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL)
  )
);

CREATE INDEX idx_match_participants_joined
  ON app.match_participants (match_id, status)
  WHERE status = 'JOINED';

CREATE INDEX idx_match_participants_waitlist
  ON app.match_participants (match_id, waitlisted_at, id)
  WHERE status = 'WAITLISTED';
