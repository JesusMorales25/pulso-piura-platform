package com.pulsopiura.platform.organizations.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.infrastructure.persistence.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

class MembershipVerifiedEmailTest {
    @Test
    void unverifiedEmailCannotConsumeInvitationOrGrantMembership() {
        var memberships = mock(MembershipRepository.class);
        var invitations = mock(InvitationRepository.class);
        var events = mock(ApplicationEventPublisher.class);
        var service =
                new MembershipService(
                        memberships, invitations, mock(OrganizationAuthorization.class), events);
        assertThatThrownBy(
                        () ->
                                service.accept(
                                        UUID.randomUUID(),
                                        "invited@example.test",
                                        false,
                                        UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(invitations, memberships, events);
    }
}
