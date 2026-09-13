package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sports_matches", schema = "app")
class SportsMatchJpaEntity {
    @Id private UUID id;

    @Column(name = "public_slug", nullable = false, unique = true, length = 80)
    private String publicSlug;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "reservation_id", nullable = false, unique = true)
    private UUID reservationId;

    @Column(name = "sport_space_id", nullable = false)
    private UUID sportSpaceId;

    @Column(name = "organizer_user_id", nullable = false)
    private UUID organizerUserId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "sport_code", nullable = false, length = 40)
    private String sportCode;

    @Column(name = "format_code", nullable = false, length = 40)
    private String formatCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_level", nullable = false, length = 30)
    private SkillLevel skillLevel;

    @Column(name = "min_players", nullable = false)
    private int minPlayers;

    @Column(name = "max_players", nullable = false)
    private int maxPlayers;

    @Column(name = "organizer_counts", nullable = false)
    private boolean organizerCounts;

    @Column(name = "price_minor", nullable = false)
    private long priceMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchVisibility visibility;

    @Column(name = "cancellation_policy", nullable = false, length = 500)
    private String cancellationPolicy;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MatchStatus status;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected SportsMatchJpaEntity() {}

    static SportsMatchJpaEntity fromDomain(SportsMatch match) {
        var entity = new SportsMatchJpaEntity();
        entity.id = match.id();
        entity.publicSlug = match.publicSlug();
        entity.organizationId = match.organizationId();
        entity.reservationId = match.reservationId();
        entity.sportSpaceId = match.sportSpaceId();
        entity.organizerUserId = match.organizerUserId();
        entity.title = match.title();
        entity.sportCode = match.sportCode();
        entity.formatCode = match.formatCode();
        entity.skillLevel = match.skillLevel();
        entity.minPlayers = match.minPlayers();
        entity.maxPlayers = match.maxPlayers();
        entity.organizerCounts = match.organizerCounts();
        entity.priceMinor = match.priceMinor();
        entity.currency = "PEN";
        entity.visibility = match.visibility();
        entity.cancellationPolicy = match.cancellationPolicy();
        entity.startsAt = match.startsAt();
        entity.endsAt = match.endsAt();
        entity.status = match.status();
        entity.publishedAt = match.publishedAt();
        entity.createdAt = match.createdAt();
        entity.updatedAt = match.updatedAt();
        entity.version = match.version();
        return entity;
    }

    SportsMatch toDomain() {
        return SportsMatch.restore(
                id,
                publicSlug,
                organizationId,
                reservationId,
                sportSpaceId,
                organizerUserId,
                title,
                sportCode,
                formatCode,
                skillLevel,
                minPlayers,
                maxPlayers,
                organizerCounts,
                priceMinor,
                visibility,
                cancellationPolicy,
                startsAt,
                endsAt,
                status,
                publishedAt,
                createdAt,
                updatedAt,
                version);
    }
}
