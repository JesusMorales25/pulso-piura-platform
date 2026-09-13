package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.identity.application.CapabilityRequestService;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class MatchOrganizerAuthorizationTest {
    @Mock CapabilityRequestService capabilityRequests;

    @Test
    void acceptsAnApprovedOrganizerRequest() {
        var actor = UUID.randomUUID();
        when(capabilityRequests.isApproved(actor, CapabilityType.MATCH_ORGANIZER)).thenReturn(true);
        var authorization = new MatchOrganizerAuthorization(capabilityRequests);

        assertThatCode(() -> authorization.requireOrganizer(actor, List.of()))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsAnOrganizerRealmRoleWithoutARequestLookup() {
        var actor = UUID.randomUUID();
        var authorization = new MatchOrganizerAuthorization(capabilityRequests);

        assertThatCode(() -> authorization.requireOrganizer(actor, List.of("PLAYER", "CAPTAIN")))
                .doesNotThrowAnyException();
        verify(capabilityRequests, never()).isApproved(actor, CapabilityType.MATCH_ORGANIZER);
    }

    @Test
    void rejectsAPlayerWithoutApproval() {
        var actor = UUID.randomUUID();
        when(capabilityRequests.isApproved(actor, CapabilityType.MATCH_ORGANIZER))
                .thenReturn(false);
        var authorization = new MatchOrganizerAuthorization(capabilityRequests);

        assertThatThrownBy(() -> authorization.requireOrganizer(actor, List.of("PLAYER")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("aún no está aprobada");
    }
}
