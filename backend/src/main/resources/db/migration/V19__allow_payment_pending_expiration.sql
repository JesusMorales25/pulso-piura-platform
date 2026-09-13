-- A pending payment keeps the reservation hold until the simulated/provider payment finishes.
ALTER TABLE app.reservations
  DROP CONSTRAINT chk_reservations_hold_expiration;

ALTER TABLE app.reservations
  ADD CONSTRAINT chk_reservations_hold_expiration
  CHECK ((status IN ('HOLD', 'PENDING_PAYMENT') AND expires_at IS NOT NULL)
      OR (status NOT IN ('HOLD', 'PENDING_PAYMENT') AND expires_at IS NULL));
