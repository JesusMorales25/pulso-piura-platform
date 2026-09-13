package com.pulsopiura.platform.reservations.domain;

import java.time.Instant;
import java.util.Objects;

public record ReservationTimeRange(Instant startsAt, Instant endsAt) {
    public ReservationTimeRange {
        Objects.requireNonNull(startsAt, "El inicio es obligatorio");
        Objects.requireNonNull(endsAt, "El fin es obligatorio");
        if (!startsAt.isBefore(endsAt)) {
            throw new IllegalArgumentException("El inicio debe ser anterior al fin");
        }
    }
}
