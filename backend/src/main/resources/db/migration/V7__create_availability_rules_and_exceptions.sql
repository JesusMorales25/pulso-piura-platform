CREATE TABLE app.availability_rules (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  sport_space_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_local_time time NOT NULL,
  end_local_time time NOT NULL,
  slot_minutes integer NOT NULL CHECK (slot_minutes BETWEEN 30 AND 180),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency char(3) NOT NULL CHECK (currency = 'PEN'),
  valid_from date NOT NULL,
  valid_to date,
  status varchar(20) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_availability_rules_space_tenant
    FOREIGN KEY (sport_space_id, organization_id)
    REFERENCES app.sport_spaces(id, organization_id),
  CONSTRAINT chk_availability_rules_time_range CHECK (start_local_time < end_local_time),
  CONSTRAINT chk_availability_rules_validity CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT uq_availability_rules_id_org UNIQUE (id, organization_id)
);

CREATE INDEX idx_availability_rules_lookup
  ON app.availability_rules (organization_id, sport_space_id, day_of_week, status);

CREATE TABLE app.availability_exceptions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  sport_space_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN ('CLOSED','MAINTENANCE','SPECIAL_PRICE')),
  price_minor bigint,
  currency char(3),
  reason varchar(240),
  status varchar(20) NOT NULL CHECK (status IN ('ACTIVE','CANCELLED')),
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_availability_exceptions_space_tenant
    FOREIGN KEY (sport_space_id, organization_id)
    REFERENCES app.sport_spaces(id, organization_id),
  CONSTRAINT chk_availability_exceptions_time_range CHECK (starts_at < ends_at),
  CONSTRAINT chk_availability_exceptions_price
    CHECK (
      (type = 'SPECIAL_PRICE' AND price_minor IS NOT NULL AND price_minor >= 0 AND currency = 'PEN')
      OR (type <> 'SPECIAL_PRICE' AND price_minor IS NULL AND currency IS NULL)
    ),
  CONSTRAINT uq_availability_exceptions_id_org UNIQUE (id, organization_id)
);

CREATE INDEX idx_availability_exceptions_lookup
  ON app.availability_exceptions (organization_id, sport_space_id, starts_at, ends_at, status);
