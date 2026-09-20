package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.domain.Reservation;
import java.time.Instant;
import java.util.UUID;

public record ReservationView(
        UUID id,
        UUID sportSpaceId,
        Instant startsAt,
        Instant endsAt,
        String status,
        long totalMinor,
        long depositMinor,
        String currency,
        Instant expiresAt,
        long version,
        long paidMinor,
        String venueName,
        String spaceName,
        Integer spaceCapacity,
        boolean matchAssociated) {
    public ReservationView withPayment(long paid) {
        return new ReservationView(
                id,
                sportSpaceId,
                startsAt,
                endsAt,
                status,
                totalMinor,
                depositMinor,
                currency,
                expiresAt,
                version,
                paid,
                venueName,
                spaceName,
                spaceCapacity,
                matchAssociated);
    }

    public ReservationView withNames(
            com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery.Names
                    names) {
        return new ReservationView(
                id,
                sportSpaceId,
                startsAt,
                endsAt,
                status,
                totalMinor,
                depositMinor,
                currency,
                expiresAt,
                version,
                paidMinor,
                names.venueName(),
                names.spaceName(),
                names.spaceCapacity(),
                names.matchAssociated());
    }

    static ReservationView from(Reservation reservation) {
        return new ReservationView(
                reservation.id(),
                reservation.sportSpaceId(),
                reservation.timeRange().startsAt(),
                reservation.timeRange().endsAt(),
                reservation.status().name(),
                reservation.total().minor(),
                reservation.deposit().minor(),
                reservation.total().currency(),
                reservation.expiresAt(),
                reservation.version(),
                0,
                null,
                null,
                null,
                false);
    }
}
