ALTER TABLE app.payment_orders ADD COLUMN simulated boolean NOT NULL DEFAULT true;
ALTER TABLE app.match_join_orders ADD COLUMN simulated boolean NOT NULL DEFAULT true;
CREATE TABLE app.external_payment_destinations (
 target_type varchar(20) NOT NULL CHECK (target_type IN ('MATCH','RESERVATION')),
 receiver_id uuid NOT NULL,
 holder_name varchar(120) NOT NULL,
 phone varchar(20) NOT NULL,
 yape_enabled boolean NOT NULL,
 plin_enabled boolean NOT NULL,
 updated_by uuid NOT NULL REFERENCES app.users(id),
 updated_at timestamptz NOT NULL,
 PRIMARY KEY (target_type, receiver_id)
);
CREATE TABLE app.external_payment_proofs (
 id uuid PRIMARY KEY,
 target_type varchar(20) NOT NULL CHECK (target_type IN ('MATCH','RESERVATION')),
 target_id uuid NOT NULL,
 receiver_id uuid NOT NULL,
 payer_user_id uuid NOT NULL REFERENCES app.users(id),
 payer_name varchar(120) NOT NULL,
 amount_minor bigint NOT NULL CHECK (amount_minor > 0),
 method varchar(10) NOT NULL CHECK (method IN ('YAPE','PLIN')),
 plan varchar(10) NOT NULL CHECK (plan IN ('FULL','DEPOSIT','BALANCE')),
 status varchar(30) NOT NULL CHECK (status IN ('PENDING_REVIEW','CONFIRMED','REJECTED','CORRECTION_REQUIRED','NEEDS_RESOLUTION')),
 reference varchar(100),
 holder_name varchar(120) NOT NULL,
 phone varchar(20) NOT NULL,
 storage_key varchar(100) UNIQUE,
 image_sha256 varchar(64) NOT NULL,
 image_size bigint NOT NULL,
 idempotency_key varchar(100) NOT NULL,
 ledger_order_id uuid,
 supersedes_proof_id uuid REFERENCES app.external_payment_proofs(id),
 created_at timestamptz NOT NULL,
 review_expires_at timestamptz NOT NULL,
 reviewed_at timestamptz,
 review_note varchar(1000),
 UNIQUE (payer_user_id,idempotency_key)
);
CREATE UNIQUE INDEX uq_external_payment_reference ON app.external_payment_proofs(phone,method,reference) WHERE reference IS NOT NULL AND status NOT IN ('REJECTED','CORRECTION_REQUIRED');
CREATE INDEX idx_external_proofs_target ON app.external_payment_proofs(target_type,target_id,created_at);
CREATE TABLE app.external_payment_events (
 id uuid PRIMARY KEY,
 proof_id uuid REFERENCES app.external_payment_proofs(id),
 target_type varchar(20) NOT NULL,
 target_id uuid NOT NULL,
 actor_user_id uuid REFERENCES app.users(id),
 action varchar(40) NOT NULL,
 note varchar(1000),
 occurred_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX uq_external_payment_image ON app.external_payment_proofs(phone,image_sha256) WHERE status NOT IN ('REJECTED','CORRECTION_REQUIRED');
