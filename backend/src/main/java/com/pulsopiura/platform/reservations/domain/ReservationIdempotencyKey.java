package com.pulsopiura.platform.reservations.domain;

public record ReservationIdempotencyKey(String value) {
    public ReservationIdempotencyKey {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key es obligatoria");
        }
        value = value.trim();
        if (value.length() > 100) {
            throw new IllegalArgumentException("Idempotency-Key excede 100 caracteres");
        }
    }
}
