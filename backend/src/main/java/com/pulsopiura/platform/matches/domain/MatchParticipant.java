package com.pulsopiura.platform.matches.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class MatchParticipant {
    private final UUID id;
    private final UUID organizationId;
    private final UUID matchId;
    private final UUID userId;
    private final Instant createdAt;
    private MatchParticipantStatus status;
    private Instant joinedAt;
    private Instant waitlistedAt;
    private Instant withdrawnAt;
    private Instant updatedAt;
    private long version;

    private MatchParticipant(
            UUID id,
            UUID organizationId,
            UUID matchId,
            UUID userId,
            MatchParticipantStatus status,
            Instant joinedAt,
            Instant waitlistedAt,
            Instant withdrawnAt,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        this.id = Objects.requireNonNull(id);
        this.organizationId = Objects.requireNonNull(organizationId);
        this.matchId = Objects.requireNonNull(matchId);
        this.userId = Objects.requireNonNull(userId);
        this.status = Objects.requireNonNull(status);
        this.joinedAt = joinedAt;
        this.waitlistedAt = waitlistedAt;
        this.withdrawnAt = withdrawnAt;
        this.createdAt = Objects.requireNonNull(createdAt);
        this.updatedAt = Objects.requireNonNull(updatedAt);
        this.version = version;
        validateTimestamps();
    }

    public static MatchParticipant enroll(
            UUID organizationId,
            UUID matchId,
            UUID userId,
            MatchParticipantStatus status,
            Instant now) {
        if (status == MatchParticipantStatus.WITHDRAWN) {
            throw new IllegalArgumentException("No se puede crear una participación retirada");
        }
        return new MatchParticipant(
                UUID.randomUUID(),
                organizationId,
                matchId,
                userId,
                status,
                status == MatchParticipantStatus.JOINED ? now : null,
                status == MatchParticipantStatus.WAITLISTED ? now : null,
                null,
                now,
                now,
                0);
    }

    public static MatchParticipant restore(
            UUID id,
            UUID organizationId,
            UUID matchId,
            UUID userId,
            MatchParticipantStatus status,
            Instant joinedAt,
            Instant waitlistedAt,
            Instant withdrawnAt,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        return new MatchParticipant(
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

    public void rejoin(MatchParticipantStatus nextStatus, Instant now) {
        if (status != MatchParticipantStatus.WITHDRAWN) return;
        status = nextStatus;
        joinedAt = nextStatus == MatchParticipantStatus.JOINED ? now : null;
        waitlistedAt = nextStatus == MatchParticipantStatus.WAITLISTED ? now : null;
        withdrawnAt = null;
        updatedAt = now;
    }

    public void withdraw(Instant now) {
        if (status == MatchParticipantStatus.WITHDRAWN) return;
        status = MatchParticipantStatus.WITHDRAWN;
        withdrawnAt = now;
        updatedAt = now;
    }

    public void promote(Instant now) {
        if (status != MatchParticipantStatus.WAITLISTED) {
            throw new IllegalStateException("Solo una persona en espera puede ser promovida");
        }
        status = MatchParticipantStatus.JOINED;
        joinedAt = now;
        withdrawnAt = null;
        updatedAt = now;
    }

    private void validateTimestamps() {
        if (status == MatchParticipantStatus.JOINED && (joinedAt == null || withdrawnAt != null)) {
            throw new IllegalArgumentException("La participación confirmada es inconsistente");
        }
        if (status == MatchParticipantStatus.WAITLISTED
                && (waitlistedAt == null || withdrawnAt != null)) {
            throw new IllegalArgumentException("La espera es inconsistente");
        }
        if (status == MatchParticipantStatus.WITHDRAWN && withdrawnAt == null) {
            throw new IllegalArgumentException("El retiro es inconsistente");
        }
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

    public UUID userId() {
        return userId;
    }

    public MatchParticipantStatus status() {
        return status;
    }

    public Instant joinedAt() {
        return joinedAt;
    }

    public Instant waitlistedAt() {
        return waitlistedAt;
    }

    public Instant withdrawnAt() {
        return withdrawnAt;
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
