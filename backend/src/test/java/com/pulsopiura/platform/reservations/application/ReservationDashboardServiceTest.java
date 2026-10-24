package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.*;
import com.pulsopiura.platform.reservations.application.port.ReservationDashboardQuery;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class ReservationDashboardServiceTest {
    final ReservationDashboardQuery query = mock(ReservationDashboardQuery.class);
    final OrganizationAuthorization authorization = mock(OrganizationAuthorization.class);
    final ReservationDashboardService service =
            new ReservationDashboardService(query, authorization);
    final UUID actor = UUID.randomUUID(), organization = UUID.randomUUID();

    @Test
    void rejectsNonOwnerBeforeReading() {
        when(authorization.require(actor, organization, OrganizationPermission.VIEW))
                .thenReturn(OrganizationRole.ADMIN);
        assertThatThrownBy(() -> service.organization(actor, organization, null, 0, 10))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(query);
    }

    @Test
    void rejectsOtherTenantBeforeReading() {
        when(authorization.require(actor, organization, OrganizationPermission.VIEW))
                .thenThrow(new AccessDeniedException("Sin acceso"));
        assertThatThrownBy(() -> service.organization(actor, organization, null, 0, 10))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(query);
    }

    @Test
    void scopesOwnerAndCustomerReads() {
        when(authorization.require(actor, organization, OrganizationPermission.VIEW))
                .thenReturn(OrganizationRole.OWNER);
        service.organization(actor, organization, ReservationDashboard.Filter.PAID, 2, 10);
        service.own(actor, null, 0, 10);
        verify(query).organization(organization, ReservationDashboard.Filter.PAID, 2, 10);
        verify(query).own(actor, null, 0, 10);
    }

    @Test
    void rejectsInvalidPagination() {
        for (int[] page : new int[][] {{-1, 10}, {0, 0}, {0, 51}})
            assertThatThrownBy(() -> service.own(actor, null, page[0], page[1]))
                    .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(query);
    }
}
