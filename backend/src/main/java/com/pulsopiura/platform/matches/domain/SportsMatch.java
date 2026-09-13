package com.pulsopiura.platform.matches.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class SportsMatch {
    private final UUID id;
    private final String publicSlug;
    private final UUID organizationId;
    private final UUID reservationId;
    private final UUID sportSpaceId;
    private final UUID organizerUserId;
    private final String title;
    private final String sportCode;
    private final String formatCode;
    private final SkillLevel skillLevel;
    private final int minPlayers;
    private final int maxPlayers;
    private final boolean organizerCounts;
    private final long priceMinor;
    private final MatchVisibility visibility;
    private final String cancellationPolicy;
    private final Instant startsAt;
    private final Instant endsAt;
    private final Instant createdAt;
    private MatchStatus status;
    private Instant publishedAt;
    private Instant updatedAt;
    private long version;

    private SportsMatch(
            UUID id,
            String publicSlug,
            UUID organizationId,
            UUID reservationId,
            UUID sportSpaceId,
            UUID organizerUserId,
            String title,
            String sportCode,
            String formatCode,
            SkillLevel skillLevel,
            int minPlayers,
            int maxPlayers,
            boolean organizerCounts,
            long priceMinor,
            MatchVisibility visibility,
            String cancellationPolicy,
            Instant startsAt,
            Instant endsAt,
            MatchStatus status,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        this.id = Objects.requireNonNull(id);
        this.publicSlug = required(publicSlug, "El identificador público", 80);
        this.organizationId = Objects.requireNonNull(organizationId);
        this.reservationId = Objects.requireNonNull(reservationId);
        this.sportSpaceId = Objects.requireNonNull(sportSpaceId);
        this.organizerUserId = Objects.requireNonNull(organizerUserId);
        this.title = required(title, "El título", 120);
        this.sportCode = required(sportCode, "El deporte", 40);
        this.formatCode = required(formatCode, "La modalidad", 40);
        this.skillLevel = Objects.requireNonNull(skillLevel);
        if (minPlayers <= 0 || maxPlayers < minPlayers) {
            throw new IllegalArgumentException("Los cupos mínimo y máximo son inválidos");
        }
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
        this.organizerCounts = organizerCounts;
        if (priceMinor < 0) throw new IllegalArgumentException("El costo no puede ser negativo");
        this.priceMinor = priceMinor;
        this.visibility = Objects.requireNonNull(visibility);
        this.cancellationPolicy = required(cancellationPolicy, "La política de cancelación", 500);
        this.startsAt = Objects.requireNonNull(startsAt);
        this.endsAt = Objects.requireNonNull(endsAt);
        if (!startsAt.isBefore(endsAt))
            throw new IllegalArgumentException("El horario es inválido");
        this.status = Objects.requireNonNull(status);
        this.publishedAt = publishedAt;
        this.createdAt = Objects.requireNonNull(createdAt);
        this.updatedAt = Objects.requireNonNull(updatedAt);
        this.version = version;
        if ((status == MatchStatus.DRAFT) != (publishedAt == null)) {
            throw new IllegalArgumentException("El estado de publicación es inconsistente");
        }
    }

    public static SportsMatch draft(
            UUID organizationId,
            UUID reservationId,
            UUID sportSpaceId,
            UUID organizerUserId,
            String title,
            String sportCode,
            String formatCode,
            SkillLevel skillLevel,
            int minPlayers,
            int maxPlayers,
            boolean organizerCounts,
            long priceMinor,
            MatchVisibility visibility,
            String cancellationPolicy,
            Instant startsAt,
            Instant endsAt,
            Instant now) {
        var id = UUID.randomUUID();
        return new SportsMatch(
                id,
                "partido-" + id.toString().replace("-", ""),
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
                MatchStatus.DRAFT,
                null,
                now,
                now,
                0);
    }

    public static SportsMatch restore(
            UUID id,
            String publicSlug,
            UUID organizationId,
            UUID reservationId,
            UUID sportSpaceId,
            UUID organizerUserId,
            String title,
            String sportCode,
            String formatCode,
            SkillLevel skillLevel,
            int minPlayers,
            int maxPlayers,
            boolean organizerCounts,
            long priceMinor,
            MatchVisibility visibility,
            String cancellationPolicy,
            Instant startsAt,
            Instant endsAt,
            MatchStatus status,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        return new SportsMatch(
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

    public void publish(UUID actorId, Instant now) {
        if (!organizerUserId.equals(actorId))
            throw new IllegalStateException("Solo el organizador puede publicar");
        if (status != MatchStatus.DRAFT)
            throw new IllegalStateException("Solo un borrador puede publicarse");
        if (!now.isBefore(startsAt))
            throw new IllegalStateException("No puede publicarse un partido iniciado");
        status = MatchStatus.PUBLISHED;
        publishedAt = now;
        updatedAt = now;
    }

    private static String required(String value, String label, int max) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(label + " es obligatorio");
        var normalized = value.trim();
        if (normalized.length() > max)
            throw new IllegalArgumentException(label + " excede " + max + " caracteres");
        return normalized;
    }

    public UUID id() {
        return id;
    }

    public String publicSlug() {
        return publicSlug;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID reservationId() {
        return reservationId;
    }

    public UUID sportSpaceId() {
        return sportSpaceId;
    }

    public UUID organizerUserId() {
        return organizerUserId;
    }

    public String title() {
        return title;
    }

    public String sportCode() {
        return sportCode;
    }

    public String formatCode() {
        return formatCode;
    }

    public SkillLevel skillLevel() {
        return skillLevel;
    }

    public int minPlayers() {
        return minPlayers;
    }

    public int maxPlayers() {
        return maxPlayers;
    }

    public boolean organizerCounts() {
        return organizerCounts;
    }

    public long priceMinor() {
        return priceMinor;
    }

    public MatchVisibility visibility() {
        return visibility;
    }

    public String cancellationPolicy() {
        return cancellationPolicy;
    }

    public Instant startsAt() {
        return startsAt;
    }

    public Instant endsAt() {
        return endsAt;
    }

    public MatchStatus status() {
        return status;
    }

    public Instant publishedAt() {
        return publishedAt;
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
