package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.MatchInvitationRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class MatchAccessPolicyTest {
    @Mock MatchInvitationRepository invitations;

    @Test
    void privateMatchAllowsOrganizerAndAcceptedGuest() {
        var organizer = UUID.randomUUID();
        var guest = UUID.randomUUID();
        var match = match(MatchVisibility.PRIVATE, organizer);
        var policy = new MatchAccessPolicy(invitations);
        when(invitations.existsByMatchIdAndAcceptedByAndStatus(match.id(), guest, "ACCEPTED"))
                .thenReturn(true);

        assertThatCode(() -> policy.requireCanAccess(match, organizer)).doesNotThrowAnyException();
        assertThatCode(() -> policy.requireCanAccess(match, guest)).doesNotThrowAnyException();
    }

    @Test
    void privateMatchRejectsStrangerAndAnonymousUser() {
        var organizer = UUID.randomUUID();
        var stranger = UUID.randomUUID();
        var match = match(MatchVisibility.PRIVATE, organizer);
        var policy = new MatchAccessPolicy(invitations);

        assertThatThrownBy(() -> policy.requireCanAccess(match, stranger))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.requireCanAccess(match, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void publicAndLinkMatchesRemainAccessible() {
        var policy = new MatchAccessPolicy(invitations);

        assertThatCode(
                        () ->
                                policy.requireCanAccess(
                                        match(MatchVisibility.PUBLIC, UUID.randomUUID()), null))
                .doesNotThrowAnyException();
        assertThatCode(
                        () ->
                                policy.requireCanAccess(
                                        match(MatchVisibility.LINK, UUID.randomUUID()), null))
                .doesNotThrowAnyException();
    }

    private SportsMatch match(MatchVisibility visibility, UUID organizer) {
        var now = Instant.parse("2026-09-17T20:00:00Z");
        return SportsMatch.restore(
                UUID.randomUUID(),
                "pichanga-privada",
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                organizer,
                "Pichanga privada",
                "FOOTBALL",
                "FOOTBALL_7",
                SkillLevel.ALL_LEVELS,
                8,
                12,
                false,
                1500,
                visibility,
                "Sin devoluciones",
                now.plusSeconds(7200),
                now.plusSeconds(10800),
                MatchStatus.PUBLISHED,
                now.minusSeconds(60),
                now.minusSeconds(120),
                now.minusSeconds(60),
                0);
    }
}
