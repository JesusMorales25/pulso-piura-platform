package com.pulsopiura.platform.venues.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AvailabilityRuleEntityTest {
    private static final Instant NOW = Instant.parse("2026-09-04T12:00:00Z");

    @Test
    void editingPreservesInactiveStatusAndRejectsStaleVersion() {
        var rule = rule(60, 9000);
        rule.deactivate(rule.version(), NOW);
        rule.update(
                1,
                LocalTime.of(9, 0),
                LocalTime.of(20, 0),
                90,
                10000,
                rule.validFrom(),
                null,
                rule.version(),
                NOW);
        assertThat(rule.status()).isEqualTo("INACTIVE");
        assertThat(rule.dayOfWeek()).isEqualTo(1);
        assertThatThrownBy(
                        () ->
                                rule.update(
                                        1,
                                        LocalTime.of(9, 0),
                                        LocalTime.of(20, 0),
                                        60,
                                        9000,
                                        rule.validFrom(),
                                        null,
                                        rule.version() + 1,
                                        NOW))
                .isInstanceOf(RuntimeException.class);
    }

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
