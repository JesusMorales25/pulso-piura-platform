CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app.reservations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  sport_space_id uuid NOT NULL,
  customer_user_id uuid NOT NULL REFERENCES app.users(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status varchar(30) NOT NULL
    CHECK (status IN ('HOLD','PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED')),
  total_minor bigint NOT NULL CHECK (total_minor >= 0),
  deposit_minor bigint NOT NULL CHECK (deposit_minor >= 0 AND deposit_minor <= total_minor),
  currency char(3) NOT NULL CHECK (currency = 'PEN'),
  expires_at timestamptz,
  idempotency_key varchar(100) NOT NULL,
  request_fingerprint char(64) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_reservations_space_tenant
    FOREIGN KEY (sport_space_id, organization_id)
    REFERENCES app.sport_spaces(id, organization_id),
  CONSTRAINT uq_reservations_id_org UNIQUE (id, organization_id),
  CONSTRAINT uq_reservations_customer_idempotency UNIQUE (customer_user_id, idempotency_key),
  CONSTRAINT chk_reservations_time_range CHECK (starts_at < ends_at),
  CONSTRAINT chk_reservations_hold_expiration
    CHECK ((status = 'HOLD' AND expires_at IS NOT NULL) OR (status <> 'HOLD' AND expires_at IS NULL)),
  CONSTRAINT chk_reservations_fingerprint CHECK (request_fingerprint ~ '^[0-9a-f]{64}$')
);

ALTER TABLE app.reservations
  ADD CONSTRAINT ex_reservations_no_blocking_overlap
  EXCLUDE USING gist (
    sport_space_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('HOLD','PENDING_PAYMENT','CONFIRMED'));

CREATE INDEX idx_reservations_customer_created
  ON app.reservations (customer_user_id, created_at DESC);
CREATE INDEX idx_reservations_org_created
  ON app.reservations (organization_id, created_at DESC);
CREATE INDEX idx_reservations_space_range
  ON app.reservations (sport_space_id, starts_at, ends_at);
CREATE INDEX idx_reservations_expiring_holds
  ON app.reservations (expires_at)
  WHERE status = 'HOLD';

CREATE TABLE app.reservation_status_history (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  reservation_id uuid NOT NULL,
  previous_status varchar(30),
  new_status varchar(30) NOT NULL,
  actor_type varchar(20) NOT NULL CHECK (actor_type IN ('USER','SYSTEM')),
  actor_user_id uuid REFERENCES app.users(id),
  reason_code varchar(60),
  correlation_id varchar(100),
  occurred_at timestamptz NOT NULL,
  CONSTRAINT fk_reservation_history_tenant
    FOREIGN KEY (reservation_id, organization_id)
    REFERENCES app.reservations(id, organization_id),
  CONSTRAINT chk_reservation_history_previous_status
    CHECK (previous_status IS NULL OR previous_status IN ('HOLD','PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED')),
  CONSTRAINT chk_reservation_history_new_status
    CHECK (new_status IN ('HOLD','PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','EXPIRED')),
  CONSTRAINT chk_reservation_history_actor
    CHECK ((actor_type = 'USER' AND actor_user_id IS NOT NULL) OR (actor_type = 'SYSTEM' AND actor_user_id IS NULL))
);

CREATE INDEX idx_reservation_history_reservation
  ON app.reservation_status_history (organization_id, reservation_id, occurred_at);
