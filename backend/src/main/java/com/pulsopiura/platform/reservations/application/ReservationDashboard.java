package com.pulsopiura.platform.reservations.application;

import java.util.List;

public record ReservationDashboard<T>(
        Counts counts,
        long paidMinor,
        long balanceMinor,
        long retainedMinor,
        List<T> items,
        long total,
        int page,
        int size) {
    public enum Filter {
        ALL,
        CONFIRMED,
        PENDING_PAYMENT,
        PENDING_PAYMENT_CONFIRMATION,
        CANCELLED,
        COMPLETED,
        EXPIRED,
        PAID,
        BALANCE
    }

    public record Counts(
            long all,
            long confirmed,
            long pendingPayment,
            long pendingConfirmation,
            long cancelled,
            long completed,
            long expired,
            long paid,
            long balance) {
        public long total(Filter filter) {
            if (filter == null) return all;
            return switch (filter) {
                case ALL -> all;
                case CONFIRMED -> confirmed;
                case PENDING_PAYMENT -> pendingPayment;
                case PENDING_PAYMENT_CONFIRMATION -> pendingConfirmation;
                case CANCELLED -> cancelled;
                case COMPLETED -> completed;
                case EXPIRED -> expired;
                case PAID -> paid;
                case BALANCE -> balance;
            };
        }
    }
}
