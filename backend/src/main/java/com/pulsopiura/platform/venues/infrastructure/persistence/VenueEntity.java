package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.VenueStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "venues", schema = "app")
public class VenueEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 100)
    private String slug;

    @Column(name = "public_slug", nullable = false, unique = true, length = 120)
    private String publicSlug;

    @Column(nullable = false, length = 240)
    private String address;

    @Column(name = "district_code", nullable = false, length = 60)
    private String districtCode;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "public_phone", length = 30)
    private String publicPhone;

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

    protected VenueEntity() {}

    public static VenueEntity create(
            UUID organizationId,
            UUID actorId,
            String name,
            String slug,
            String address,
            String districtCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String publicPhone,
            Instant now) {
        validateCoordinates(latitude, longitude);
        var venue = new VenueEntity();
        venue.id = UUID.randomUUID();
        venue.organizationId = organizationId;
        venue.createdBy = actorId;
        venue.name = required(name, "El nombre", 160);
        venue.slug = required(slug, "El slug", 100);
        venue.publicSlug = venue.slug + "-" + venue.id.toString().replace("-", "").substring(0, 8);
        venue.address = required(address, "La dirección", 240);
        venue.districtCode = required(districtCode, "El distrito", 60);
        venue.latitude = latitude;
        venue.longitude = longitude;
        venue.publicPhone = optional(publicPhone, 30);
        venue.status = VenueStatus.DRAFT;
        venue.createdAt = now;
        venue.updatedAt = now;
        return venue;
    }

    public void publish(Instant now) {
        if (status != VenueStatus.DRAFT) {
            throw new IllegalStateException("Solo una sede borrador puede publicarse");
        }
        status = VenueStatus.PUBLISHED;
        updatedAt = now;
    }

    public void update(
            String name,
            String address,
            String districtCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String publicPhone,
            long expectedVersion,
            Instant now) {
        requireVersion(expectedVersion);
        requireConfigurable();
        validateCoordinates(latitude, longitude);
        this.name = required(name, "El nombre", 160);
        this.address = required(address, "La dirección", 240);
        this.districtCode = required(districtCode, "El distrito", 60);
        this.latitude = latitude;
        this.longitude = longitude;
        this.publicPhone = optional(publicPhone, 30);
        this.updatedAt = now;
    }

    public void archive(Instant now) {
        if (status == VenueStatus.ARCHIVED) {
            throw new IllegalStateException("La sede ya está archivada");
        }
        status = VenueStatus.ARCHIVED;
        updatedAt = now;
    }

    public void requireConfigurable() {
        if (status == VenueStatus.ARCHIVED) {
            throw new IllegalStateException("Una sede archivada no admite nuevas canchas");
        }
    }

    public void requirePublished() {
        if (status != VenueStatus.PUBLISHED) {
            throw new IllegalStateException("La sede debe estar publicada");
        }
    }

    private void requireVersion(long expectedVersion) {
        if (version != expectedVersion) {
            throw new IllegalStateException("La sede fue modificada por otro usuario");
        }
    }

    private static void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Latitud y longitud deben enviarse juntas");
        }
        if (latitude != null
                && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                        || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new IllegalArgumentException("Latitud fuera de rango");
        }
        if (longitude != null
                && (longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                        || longitude.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new IllegalArgumentException("Longitud fuera de rango");
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
            throw new IllegalArgumentException("El teléfono excede " + max + " caracteres");
        return normalized;
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public String name() {
        return name;
    }

    public String slug() {
        return slug;
    }

    public String publicSlug() {
        return publicSlug;
    }

    public String address() {
        return address;
    }

    public String districtCode() {
        return districtCode;
    }

    public BigDecimal latitude() {
        return latitude;
    }

    public BigDecimal longitude() {
        return longitude;
    }

    public String publicPhone() {
        return publicPhone;
    }

    public VenueStatus status() {
        return status;
    }

    public long version() {
        return version;
    }
}
