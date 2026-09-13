package com.pulsopiura.platform.venues.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AvailabilityRuleEntityTest {
    private static final Instant NOW = Instant.parse("2026-09-04T12:00:00Z");

    @Test
    void createsRuleWithPenAndMinorUnits() {
        var rule = rule(60, 9000);

        assertThat(rule.currency()).isEqualTo("PEN");
        assertThat(rule.priceMinor()).isEqualTo(9000);
        assertThat(rule.status()).isEqualTo("ACTIVE");
    }

    @Test
    void rejectsInvalidTimeSlotPriceAndValidity() {
        assertThatThrownBy(
                        () ->
                                AvailabilityRuleEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        6,
                                        LocalTime.of(22, 0),
                                        LocalTime.of(20, 0),
                                        60,
                                        9000,
                                        LocalDate.of(2026, 9, 1),
                                        null,
                                        NOW))
                .hasMessageContaining("hora inicial");
        assertThatThrownBy(() -> rule(20, 9000)).hasMessageContaining("30 y 180");
        assertThatThrownBy(() -> rule(60, -1)).hasMessageContaining("negativo");
        assertThatThrownBy(
                        () ->
                                AvailabilityRuleEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        6,
                                        LocalTime.of(18, 0),
                                        LocalTime.of(20, 0),
                                        60,
                                        9000,
                                        LocalDate.of(2026, 9, 2),
                                        LocalDate.of(2026, 9, 1),
                                        NOW))
                .hasMessageContaining("fecha final");
    }

    private AvailabilityRuleEntity rule(int slotMinutes, long priceMinor) {
        return AvailabilityRuleEntity.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                6,
                LocalTime.of(18, 0),
                LocalTime.of(22, 0),
                slotMinutes,
                priceMinor,
                LocalDate.of(2026, 9, 1),
                null,
                NOW);
    }
}
