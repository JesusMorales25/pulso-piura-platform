package com.pulsopiura.platform.venues.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SportSpaceEntityTest {
    @Test
    void createsControlledSportAndNormalizedCodes() {
        var space =
                SportSpaceEntity.create(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Cancha 1",
                        "football",
                        "futbol-7",
                        14,
                        "sintetico",
                        false,
                        Instant.now());

        assertThat(space.sportCode().name()).isEqualTo("FOOTBALL");
        assertThat(space.formatCode()).isEqualTo("FUTBOL-7");
        assertThat(space.surfaceType()).isEqualTo("SINTETICO");
    }

    @Test
    void rejectsUnsupportedSportAndNonPositiveCapacity() {
        assertThatThrownBy(
                        () ->
                                SportSpaceEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        "Cancha",
                                        "rugby",
                                        "SEVEN",
                                        14,
                                        null,
                                        false,
                                        Instant.now()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Deporte");

        assertThatThrownBy(
                        () ->
                                SportSpaceEntity.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        "Cancha",
                                        "football",
                                        "FUTBOL-7",
                                        0,
                                        null,
                                        false,
                                        Instant.now()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("capacidad");
    }

    @Test
    void publishedSpaceCannotBePublishedAgainAndArchivedSpaceCannotBeEdited() {
        var space = space();
        space.publish(Instant.now());

        assertThatThrownBy(() -> space.publish(Instant.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("borrador");

        space.archive(Instant.now());
        assertThatThrownBy(
                        () ->
                                space.update(
                                        "Cancha 2",
                                        "football",
                                        "FUTBOL-7",
                                        14,
                                        null,
                                        false,
                                        0,
                                        Instant.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("archivada");
    }

    @Test
    void staleVersionCannotOverwriteSpace() {
        assertThatThrownBy(
                        () ->
                                space().update(
                                                "Cancha 2",
                                                "football",
                                                "FUTBOL-7",
                                                14,
                                                null,
                                                false,
                                                1,
                                                Instant.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("otro usuario");
    }

    private SportSpaceEntity space() {
        return SportSpaceEntity.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Cancha 1",
                "football",
                "FUTBOL-7",
                14,
                null,
                false,
                Instant.now());
    }
}
