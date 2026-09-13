package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.AvailabilityExceptionType;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "availability_exceptions", schema = "app")
public class AvailabilityExceptionEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "sport_space_id", nullable = false)
    private UUID sportSpaceId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AvailabilityExceptionType type;

    @Column(name = "price_minor")
    private Long priceMinor;

    @Column(length = 3)
    private String currency;

    @Column(length = 240)
    private String reason;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected AvailabilityExceptionEntity() {}

    public static AvailabilityExceptionEntity create(
            UUID organizationId,
            UUID sportSpaceId,
            UUID actorId,
            Instant startsAt,
            Instant endsAt,
            String rawType,
            Long priceMinor,
            String reason,
            Instant now) {
        var type = AvailabilityExceptionType.parse(rawType);
        if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt))
            throw new IllegalArgumentException("El inicio debe ser anterior al fin");
        validatePrice(type, priceMinor);
        var exception = new AvailabilityExceptionEntity();
        exception.id = UUID.randomUUID();
        exception.organizationId = organizationId;
        exception.sportSpaceId = sportSpaceId;
        exception.startsAt = startsAt;
        exception.endsAt = endsAt;
        exception.type = type;
        exception.priceMinor = priceMinor;
        exception.currency = type == AvailabilityExceptionType.SPECIAL_PRICE ? "PEN" : null;
        exception.reason = normalizeReason(reason);
        exception.status = "ACTIVE";
        exception.createdBy = actorId;
        exception.createdAt = now;
        exception.updatedAt = now;
        return exception;
    }

    public void cancel(long expectedVersion, Instant now) {
        if (version != expectedVersion)
            throw new IllegalStateException("La excepción fue modificada por otro usuario");
        if ("CANCELLED".equals(status))
            throw new IllegalStateException("La excepción ya está cancelada");
        status = "CANCELLED";
        updatedAt = now;
    }

    private static void validatePrice(AvailabilityExceptionType type, Long priceMinor) {
        if (type == AvailabilityExceptionType.SPECIAL_PRICE
                && (priceMinor == null || priceMinor < 0))
            throw new IllegalArgumentException(
                    "El precio especial es obligatorio y no puede ser negativo");
        if (type != AvailabilityExceptionType.SPECIAL_PRICE && priceMinor != null)
            throw new IllegalArgumentException(
                    "El precio solo corresponde a una excepción de precio especial");
    }

    private static String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        var normalized = reason.trim();
        if (normalized.length() > 240)
            throw new IllegalArgumentException("El motivo excede 240 caracteres");
        return normalized;
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID sportSpaceId() {
        return sportSpaceId;
    }

    public Instant startsAt() {
        return startsAt;
    }

    public Instant endsAt() {
        return endsAt;
    }

    public AvailabilityExceptionType type() {
        return type;
    }

    public Long priceMinor() {
        return priceMinor;
    }

    public String currency() {
        return currency;
    }

    public String reason() {
        return reason;
    }

    public String status() {
        return status;
    }

    public long version() {
        return version;
    }
}
