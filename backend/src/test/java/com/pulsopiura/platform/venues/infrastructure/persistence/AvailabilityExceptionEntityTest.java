package com.pulsopiura.platform.venues.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AvailabilityExceptionEntityTest {
    private static final Instant NOW = Instant.parse("2026-09-04T12:00:00Z");

    @Test
    void specialPriceRequiresAmountInMinorUnits() {
        assertThatThrownBy(() -> create("SPECIAL_PRICE", null))
                .hasMessageContaining("precio especial");

        var exception = create("SPECIAL_PRICE", 7500L);
        assertThat(exception.currency()).isEqualTo("PEN");
        assertThat(exception.priceMinor()).isEqualTo(7500L);
    }

    @Test
    void closureRejectsPriceAndInvalidRange() {
        assertThatThrownBy(() -> create("CLOSED", 5000L)).hasMessageContaining("solo corresponde");
        assertThatThrownBy(
                        () ->
                                AvailabilityExceptionEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        NOW.plusSeconds(3600),
                                        NOW,
                                        "CLOSED",
                                        null,
                                        null,
                                        NOW))
                .hasMessageContaining("inicio");
    }

    private AvailabilityExceptionEntity create(String type, Long priceMinor) {
        return AvailabilityExceptionEntity.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                NOW.plusSeconds(3600),
                NOW.plusSeconds(7200),
                type,
                priceMinor,
                "Piloto",
                NOW);
    }
}
