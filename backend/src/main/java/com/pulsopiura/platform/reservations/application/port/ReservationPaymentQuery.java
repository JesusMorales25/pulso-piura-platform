package com.pulsopiura.platform.reservations.application.port;

import java.util.UUID;

/** Financial read model. Caller locks the reservation before checking cancellation. */
public interface ReservationPaymentQuery {
    long paidMinor(UUID reservationId);
}
