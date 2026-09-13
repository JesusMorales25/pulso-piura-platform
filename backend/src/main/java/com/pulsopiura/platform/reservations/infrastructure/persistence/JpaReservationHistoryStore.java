package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationHistoryStore;
import com.pulsopiura.platform.reservations.domain.ReservationStatusTransition;
import org.springframework.stereotype.Repository;

@Repository
class JpaReservationHistoryStore implements ReservationHistoryStore {
    private final ReservationStatusHistoryJpaRepository history;

    JpaReservationHistoryStore(ReservationStatusHistoryJpaRepository history) {
        this.history = history;
    }

    @Override
    public void append(ReservationStatusTransition transition) {
        history.save(ReservationStatusHistoryEntity.fromDomain(transition));
    }
}
