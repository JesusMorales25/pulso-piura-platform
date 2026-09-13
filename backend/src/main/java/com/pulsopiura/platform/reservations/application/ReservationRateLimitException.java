package com.pulsopiura.platform.reservations.application;

public class ReservationRateLimitException extends RuntimeException {
    public ReservationRateLimitException(String message) {
        super(message);
    }
}
