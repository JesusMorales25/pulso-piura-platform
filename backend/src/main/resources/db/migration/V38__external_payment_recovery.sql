CREATE TABLE app.external_payment_preparations (
 payer_user_id uuid NOT NULL REFERENCES app.users(id),
 target_type varchar(20) NOT NULL CHECK (target_type IN ('MATCH','RESERVATION')),
 target_id uuid NOT NULL,
 method varchar(10) NOT NULL CHECK (method IN ('YAPE','PLIN')),
 plan varchar(10) NOT NULL CHECK (plan IN ('FULL','DEPOSIT','BALANCE')),
 amount_minor bigint NOT NULL CHECK (amount_minor > 0),
 expires_at timestamptz NOT NULL,
 holder_name varchar(120) NOT NULL,
 phone varchar(20) NOT NULL,
 yape_enabled boolean NOT NULL,
 plin_enabled boolean NOT NULL,
 PRIMARY KEY (payer_user_id,target_type,target_id)
);
CREATE UNIQUE INDEX uq_external_payment_active_payer_target
 ON app.external_payment_proofs(payer_user_id,target_type,target_id)
 WHERE status IN ('PENDING_REVIEW','NEEDS_RESOLUTION');
