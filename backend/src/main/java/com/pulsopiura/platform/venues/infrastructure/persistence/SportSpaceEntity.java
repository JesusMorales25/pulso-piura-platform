package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sport_spaces", schema = "app")
public class SportSpaceEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "venue_id", nullable = false)
    private UUID venueId;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_code", nullable = false, length = 40)
    private SportCode sportCode;

    @Column(name = "format_code", nullable = false, length = 40)
    private String formatCode;

    @Column(nullable = false)
    private int capacity;

    @Column(name = "surface_type", length = 40)
    private String surfaceType;

    @Column(nullable = false)
    private boolean indoor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VenueStatus status;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected SportSpaceEntity() {}

    public static SportSpaceEntity create(
            UUID organizationId,
            UUID venueId,
            UUID actorId,
            String name,
            String sportCode,
            String formatCode,
            int capacity,
            String surfaceType,
            boolean indoor,
            Instant now) {
        if (capacity <= 0) throw new IllegalArgumentException("La capacidad debe ser positiva");
        var space = new SportSpaceEntity();
        space.id = UUID.randomUUID();
        space.organizationId = organizationId;
        space.venueId = venueId;
        space.createdBy = actorId;
        space.name = required(name, "El nombre", 160);
        space.sportCode = SportCode.parse(sportCode);
        space.formatCode = required(formatCode, "La modalidad", 40).toUpperCase();
        space.capacity = capacity;
        space.surfaceType = optional(surfaceType, 40);
        space.indoor = indoor;
        space.status = VenueStatus.DRAFT;
        space.createdAt = now;
        space.updatedAt = now;
        return space;
    }

    public void update(
            String name,
            String sportCode,
            String formatCode,
            int capacity,
            String surfaceType,
            boolean indoor,
            long expectedVersion,
            Instant now) {
        requireVersion(expectedVersion);
        requireConfigurable();
        if (capacity <= 0) throw new IllegalArgumentException("La capacidad debe ser positiva");
        this.name = required(name, "El nombre", 160);
        this.sportCode = SportCode.parse(sportCode);
        this.formatCode = required(formatCode, "La modalidad", 40).toUpperCase();
        this.capacity = capacity;
        this.surfaceType = optional(surfaceType, 40);
        this.indoor = indoor;
        this.updatedAt = now;
    }

    public void publish(Instant now) {
        if (status != VenueStatus.DRAFT) {
            throw new IllegalStateException("Solo una cancha borrador puede publicarse");
        }
        status = VenueStatus.PUBLISHED;
        updatedAt = now;
    }

    public void archive(Instant now) {
        if (status == VenueStatus.ARCHIVED) {
            throw new IllegalStateException("La cancha ya está archivada");
        }
        status = VenueStatus.ARCHIVED;
        updatedAt = now;
    }

    public void requireConfigurable() {
        if (status == VenueStatus.ARCHIVED) {
            throw new IllegalStateException("Una cancha archivada no puede editarse");
        }
    }

    private void requireVersion(long expectedVersion) {
        if (version != expectedVersion) {
            throw new IllegalStateException("La cancha fue modificada por otro usuario");
        }
    }

    private static String required(String value, String label, int max) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(label + " es obligatorio");
        var normalized = value.trim();
        if (normalized.length() > max)
            throw new IllegalArgumentException(label + " excede " + max + " caracteres");
        return normalized;
    }

    private static String optional(String value, int max) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.length() > max)
            throw new IllegalArgumentException("La superficie excede " + max + " caracteres");
        return normalized.toUpperCase();
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID venueId() {
        return venueId;
    }

    public String name() {
        return name;
    }

    public SportCode sportCode() {
        return sportCode;
    }

    public String formatCode() {
        return formatCode;
    }

    public int capacity() {
        return capacity;
    }

    public String surfaceType() {
        return surfaceType;
    }

    public boolean indoor() {
        return indoor;
    }

    public VenueStatus status() {
        return status;
    }

    public long version() {
        return version;
    }
}
