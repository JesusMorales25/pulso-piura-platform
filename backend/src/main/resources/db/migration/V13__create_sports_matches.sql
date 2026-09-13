CREATE TABLE app.sports_matches (
  id uuid PRIMARY KEY,
  public_slug varchar(80) NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  reservation_id uuid NOT NULL UNIQUE,
  sport_space_id uuid NOT NULL,
  organizer_user_id uuid NOT NULL REFERENCES app.users(id),
  title varchar(120) NOT NULL,
  sport_code varchar(40) NOT NULL REFERENCES app.sports_catalog(code),
  format_code varchar(40) NOT NULL,
  skill_level varchar(30) NOT NULL CHECK (skill_level IN ('ALL_LEVELS','BEGINNER','INTERMEDIATE','ADVANCED')),
  min_players integer NOT NULL CHECK (min_players > 0),
  max_players integer NOT NULL CHECK (max_players >= min_players),
  organizer_counts boolean NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency char(3) NOT NULL CHECK (currency = 'PEN'),
  visibility varchar(20) NOT NULL CHECK (visibility IN ('PUBLIC','LINK','PRIVATE')),
  cancellation_policy varchar(500) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status varchar(30) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','CANCELLED')),
  published_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_matches_reservation_tenant FOREIGN KEY (reservation_id, organization_id)
    REFERENCES app.reservations(id, organization_id),
  CONSTRAINT fk_matches_space_tenant FOREIGN KEY (sport_space_id, organization_id)
    REFERENCES app.sport_spaces(id, organization_id),
  CONSTRAINT fk_matches_sport_format FOREIGN KEY (sport_code, format_code)
    REFERENCES app.sport_formats_catalog(sport_code, code),
  CONSTRAINT chk_matches_time_range CHECK (starts_at < ends_at),
  CONSTRAINT chk_matches_publication CHECK (
    (status = 'DRAFT' AND published_at IS NULL) OR
    (status IN ('PUBLISHED','CANCELLED') AND published_at IS NOT NULL)
  ),
  CONSTRAINT chk_matches_title CHECK (btrim(title) <> ''),
  CONSTRAINT chk_matches_cancellation_policy CHECK (btrim(cancellation_policy) <> '')
);

CREATE INDEX idx_matches_public_catalog ON app.sports_matches (starts_at, sport_code)
  WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC';
CREATE INDEX idx_matches_organizer_created ON app.sports_matches (organizer_user_id, created_at DESC);

