package com.pulsopiura.platform.reservations.domain;

public enum ReservationStatus {
    HOLD(true),
    PENDING_PAYMENT(true),
    CONFIRMED(true),
    COMPLETED(false),
    CANCELLED(false),
    EXPIRED(false);

    private final boolean blocksTime;

    ReservationStatus(boolean blocksTime) {
        this.blocksTime = blocksTime;
    }

    public boolean blocksTime() {
        return blocksTime;
    }
}
