package com.pulsopiura.platform.matches.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class ManualMatchParticipant {
    private final UUID id;
    private final UUID organizationId;
    private final UUID matchId;
    private final String displayName;
    private final String phone;
    private final boolean paid;
    private final long paidMinor;
    private final Instant paidAt;
    private final UUID createdBy;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final long version;

    private ManualMatchParticipant(
            UUID id,
            UUID organizationId,
            UUID matchId,
            String displayName,
            String phone,
            boolean paid,
            long paidMinor,
            Instant paidAt,
            UUID createdBy,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        this.id = Objects.requireNonNull(id);
        this.organizationId = Objects.requireNonNull(organizationId);
        this.matchId = Objects.requireNonNull(matchId);
        this.displayName = required(displayName, "El nombre", 120);
        this.phone = optional(phone, 30);
        this.paid = paid;
        if (paidMinor < 0) throw new IllegalArgumentException("El pago no puede ser negativo");
        if (!paid && (paidMinor != 0 || paidAt != null))
            throw new IllegalArgumentException("El estado del pago es inconsistente");
        if (paid && paidAt == null)
            throw new IllegalArgumentException("La fecha del pago es obligatoria");
        this.paidMinor = paidMinor;
        this.paidAt = paidAt;
        this.createdBy = Objects.requireNonNull(createdBy);
        this.createdAt = Objects.requireNonNull(createdAt);
        this.updatedAt = Objects.requireNonNull(updatedAt);
        this.version = version;
    }

    public static ManualMatchParticipant create(
            UUID organizationId,
            UUID matchId,
            String displayName,
            String phone,
            boolean paid,
            long matchPriceMinor,
            UUID createdBy,
            Instant now) {
        return new ManualMatchParticipant(
                UUID.randomUUID(),
                organizationId,
                matchId,
                displayName,
                phone,
                paid,
                paid ? matchPriceMinor : 0,
                paid ? now : null,
                createdBy,
                now,
                now,
                0);
    }

    public static ManualMatchParticipant restore(
            UUID id,
            UUID organizationId,
            UUID matchId,
            String displayName,
            String phone,
            boolean paid,
            long paidMinor,
            Instant paidAt,
            UUID createdBy,
            Instant createdAt,
            Instant updatedAt,
            long version) {
        return new ManualMatchParticipant(
                id,
                organizationId,
                matchId,
                displayName,
                phone,
                paid,
                paidMinor,
                paidAt,
                createdBy,
                createdAt,
                updatedAt,
                version);
    }

    private static String required(String value, String label, int max) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(label + " es obligatorio");
        var normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.length() > max)
            throw new IllegalArgumentException(label + " excede " + max + " caracteres");
        return normalized;
    }

    private static String optional(String value, int max) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.length() > max)
            throw new IllegalArgumentException("El teléfono excede " + max + " caracteres");
        if (!normalized.matches("[+0-9 ()-]{6,30}"))
            throw new IllegalArgumentException("El teléfono no es válido");
        return normalized;
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

    public String displayName() {
        return displayName;
    }

    public String phone() {
        return phone;
    }

    public boolean paid() {
        return paid;
    }

    public long paidMinor() {
        return paidMinor;
    }

    public Instant paidAt() {
        return paidAt;
    }

    public UUID createdBy() {
        return createdBy;
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
