CREATE TABLE app.sports_catalog (
  code varchar(40) PRIMARY KEY,
  name varchar(80) NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE app.sport_formats_catalog (
  code varchar(40) PRIMARY KEY,
  sport_code varchar(40) NOT NULL REFERENCES app.sports_catalog(code),
  name varchar(80) NOT NULL,
  recommended_capacity integer CHECK (recommended_capacity IS NULL OR recommended_capacity > 0),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_sport_formats_sport_code UNIQUE (sport_code, code)
);

CREATE TABLE app.surface_types_catalog (
  code varchar(40) PRIMARY KEY,
  name varchar(80) NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE app.amenities_catalog (
  code varchar(40) PRIMARY KEY,
  name varchar(80) NOT NULL,
  scope varchar(20) NOT NULL CHECK (scope IN ('VENUE','SPORT_SPACE','BOTH')),
  active boolean NOT NULL DEFAULT true
);

INSERT INTO app.sports_catalog (code, name) VALUES
  ('FOOTBALL', 'Fútbol'),
  ('VOLLEYBALL', 'Vóley'),
  ('BASKETBALL', 'Básquetbol'),
  ('PADEL', 'Pádel'),
  ('TENNIS', 'Tenis');

INSERT INTO app.sport_formats_catalog (code, sport_code, name, recommended_capacity) VALUES
  ('FOOTBALL_5', 'FOOTBALL', 'Fútbol 5', 10),
  ('FOOTBALL_6', 'FOOTBALL', 'Fútbol 6', 12),
  ('FOOTBALL_7', 'FOOTBALL', 'Fútbol 7', 14),
  ('FOOTBALL_8', 'FOOTBALL', 'Fútbol 8', 16),
  ('FOOTBALL_11', 'FOOTBALL', 'Fútbol 11', 22),
  ('VOLLEYBALL_6', 'VOLLEYBALL', 'Vóley 6 contra 6', 12),
  ('BASKETBALL_5', 'BASKETBALL', 'Básquetbol 5 contra 5', 10),
  ('PADEL_DOUBLES', 'PADEL', 'Pádel dobles', 4),
  ('TENNIS_SINGLES', 'TENNIS', 'Tenis individual', 2),
  ('TENNIS_DOUBLES', 'TENNIS', 'Tenis dobles', 4);

INSERT INTO app.surface_types_catalog (code, name) VALUES
  ('SYNTHETIC_GRASS', 'Césped sintético'),
  ('NATURAL_GRASS', 'Césped natural'),
  ('POLISHED_CONCRETE', 'Losa o cemento pulido'),
  ('WOOD_PARQUET', 'Parquet o piso de madera'),
  ('CLAY', 'Arcilla'),
  ('ACRYLIC', 'Acrílico');

INSERT INTO app.amenities_catalog (code, name, scope) VALUES
  ('LED_LIGHTING', 'Iluminación LED', 'SPORT_SPACE'),
  ('LOCKER_ROOMS', 'Vestuarios', 'VENUE'),
  ('SHOWERS', 'Duchas', 'VENUE'),
  ('PARKING', 'Estacionamiento', 'VENUE'),
  ('BALLS_INCLUDED', 'Pelotas incluidas', 'SPORT_SPACE'),
  ('BIBS_INCLUDED', 'Petos incluidos', 'SPORT_SPACE');

-- Preserve format values created before catalogs became mandatory.
INSERT INTO app.sport_formats_catalog (code, sport_code, name)
SELECT DISTINCT format_code, sport_code, format_code
FROM app.sport_spaces
ON CONFLICT (code) DO NOTHING;

-- Preserve surface values created before catalogs became mandatory.
INSERT INTO app.surface_types_catalog (code, name)
SELECT DISTINCT surface_type, surface_type
FROM app.sport_spaces
WHERE surface_type IS NOT NULL
ON CONFLICT (code) DO NOTHING;

ALTER TABLE app.sport_spaces
  ADD CONSTRAINT fk_sport_spaces_sport_catalog
    FOREIGN KEY (sport_code) REFERENCES app.sports_catalog(code),
  ADD CONSTRAINT fk_sport_spaces_format_catalog
    FOREIGN KEY (sport_code, format_code)
    REFERENCES app.sport_formats_catalog(sport_code, code),
  ADD CONSTRAINT fk_sport_spaces_surface_catalog
    FOREIGN KEY (surface_type) REFERENCES app.surface_types_catalog(code);

CREATE TABLE app.venue_amenities (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  venue_id uuid NOT NULL,
  amenity_code varchar(40) NOT NULL REFERENCES app.amenities_catalog(code),
  CONSTRAINT fk_venue_amenities_tenant
    FOREIGN KEY (venue_id, organization_id) REFERENCES app.venues(id, organization_id),
  CONSTRAINT uq_venue_amenities UNIQUE (venue_id, amenity_code)
);

CREATE TABLE app.sport_space_amenities (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  sport_space_id uuid NOT NULL,
  amenity_code varchar(40) NOT NULL REFERENCES app.amenities_catalog(code),
  CONSTRAINT fk_sport_space_amenities_tenant
    FOREIGN KEY (sport_space_id, organization_id)
    REFERENCES app.sport_spaces(id, organization_id),
  CONSTRAINT uq_sport_space_amenities UNIQUE (sport_space_id, amenity_code)
);

CREATE INDEX idx_venue_amenities_tenant ON app.venue_amenities (organization_id, venue_id);
CREATE INDEX idx_space_amenities_tenant ON app.sport_space_amenities (organization_id, sport_space_id);
