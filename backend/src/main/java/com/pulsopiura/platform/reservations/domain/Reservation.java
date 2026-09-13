package com.pulsopiura.platform.reservations.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class Reservation {
    private final UUID id;
    private final UUID organizationId;
    private final UUID sportSpaceId;
    private final UUID customerUserId;
    private final ReservationTimeRange timeRange;
    private final ReservationMoney total;
    private final ReservationMoney deposit;
    private final ReservationIdempotencyKey idempotencyKey;
    private final String requestFingerprint;
    private final Instant createdAt;
    private ReservationStatus status;
    private Instant expiresAt;
    private Instant updatedAt;
    private long version;

    private Reservation(
            UUID id,
            UUID organizationId,
            UUID sportSpaceId,
            UUID customerUserId,
            ReservationTimeRange timeRange,
            ReservationStatus status,
            ReservationMoney total,
            ReservationMoney deposit,
            Instant expiresAt,
            ReservationIdempotencyKey idempotencyKey,
            String requestFingerprint,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        this(
                id,
                organizationId,
                sportSpaceId,
                customerUserId,
                timeRange,
                status,
                total,
                deposit,
                expiresAt,
                idempotencyKey,
                requestFingerprint,
                createdAt,
                updatedAt,
                version,
                true);
    }

    private Reservation(
            UUID id,
            UUID organizationId,
            UUID sportSpaceId,
            UUID customerUserId,
            ReservationTimeRange timeRange,
            ReservationStatus status,
            ReservationMoney total,
            ReservationMoney deposit,
            Instant expiresAt,
            ReservationIdempotencyKey idempotencyKey,
            String requestFingerprint,
            Instant createdAt,
            Instant updatedAt,
            long version,
            boolean requireFutureExpiry) {
        this.id = Objects.requireNonNull(id);
        this.organizationId = Objects.requireNonNull(organizationId);
        this.sportSpaceId = Objects.requireNonNull(sportSpaceId);
        this.customerUserId = Objects.requireNonNull(customerUserId);
        this.timeRange = Objects.requireNonNull(timeRange);
        this.status = Objects.requireNonNull(status);
        this.total = Objects.requireNonNull(total);
        this.deposit = Objects.requireNonNull(deposit);
        this.expiresAt = expiresAt;
        this.idempotencyKey = Objects.requireNonNull(idempotencyKey);
        this.requestFingerprint = validateFingerprint(requestFingerprint);
        this.createdAt = Objects.requireNonNull(createdAt);
        this.updatedAt = Objects.requireNonNull(updatedAt);
        this.version = version;
        validateAmounts(total, deposit);
        validateExpiration(status, expiresAt, createdAt, requireFutureExpiry);
    }

    public static Reservation hold(
            UUID organizationId,
            UUID sportSpaceId,
            UUID customerUserId,
            ReservationTimeRange timeRange,
            ReservationMoney total,
            ReservationMoney deposit,
            Instant expiresAt,
            ReservationIdempotencyKey idempotencyKey,
            String requestFingerprint,
            Instant now) {
        return new Reservation(
                UUID.randomUUID(),
                organizationId,
                sportSpaceId,
                customerUserId,
                timeRange,
                ReservationStatus.HOLD,
                total,
                deposit,
                expiresAt,
                idempotencyKey,
                requestFingerprint,
                now,
                now,
                0);
    }

    public static Reservation restore(
            UUID id,
            UUID organizationId,
            UUID sportSpaceId,
            UUID customerUserId,
            ReservationTimeRange timeRange,
            ReservationStatus status,
            ReservationMoney total,
            ReservationMoney deposit,
            Instant expiresAt,
            ReservationIdempotencyKey idempotencyKey,
            String requestFingerprint,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        return new Reservation(
                id,
                organizationId,
                sportSpaceId,
                customerUserId,
                timeRange,
                status,
                total,
                deposit,
                expiresAt,
                idempotencyKey,
                requestFingerprint,
                createdAt,
                updatedAt,
                version,
                false);
    }

    public boolean confirmWithoutPayment(Instant now) {
        if (status == ReservationStatus.CONFIRMED) return false;
        requireStatus(ReservationStatus.HOLD, "Solo un hold puede confirmarse");
        if (!now.isBefore(expiresAt)) throw new IllegalStateException("El hold ya venció");
        if (deposit.minor() > 0) {
            throw new IllegalStateException("La reserva requiere validar el adelanto");
        }
        status = ReservationStatus.CONFIRMED;
        expiresAt = null;
        updatedAt = now;
        return true;
    }

    public boolean startPayment(Instant now) {
        if (status == ReservationStatus.PENDING_PAYMENT) return false;
        requireStatus(ReservationStatus.HOLD, "Solo un hold puede iniciar un pago");
        if (!now.isBefore(expiresAt)) throw new IllegalStateException("El hold ya venció");
        status = ReservationStatus.PENDING_PAYMENT;
        updatedAt = now;
        return true;
    }

    public boolean confirmPaid(Instant now) {
        if (status == ReservationStatus.CONFIRMED) return false;
        requireStatus(ReservationStatus.PENDING_PAYMENT, "El pago no está pendiente");
        if (!now.isBefore(expiresAt)) throw new IllegalStateException("El hold ya venció");
        status = ReservationStatus.CONFIRMED;
        expiresAt = null;
        updatedAt = now;
        return true;
    }

    public boolean cancel(Instant now) {
        if (status == ReservationStatus.CANCELLED) return false;
        if (status != ReservationStatus.HOLD
                && status != ReservationStatus.PENDING_PAYMENT
                && status != ReservationStatus.CONFIRMED) {
            throw new IllegalStateException("La reserva no puede cancelarse en su estado actual");
        }
        status = ReservationStatus.CANCELLED;
        expiresAt = null;
        updatedAt = now;
        return true;
    }

    public boolean complete(Instant now) {
        if (status == ReservationStatus.COMPLETED) return false;
        requireStatus(
                ReservationStatus.CONFIRMED,
                "Solo una reserva confirmada puede registrar la llegada");
        status = ReservationStatus.COMPLETED;
        expiresAt = null;
        updatedAt = now;
        return true;
    }

    public boolean expire(Instant now) {
        if (status == ReservationStatus.EXPIRED) return false;
        if ((status != ReservationStatus.HOLD && status != ReservationStatus.PENDING_PAYMENT)
                || now.isBefore(expiresAt)) return false;
        status = ReservationStatus.EXPIRED;
        expiresAt = null;
        updatedAt = now;
        return true;
    }

    private void requireStatus(ReservationStatus expected, String message) {
        if (status != expected) throw new IllegalStateException(message);
    }

    private static void validateAmounts(ReservationMoney total, ReservationMoney deposit) {
        if (!total.currency().equals(deposit.currency())) {
            throw new IllegalArgumentException("Total y adelanto deben usar la misma moneda");
        }
        if (deposit.minor() > total.minor()) {
            throw new IllegalArgumentException("El adelanto no puede exceder el total");
        }
    }

    private static void validateExpiration(
            ReservationStatus status, Instant expiresAt, Instant reference, boolean requireFuture) {
        if (status == ReservationStatus.HOLD || status == ReservationStatus.PENDING_PAYMENT) {
            if (expiresAt == null || (requireFuture && !expiresAt.isAfter(reference))) {
                throw new IllegalArgumentException("El hold debe vencer en el futuro");
            }
        } else if (expiresAt != null) {
            throw new IllegalArgumentException("Solo un hold puede tener vencimiento");
        }
    }

    private static String validateFingerprint(String value) {
        if (value == null || !value.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("El fingerprint de la solicitud es inválido");
        }
        return value;
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID sportSpaceId() {
        return sportSpaceId;
    }

    public UUID customerUserId() {
        return customerUserId;
    }

    public ReservationTimeRange timeRange() {
        return timeRange;
    }

    public ReservationStatus status() {
        return status;
    }

    public ReservationMoney total() {
        return total;
    }

    public ReservationMoney deposit() {
        return deposit;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public ReservationIdempotencyKey idempotencyKey() {
        return idempotencyKey;
    }

    public String requestFingerprint() {
        return requestFingerprint;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public long version() {
        return version;
    }
}
