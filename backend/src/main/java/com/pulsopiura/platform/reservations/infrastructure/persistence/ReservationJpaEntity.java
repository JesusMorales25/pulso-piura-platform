package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.domain.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reservations", schema = "app")
class ReservationJpaEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "sport_space_id", nullable = false)
    private UUID sportSpaceId;

    @Column(name = "customer_user_id", nullable = false)
    private UUID customerUserId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReservationStatus status;

    @Column(name = "total_minor", nullable = false)
    private long totalMinor;

    @Column(name = "deposit_minor", nullable = false)
    private long depositMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "request_fingerprint", nullable = false, length = 64)
    private String requestFingerprint;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected ReservationJpaEntity() {}

    static ReservationJpaEntity fromDomain(Reservation reservation) {
        var entity = new ReservationJpaEntity();
        entity.id = reservation.id();
        entity.organizationId = reservation.organizationId();
        entity.sportSpaceId = reservation.sportSpaceId();
        entity.customerUserId = reservation.customerUserId();
        entity.startsAt = reservation.timeRange().startsAt();
        entity.endsAt = reservation.timeRange().endsAt();
        entity.status = reservation.status();
        entity.totalMinor = reservation.total().minor();
        entity.depositMinor = reservation.deposit().minor();
        entity.currency = reservation.total().currency();
        entity.expiresAt = reservation.expiresAt();
        entity.idempotencyKey = reservation.idempotencyKey().value();
        entity.requestFingerprint = reservation.requestFingerprint();
        entity.createdAt = reservation.createdAt();
        entity.updatedAt = reservation.updatedAt();
        entity.version = reservation.version();
        return entity;
    }

    Reservation toDomain() {
        return Reservation.restore(
                id,
                organizationId,
                sportSpaceId,
                customerUserId,
                new ReservationTimeRange(startsAt, endsAt),
                status,
                ReservationMoney.pen(totalMinor),
                ReservationMoney.pen(depositMinor),
                expiresAt,
                new ReservationIdempotencyKey(idempotencyKey),
                requestFingerprint,
                createdAt,
                updatedAt,
                version);
    }
}
