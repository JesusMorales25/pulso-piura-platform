package com.pulsopiura.platform.reservations.application.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ReservationTimelineQuery {
    record Event(UUID id, String previousStatus, String status, Instant occurredAt) {}

    List<Event> list(UUID reservationId);
}
