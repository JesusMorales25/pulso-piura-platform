package com.pulsopiura.platform.venues.domain;

import java.util.Locale;

public enum AvailabilityExceptionType {
    CLOSED,
    MAINTENANCE,
    SPECIAL_PRICE;

    public static AvailabilityExceptionType parse(String value) {
        try {
            return valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Tipo de excepción no admitido");
        }
    }
}
