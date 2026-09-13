package com.pulsopiura.platform.reservations.domain;

import java.util.Objects;

public record ReservationMoney(long minor, String currency) {
    public ReservationMoney {
        if (minor < 0) throw new IllegalArgumentException("El importe no puede ser negativo");
        currency = Objects.requireNonNull(currency, "La moneda es obligatoria").trim();
        if (!"PEN".equals(currency)) {
            throw new IllegalArgumentException("La moneda admitida es PEN");
        }
    }

    public static ReservationMoney pen(long minor) {
        return new ReservationMoney(minor, "PEN");
    }
}
