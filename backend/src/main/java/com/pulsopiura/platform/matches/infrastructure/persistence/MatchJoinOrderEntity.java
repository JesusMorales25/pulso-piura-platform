package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.MatchPaymentMethod;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "match_join_orders", schema = "app")
public class MatchJoinOrderEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "match_id", nullable = false)
    private UUID matchId;

    @Column(name = "payer_user_id", nullable = false)
    private UUID payerUserId;

    @Column(name = "amount_minor", nullable = false)
    private long amountMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchPaymentMethod method;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "provider_reference", length = 120)
    private String providerReference;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected MatchJoinOrderEntity() {}

    public static MatchJoinOrderEntity pending(
            UUID organizationId,
            UUID matchId,
            UUID payerUserId,
            long amountMinor,
            MatchPaymentMethod method,
            String key,
            Instant expiresAt,
            Instant now) {
        var order = new MatchJoinOrderEntity();
        order.id = UUID.randomUUID();
        order.organizationId = organizationId;
        order.matchId = matchId;
        order.payerUserId = payerUserId;
        order.amountMinor = amountMinor;
        order.currency = "PEN";
        order.method = method;
        order.status = "PENDING";
        order.expiresAt = expiresAt;
        order.idempotencyKey = key;
        order.createdAt = now;
        order.updatedAt = now;
        return order;
    }

    public void expire(Instant now) {
        if (!"PENDING".equals(status)) return;
        status = "EXPIRED";
        updatedAt = now;
    }

    public void markPaid(String reference, Instant now) {
        if ("PAID".equals(status)) return;
        if (!"PENDING".equals(status) || !now.isBefore(expiresAt))
            throw new IllegalStateException("El cupo reservado venció");
        status = "PAID";
        providerReference = reference;
        paidAt = now;
        updatedAt = now;
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID matchId() {
        return matchId;
    }

    public UUID payerUserId() {
        return payerUserId;
    }

    public long amountMinor() {
        return amountMinor;
    }

    public String currency() {
        return currency;
    }

    public MatchPaymentMethod method() {
        return method;
    }

    public String status() {
        return status;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public String providerReference() {
        return providerReference;
    }

    public Instant paidAt() {
        return paidAt;
    }
}
