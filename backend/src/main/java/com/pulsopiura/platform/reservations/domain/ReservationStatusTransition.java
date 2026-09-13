package com.pulsopiura.platform.reservations.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record ReservationStatusTransition(
        UUID organizationId,
        UUID reservationId,
        ReservationStatus previousStatus,
        ReservationStatus newStatus,
        ReservationTransitionActor actorType,
        UUID actorUserId,
        String reasonCode,
        String correlationId,
        Instant occurredAt) {
    public ReservationStatusTransition {
        Objects.requireNonNull(organizationId, "La organización es obligatoria");
        Objects.requireNonNull(reservationId, "La reserva es obligatoria");
        Objects.requireNonNull(newStatus, "El estado nuevo es obligatorio");
        Objects.requireNonNull(actorType, "El tipo de actor es obligatorio");
        if (actorType == ReservationTransitionActor.USER && actorUserId == null) {
            throw new IllegalArgumentException("Una transición de usuario requiere actor");
        }
        if (actorType == ReservationTransitionActor.SYSTEM && actorUserId != null) {
            throw new IllegalArgumentException("Una transición del sistema no admite usuario");
        }
        Objects.requireNonNull(occurredAt, "La fecha de transición es obligatoria");
        reasonCode = normalize(reasonCode, 60, "El código de motivo");
        correlationId = normalize(correlationId, 100, "El correlation ID");
    }

    private static String normalize(String value, int maximum, String field) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.length() > maximum) {
            throw new IllegalArgumentException(field + " excede " + maximum + " caracteres");
        }
        return normalized;
    }
}
