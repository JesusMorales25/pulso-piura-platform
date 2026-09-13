package com.pulsopiura.platform.venues.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class VenueEntityTest {
    private static final Instant NOW = Instant.parse("2026-09-04T12:00:00Z");

    @Test
    void newVenueStartsAsDraftAndCanBePublished() {
        var venue = venue();

        venue.publish(NOW.plusSeconds(60));

        assertThat(venue.status().name()).isEqualTo("PUBLISHED");
    }

    @Test
    void archivedVenueRejectsNewConfiguration() {
        var venue = venue();
        venue.archive(NOW.plusSeconds(60));

        assertThatThrownBy(venue::requireConfigurable)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("archivada");
    }

    @Test
    void coordinatesMustBeProvidedTogetherAndWithinRange() {
        assertThatThrownBy(
                        () ->
                                VenueEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        "Sede",
                                        "sede",
                                        "Dirección",
                                        "PIURA",
                                        BigDecimal.ONE,
                                        null,
                                        null,
                                        NOW))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("juntas");

        assertThatThrownBy(
                        () ->
                                VenueEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        "Sede",
                                        "sede",
                                        "Dirección",
                                        "PIURA",
                                        BigDecimal.valueOf(91),
                                        BigDecimal.ZERO,
                                        null,
                                        NOW))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Latitud");
    }

    @Test
    void staleVersionCannotOverwriteVenue() {
        var venue = venue();

        assertThatThrownBy(
                        () ->
                                venue.update(
                                        "Nuevo nombre",
                                        "Nueva dirección",
                                        "CASTILLA",
                                        null,
                                        null,
                                        null,
                                        1,
                                        NOW.plusSeconds(60)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("otro usuario");
    }

    private VenueEntity venue() {
        return VenueEntity.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Sede Centro",
                "sede-centro",
                "Av. Grau 100",
                "PIURA",
                null,
                null,
                null,
                NOW);
    }
}
