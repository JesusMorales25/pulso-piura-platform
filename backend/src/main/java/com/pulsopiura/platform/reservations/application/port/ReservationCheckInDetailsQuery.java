package com.pulsopiura.platform.reservations.application.port;

import java.util.UUID;

public interface ReservationCheckInDetailsQuery {
    Details get(UUID reservationId);

    record Details(String venueName, String spaceName, String customerName, String customerEmail) {}
}
