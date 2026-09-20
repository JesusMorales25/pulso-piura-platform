package com.pulsopiura.platform.matches.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class MatchInvitationEntityTest {
    private static final Instant NOW = Instant.parse("2026-09-17T20:00:00Z");

    @Test
    void acceptsOnlyTheVerifiedInvitedEmail() {
        var invitation = pending();
        var actor = UUID.randomUUID();

        invitation.accept(actor, "JUGADOR@CORREO.COM", true, NOW.plusSeconds(30));

        assertThat(invitation.status()).isEqualTo("ACCEPTED");
        assertThat(invitation.acceptedBy()).isEqualTo(actor);
    }

    @Test
    void rejectsAnotherEmailOrAnUnverifiedAccount() {
        assertThatThrownBy(
                        () ->
                                pending()
                                        .accept(
                                                UUID.randomUUID(),
                                                "otro@correo.com",
                                                true,
                                                NOW.plusSeconds(30)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(
                        () ->
                                pending()
                                        .accept(
                                                UUID.randomUUID(),
                                                "jugador@correo.com",
                                                false,
                                                NOW.plusSeconds(30)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Verifica tu correo");
    }

    @Test
    void revokedInvitationCannotBeAccepted() {
        var invitation = pending();
        invitation.revoke(NOW.plusSeconds(10));

        assertThatThrownBy(
                        () ->
                                invitation.accept(
                                        UUID.randomUUID(),
                                        "jugador@correo.com",
                                        true,
                                        NOW.plusSeconds(30)))
                .isInstanceOf(IllegalStateException.class);
    }

    private MatchInvitationEntity pending() {
        return MatchInvitationEntity.pending(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "jugador@correo.com",
                UUID.randomUUID(),
                NOW.plusSeconds(3600),
                NOW);
    }
}
