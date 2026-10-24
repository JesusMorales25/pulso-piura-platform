-- Explicit receipt-review state; existing migration files remain immutable.
ALTER TABLE app.reservations DROP CONSTRAINT reservations_status_check;
ALTER TABLE app.reservations ADD CONSTRAINT reservations_status_check CHECK
 (status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED','EXPIRED'));
ALTER TABLE app.reservations DROP CONSTRAINT chk_reservations_hold_expiration;
ALTER TABLE app.reservations ADD CONSTRAINT chk_reservations_hold_expiration CHECK
 ((status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION') AND expires_at IS NOT NULL)
 OR (status NOT IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION') AND expires_at IS NULL));
ALTER TABLE app.reservations DROP CONSTRAINT ex_reservations_no_blocking_overlap;
ALTER TABLE app.reservations ADD CONSTRAINT ex_reservations_no_blocking_overlap
 EXCLUDE USING gist (sport_space_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
 WHERE (status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION','CONFIRMED'));
ALTER TABLE app.reservation_status_history DROP CONSTRAINT chk_reservation_history_previous_status;
ALTER TABLE app.reservation_status_history ADD CONSTRAINT chk_reservation_history_previous_status CHECK
 (previous_status IS NULL OR previous_status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED','EXPIRED'));
ALTER TABLE app.reservation_status_history DROP CONSTRAINT chk_reservation_history_new_status;
ALTER TABLE app.reservation_status_history ADD CONSTRAINT chk_reservation_history_new_status CHECK
 (new_status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED','EXPIRED'));
DROP INDEX app.idx_reservations_expiring_holds;
CREATE INDEX idx_reservations_expiring_holds ON app.reservations(expires_at)
 WHERE status IN ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION');
WITH changed AS (
 UPDATE app.reservations r SET status='PENDING_PAYMENT_CONFIRMATION',updated_at=now(),version=version+1
 WHERE status='PENDING_PAYMENT' AND EXISTS
 (SELECT 1 FROM app.external_payment_proofs p WHERE p.target_type='RESERVATION' AND p.target_id=r.id
 AND p.status='PENDING_REVIEW' AND p.plan<>'BALANCE')
 RETURNING r.id,r.organization_id
)
INSERT INTO app.reservation_status_history
 (id,organization_id,reservation_id,previous_status,new_status,actor_type,actor_user_id,reason_code,occurred_at)
SELECT gen_random_uuid(),organization_id,id,'PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION','SYSTEM',NULL,
 'PAYMENT_REVIEW_STATE_MIGRATED',now() FROM changed;
