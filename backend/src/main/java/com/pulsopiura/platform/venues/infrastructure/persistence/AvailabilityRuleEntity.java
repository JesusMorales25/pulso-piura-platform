package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "availability_rules", schema = "app")
public class AvailabilityRuleEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "sport_space_id", nullable = false)
    private UUID sportSpaceId;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "start_local_time", nullable = false)
    private LocalTime startLocalTime;

    @Column(name = "end_local_time", nullable = false)
    private LocalTime endLocalTime;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes;

    @Column(name = "price_minor", nullable = false)
    private long priceMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected AvailabilityRuleEntity() {}

    public static AvailabilityRuleEntity create(
            UUID organizationId,
            UUID sportSpaceId,
            UUID actorId,
            int dayOfWeek,
            LocalTime startLocalTime,
            LocalTime endLocalTime,
            int slotMinutes,
            long priceMinor,
            LocalDate validFrom,
            LocalDate validTo,
            Instant now) {
        validate(
                dayOfWeek,
                startLocalTime,
                endLocalTime,
                slotMinutes,
                priceMinor,
                validFrom,
                validTo);
        var rule = new AvailabilityRuleEntity();
        rule.id = UUID.randomUUID();
        rule.organizationId = organizationId;
        rule.sportSpaceId = sportSpaceId;
        rule.dayOfWeek = dayOfWeek;
        rule.startLocalTime = startLocalTime;
        rule.endLocalTime = endLocalTime;
        rule.slotMinutes = slotMinutes;
        rule.priceMinor = priceMinor;
        rule.currency = "PEN";
        rule.validFrom = validFrom;
        rule.validTo = validTo;
        rule.status = "ACTIVE";
        rule.createdBy = actorId;
        rule.createdAt = now;
        rule.updatedAt = now;
        return rule;
    }

    public void deactivate(long expectedVersion, Instant now) {
        requireVersion(expectedVersion);
        if ("INACTIVE".equals(status)) throw new IllegalStateException("La regla ya está inactiva");
        status = "INACTIVE";
        updatedAt = now;
    }

    private static void validate(
            int dayOfWeek,
            LocalTime start,
            LocalTime end,
            int slotMinutes,
            long priceMinor,
            LocalDate validFrom,
            LocalDate validTo) {
        if (dayOfWeek < 1 || dayOfWeek > 7)
            throw new IllegalArgumentException("Día de semana inválido");
        if (start == null || end == null || !start.isBefore(end))
            throw new IllegalArgumentException("La hora inicial debe ser anterior a la final");
        if (slotMinutes < 30 || slotMinutes > 180)
            throw new IllegalArgumentException("La duración debe estar entre 30 y 180 minutos");
        if (priceMinor < 0) throw new IllegalArgumentException("El precio no puede ser negativo");
        if (validFrom == null)
            throw new IllegalArgumentException("La fecha inicial es obligatoria");
        if (validTo != null && validTo.isBefore(validFrom))
            throw new IllegalArgumentException("La fecha final no puede preceder a la inicial");
    }

    private void requireVersion(long expectedVersion) {
        if (version != expectedVersion)
            throw new IllegalStateException("La regla fue modificada por otro usuario");
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

    public int dayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime startLocalTime() {
        return startLocalTime;
    }

    public LocalTime endLocalTime() {
        return endLocalTime;
    }

    public int slotMinutes() {
        return slotMinutes;
    }

    public long priceMinor() {
        return priceMinor;
    }

    public String currency() {
        return currency;
    }

    public LocalDate validFrom() {
        return validFrom;
    }

    public LocalDate validTo() {
        return validTo;
    }

    public String status() {
        return status;
    }

    public long version() {
        return version;
    }
}
