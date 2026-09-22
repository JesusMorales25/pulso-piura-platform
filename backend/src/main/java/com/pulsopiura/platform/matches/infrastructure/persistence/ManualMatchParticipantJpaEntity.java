package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.ManualMatchParticipant;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "manual_match_participants", schema = "app")
class ManualMatchParticipantJpaEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "match_id", nullable = false)
    private UUID matchId;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(length = 30)
    private String phone;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus;

    @Column(name = "paid_minor", nullable = false)
    private long paidMinor;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected ManualMatchParticipantJpaEntity() {}

    static ManualMatchParticipantJpaEntity fromDomain(ManualMatchParticipant value) {
        var entity = new ManualMatchParticipantJpaEntity();
        entity.id = value.id();
        entity.organizationId = value.organizationId();
        entity.matchId = value.matchId();
        entity.displayName = value.displayName();
        entity.phone = value.phone();
        entity.paymentStatus = value.paid() ? "PAID_DIRECT" : "UNPAID";
        entity.paidMinor = value.paidMinor();
        entity.paidAt = value.paidAt();
        entity.createdBy = value.createdBy();
        entity.createdAt = value.createdAt();
        entity.updatedAt = value.updatedAt();
        entity.version = value.version();
        return entity;
    }

    ManualMatchParticipant toDomain() {
        return ManualMatchParticipant.restore(
                id,
                organizationId,
                matchId,
                displayName,
                phone,
                "PAID_DIRECT".equals(paymentStatus),
                paidMinor,
                paidAt,
                createdBy,
                createdAt,
                updatedAt,
                version);
    }
}
