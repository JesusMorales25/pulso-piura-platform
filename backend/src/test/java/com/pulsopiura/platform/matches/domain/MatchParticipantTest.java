package com.pulsopiura.platform.matches.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MatchParticipantTest {
    private static final Instant NOW = Instant.parse("2026-09-06T18:00:00Z");

    @Test
    void joinsWithdrawsAndRejoinsWithoutCreatingAnotherIdentity() {
        var participant =
                MatchParticipant.enroll(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        MatchParticipantStatus.JOINED,
                        NOW);
        var id = participant.id();

        participant.withdraw(NOW.plusSeconds(60));
        participant.rejoin(MatchParticipantStatus.WAITLISTED, NOW.plusSeconds(120));

        assertThat(participant.id()).isEqualTo(id);
        assertThat(participant.status()).isEqualTo(MatchParticipantStatus.WAITLISTED);
        assertThat(participant.withdrawnAt()).isNull();
    }

    @Test
    void promotesOnlyAWaitlistedParticipant() {
        var waiting =
                MatchParticipant.enroll(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        MatchParticipantStatus.WAITLISTED,
                        NOW);
        waiting.promote(NOW.plusSeconds(60));
        assertThat(waiting.status()).isEqualTo(MatchParticipantStatus.JOINED);

        var joined =
                MatchParticipant.enroll(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        MatchParticipantStatus.JOINED,
                        NOW);
        assertThatThrownBy(() -> joined.promote(NOW.plusSeconds(60)))
                .isInstanceOf(IllegalStateException.class);
    }
}
