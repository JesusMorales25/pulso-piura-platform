package com.pulsopiura.platform.venues.domain;

import java.util.Locale;

public enum SportCode {
    FOOTBALL,
    VOLLEYBALL,
    BASKETBALL,
    PADEL,
    TENNIS;

    public static SportCode parse(String value) {
        try {
            return valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Deporte no admitido");
        }
    }
}
