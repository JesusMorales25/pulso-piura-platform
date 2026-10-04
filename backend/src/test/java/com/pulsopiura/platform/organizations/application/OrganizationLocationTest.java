package com.pulsopiura.platform.organizations.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.infrastructure.persistence.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrganizationLocationTest {
    @Test
    void duplicateLocationDoesNotCreateOrganizationOrMembership() {
        var organizations = mock(OrganizationRepository.class);
        var memberships = mock(MembershipRepository.class);
        when(organizations.duplicateLocation("Arena Norte", "Piura", "Av. Norte 10"))
                .thenReturn(true);
        var service =
                new OrganizationService(
                        organizations, memberships, mock(OrganizationAuthorization.class));
        assertThatThrownBy(
                        () ->
                                service.create(
                                        UUID.randomUUID(),
                                        " Arena   Norte ",
                                        "PIURA",
                                        "Av. Norte 10"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ubicación");
        verify(organizations, never()).saveAndFlush(any());
        verifyNoInteractions(memberships);
    }

    @Test
    void sameNameInAnotherLocationCreatesOwnedComplex() {
        var organizations = mock(OrganizationRepository.class);
        var memberships = mock(MembershipRepository.class);
        when(organizations.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberships.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var service =
                new OrganizationService(
                        organizations, memberships, mock(OrganizationAuthorization.class));
        var result = service.create(UUID.randomUUID(), "Arena Norte", "CASTILLA", "Av. Sur 20");
        assertThat(result.name()).isEqualTo("Arena Norte");
        assertThat(result.districtCode()).isEqualTo("Castilla");
        assertThat(result.address()).isEqualTo("Av. Sur 20");
        assertThat(result.role()).isEqualTo("OWNER");
    }
}
