package com.pulsopiura.platform.reservations.application.port;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ReservationCheckInPassStore {
    void issue(
            UUID reservationId,
            UUID organizationId,
            String tokenHash,
            Instant issuedAt,
            Instant validUntil);

    Optional<PassRecord> findByTokenHash(String tokenHash);

    boolean consume(String tokenHash, UUID actorUserId, Instant consumedAt);

    record PassRecord(
            UUID reservationId,
            UUID organizationId,
            Instant validUntil,
            Instant consumedAt,
            UUID consumedBy) {}
}
