package com.pulsopiura.platform.organizations.application;

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
class VenueOwnerAuthorizationTest {
    @Mock CapabilityRequestService capabilityRequests;

    @Test
    void approvedOwnerCanCreateAnOrganization() {
        var actor = UUID.randomUUID();
        when(capabilityRequests.isApproved(actor, CapabilityType.VENUE_OWNER)).thenReturn(true);
        var authorization = new VenueOwnerAuthorization(capabilityRequests);

        assertThatCode(() -> authorization.requireCanCreateOrganization(actor, List.of("PLAYER")))
                .doesNotThrowAnyException();
    }

    @Test
    void platformAdminCanCreateWithoutOwnerCapability() {
        var actor = UUID.randomUUID();
        var authorization = new VenueOwnerAuthorization(capabilityRequests);

        assertThatCode(
                        () ->
                                authorization.requireCanCreateOrganization(
                                        actor, List.of("PLATFORM_ADMIN")))
                .doesNotThrowAnyException();
        verify(capabilityRequests, never()).isApproved(actor, CapabilityType.VENUE_OWNER);
    }

    @Test
    void regularPlayerCannotCreateAnOrganization() {
        var actor = UUID.randomUUID();
        when(capabilityRequests.isApproved(actor, CapabilityType.VENUE_OWNER)).thenReturn(false);
        var authorization = new VenueOwnerAuthorization(capabilityRequests);

        assertThatThrownBy(
                        () -> authorization.requireCanCreateOrganization(actor, List.of("PLAYER")))
                .isInstanceOf(AccessDeniedException.class);
    }
}
