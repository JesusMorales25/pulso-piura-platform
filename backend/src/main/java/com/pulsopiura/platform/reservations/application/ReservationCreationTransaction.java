package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.application.port.*;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.reservations.infrastructure.config.ReservationProperties;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationCreationTransaction {
    private final ReservationStore reservations;
    private final ReservationHistoryStore history;
    private final ReservationProperties properties;

    public ReservationCreationTransaction(
            ReservationStore reservations,
            ReservationHistoryStore history,
            ReservationProperties properties) {
        this.reservations = reservations;
        this.history = history;
        this.properties = properties;
    }

    @Transactional
    public Reservation create(
            Reservation candidate, UUID actorUserId, String correlationId, Instant now) {
        if (!candidate.customerUserId().equals(actorUserId)) {
            throw new IllegalArgumentException("El cliente de la reserva no coincide con el actor");
        }
        reservations.lockCustomerReservationCreation(actorUserId);
        var activeTemporary = reservations.countActiveTemporaryByCustomer(actorUserId, now);
        if (activeTemporary >= properties.maxActiveTemporaryPerCustomer()) {
            throw new ReservationRateLimitException(
                    "Finaliza o deja vencer una reserva pendiente antes de bloquear otro horario");
        }
        expireOverlappingHolds(candidate, correlationId, now);
        var saved = reservations.save(candidate);
        history.append(
                new ReservationStatusTransition(
                        saved.organizationId(),
                        saved.id(),
                        null,
                        ReservationStatus.HOLD,
                        ReservationTransitionActor.USER,
                        actorUserId,
                        "HOLD_CREATED",
                        correlationId,
                        now));
        return saved;
    }

    private void expireOverlappingHolds(Reservation candidate, String correlationId, Instant now) {
        var range = candidate.timeRange();
        var expired =
                reservations.findExpiredOverlappingHoldsForUpdate(
                        candidate.sportSpaceId(), range.startsAt(), range.endsAt(), now);
        for (var reservation : expired) {
            var previousStatus = reservation.status();
            if (!reservation.expire(now)) continue;
            reservations.save(reservation);
            history.append(
                    new ReservationStatusTransition(
                            reservation.organizationId(),
                            reservation.id(),
                            previousStatus,
                            ReservationStatus.EXPIRED,
                            ReservationTransitionActor.SYSTEM,
                            null,
                            "HOLD_EXPIRED",
                            correlationId,
                            now));
        }
    }
}
