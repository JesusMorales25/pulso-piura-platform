package com.pulsopiura.platform.reservations.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ReservationStatusHistoryJpaRepository
        extends JpaRepository<ReservationStatusHistoryEntity, UUID> {}
