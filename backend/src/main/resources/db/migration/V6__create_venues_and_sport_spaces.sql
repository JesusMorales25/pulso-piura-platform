ALTER TABLE app.organizations
  ADD COLUMN timezone varchar(63) NOT NULL DEFAULT 'America/Lima';

ALTER TABLE app.organizations
  ADD CONSTRAINT chk_organizations_timezone_not_blank CHECK (btrim(timezone) <> '');

CREATE TABLE app.venues (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  name varchar(160) NOT NULL,
  slug varchar(100) NOT NULL,
  address varchar(240) NOT NULL,
  district_code varchar(60) NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  public_phone varchar(30),
  status varchar(30) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT uq_venues_org_slug UNIQUE (organization_id, slug),
  CONSTRAINT uq_venues_id_org UNIQUE (id, organization_id),
  CONSTRAINT chk_venues_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT chk_venues_address_not_blank CHECK (btrim(address) <> ''),
  CONSTRAINT chk_venues_district_not_blank CHECK (btrim(district_code) <> ''),
  CONSTRAINT chk_venues_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_venues_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_venues_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX idx_venues_org_status ON app.venues (organization_id, status);

CREATE TABLE app.sport_spaces (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  venue_id uuid NOT NULL,
  name varchar(160) NOT NULL,
  sport_code varchar(40) NOT NULL,
  format_code varchar(40) NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  surface_type varchar(40),
  indoor boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_sport_spaces_venue_tenant
    FOREIGN KEY (venue_id, organization_id) REFERENCES app.venues(id, organization_id),
  CONSTRAINT uq_sport_spaces_id_org UNIQUE (id, organization_id),
  CONSTRAINT chk_sport_spaces_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT chk_sport_spaces_sport_not_blank CHECK (btrim(sport_code) <> ''),
  CONSTRAINT chk_sport_spaces_format_not_blank CHECK (btrim(format_code) <> '')
);

CREATE UNIQUE INDEX uq_sport_spaces_active_name
  ON app.sport_spaces (venue_id, lower(name))
  WHERE status <> 'ARCHIVED';

CREATE INDEX idx_sport_spaces_org_venue_status
  ON app.sport_spaces (organization_id, venue_id, status);
