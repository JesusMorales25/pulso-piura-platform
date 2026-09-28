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

    @Test
    void acceptsValidAdminRating() {
        var venue = venueWithRating(new BigDecimal("4.9"), 142);

        assertThat(venue.adminRating()).isEqualByComparingTo("4.9");
        assertThat(venue.adminRatingCount()).isEqualTo(142);
    }

    @Test
    void rejectsRatingBelowZero() {
        assertThatThrownBy(() -> venueWithRating(new BigDecimal("-0.1"), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("calificación");
    }

    @Test
    void rejectsRatingAboveFive() {
        assertThatThrownBy(() -> venueWithRating(new BigDecimal("5.1"), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("calificación");
    }

    @Test
    void rejectsNegativeRatingCount() {
        assertThatThrownBy(() -> venueWithRating(new BigDecimal("4.5"), -1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("valoraciones");
    }

    @Test
    void rejectsPartiallyConfiguredRating() {
        assertThatThrownBy(() -> venueWithRating(new BigDecimal("4.5"), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("juntas");
        assertThatThrownBy(() -> venueWithRating(null, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("juntas");
    }

    @Test
    void updatesRatingWithOptimisticVersion() {
        var venue = venue();

        venue.update(
                venue.name(),
                venue.address(),
                venue.districtCode(),
                venue.latitude(),
                venue.longitude(),
                venue.publicPhone(),
                new BigDecimal("4.7"),
                58,
                venue.version(),
                NOW.plusSeconds(60));

        assertThat(venue.adminRating()).isEqualByComparingTo("4.7");
        assertThat(venue.adminRatingCount()).isEqualTo(58);
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

    private VenueEntity venueWithRating(BigDecimal rating, Integer count) {
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
                rating,
                count,
                NOW);
    }
}
