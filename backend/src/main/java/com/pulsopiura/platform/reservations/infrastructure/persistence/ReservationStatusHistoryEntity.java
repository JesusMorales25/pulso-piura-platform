package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import com.pulsopiura.platform.reservations.domain.ReservationStatusTransition;
import com.pulsopiura.platform.reservations.domain.ReservationTransitionActor;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reservation_status_history", schema = "app")
public class ReservationStatusHistoryEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "reservation_id", nullable = false)
    private UUID reservationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 30)
    private ReservationStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 30)
    private ReservationStatus newStatus;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private ReservationTransitionActor actorType;

    @Column(name = "reason_code", length = 60)
    private String reasonCode;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected ReservationStatusHistoryEntity() {}

    static ReservationStatusHistoryEntity fromDomain(ReservationStatusTransition transition) {
        var history = new ReservationStatusHistoryEntity();
        history.id = UUID.randomUUID();
        history.organizationId = transition.organizationId();
        history.reservationId = transition.reservationId();
        history.previousStatus = transition.previousStatus();
        history.newStatus = transition.newStatus();
        history.actorType = transition.actorType();
        history.actorUserId = transition.actorUserId();
        history.reasonCode = transition.reasonCode();
        history.correlationId = transition.correlationId();
        history.occurredAt = transition.occurredAt();
        return history;
    }
}
