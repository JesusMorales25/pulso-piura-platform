package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.MatchParticipant;
import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "match_participants", schema = "app")
class MatchParticipantJpaEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "match_id", nullable = false)
    private UUID matchId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchParticipantStatus status;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @Column(name = "waitlisted_at")
    private Instant waitlistedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected MatchParticipantJpaEntity() {}

    static MatchParticipantJpaEntity fromDomain(MatchParticipant participant) {
        var entity = new MatchParticipantJpaEntity();
        entity.id = participant.id();
        entity.organizationId = participant.organizationId();
        entity.matchId = participant.matchId();
        entity.userId = participant.userId();
        entity.status = participant.status();
        entity.joinedAt = participant.joinedAt();
        entity.waitlistedAt = participant.waitlistedAt();
        entity.withdrawnAt = participant.withdrawnAt();
        entity.createdAt = participant.createdAt();
        entity.updatedAt = participant.updatedAt();
        entity.version = participant.version();
        return entity;
    }

    MatchParticipant toDomain() {
        return MatchParticipant.restore(
                id,
                organizationId,
                matchId,
                userId,
                status,
                joinedAt,
                waitlistedAt,
                withdrawnAt,
                createdAt,
                updatedAt,
                version);
    }
}
