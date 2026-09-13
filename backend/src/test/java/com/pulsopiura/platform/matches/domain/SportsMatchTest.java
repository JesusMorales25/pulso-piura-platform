package com.pulsopiura.platform.matches.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SportsMatchTest {
    private static final Instant NOW = Instant.parse("2026-09-06T16:00:00Z");

    @Test
    void createsDraftAndPublishesOnlyForOrganizer() {
        var organizer = UUID.randomUUID();
        var match = draft(organizer, 10, 14);

        assertThat(match.status()).isEqualTo(MatchStatus.DRAFT);
        assertThat(match.publicSlug()).startsWith("partido-");

        match.publish(organizer, NOW.plusSeconds(30));

        assertThat(match.status()).isEqualTo(MatchStatus.PUBLISHED);
        assertThat(match.publishedAt()).isEqualTo(NOW.plusSeconds(30));
    }

    @Test
    void rejectsInvalidCapacityAndPrice() {
        var organizer = UUID.randomUUID();

        assertThatThrownBy(() -> draft(organizer, 12, 10))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Los cupos mínimo y máximo son inválidos");
        assertThatThrownBy(
                        () ->
                                SportsMatch.draft(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        organizer,
                                        "Fútbol 7",
                                        "FOOTBALL",
                                        "FOOTBALL_7",
                                        SkillLevel.INTERMEDIATE,
                                        8,
                                        14,
                                        true,
                                        -1,
                                        MatchVisibility.PUBLIC,
                                        "Cancelación hasta dos horas antes",
                                        NOW.plusSeconds(3600),
                                        NOW.plusSeconds(7200),
                                        NOW))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El costo no puede ser negativo");
    }

    @Test
    void preventsOtherUserAndPastPublication() {
        var organizer = UUID.randomUUID();
        var match = draft(organizer, 8, 14);

        assertThatThrownBy(() -> match.publish(UUID.randomUUID(), NOW.plusSeconds(30)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Solo el organizador puede publicar");
        assertThatThrownBy(() -> match.publish(organizer, NOW.plusSeconds(3600)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("No puede publicarse un partido iniciado");
    }

    private SportsMatch draft(UUID organizer, int minimum, int maximum) {
        return SportsMatch.draft(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                organizer,
                "Fútbol 7 Los Ejidos",
                "FOOTBALL",
                "FOOTBALL_7",
                SkillLevel.INTERMEDIATE,
                minimum,
                maximum,
                true,
                1500,
                MatchVisibility.PUBLIC,
                "Cancelación hasta dos horas antes",
                NOW.plusSeconds(3600),
                NOW.plusSeconds(7200),
                NOW);
    }
}
