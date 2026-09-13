package com.pulsopiura.platform.identity.infrastructure.persistence;

import com.pulsopiura.platform.identity.domain.CapabilityType;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "capability_requests", schema = "app")
public class CapabilityRequestEntity {
    @Id private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CapabilityType capability;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 1000)
    private String reason;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected CapabilityRequestEntity() {}

    public static CapabilityRequestEntity pending(
            UUID userId, CapabilityType capability, String reason, Instant now) {
        var request = new CapabilityRequestEntity();
        request.id = UUID.randomUUID();
        request.userId = userId;
        request.capability = capability;
        request.status = "PENDING";
        request.reason = reason;
        request.createdAt = now;
        request.updatedAt = now;
        return request;
    }

    public UUID id() {
        return id;
    }

    public UUID userId() {
        return userId;
    }

    public CapabilityType capability() {
        return capability;
    }

    public String status() {
        return status;
    }

    public String reason() {
        return reason;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant reviewedAt() {
        return reviewedAt;
    }

    public void review(String decision, UUID reviewerId, String note, Instant now) {
        if (!"PENDING".equals(status))
            throw new IllegalStateException("La solicitud ya fue revisada");
        if (!"APPROVED".equals(decision) && !"REJECTED".equals(decision))
            throw new IllegalArgumentException("Decisión de revisión no válida");
        status = decision;
        reviewedBy = reviewerId;
        reviewNote = note;
        reviewedAt = now;
        updatedAt = now;
    }

    public void revoke(UUID reviewerId, String note, Instant now) {
        if (!"APPROVED".equals(status))
            throw new IllegalStateException("Solo se puede revocar una capacidad aprobada");
        status = "REVOKED";
        reviewedBy = reviewerId;
        reviewNote = note;
        reviewedAt = now;
        updatedAt = now;
    }
}
