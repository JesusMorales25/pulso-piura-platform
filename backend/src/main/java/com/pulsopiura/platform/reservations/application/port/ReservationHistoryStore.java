package com.pulsopiura.platform.reservations.application.port;

import com.pulsopiura.platform.reservations.domain.ReservationStatusTransition;

public interface ReservationHistoryStore {
    void append(ReservationStatusTransition transition);
}
