package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;

class OrganizationScheduleQueryTest {
    @Test
    void unauthorizedActorCannotReadReservationsOrCustomers() {
        var jdbc = mock(JdbcTemplate.class);
        var authorization = mock(OrganizationAuthorization.class);
        var actor = UUID.randomUUID();
        var organization = UUID.randomUUID();
        doThrow(new AccessDeniedException("Sin acceso"))
                .when(authorization)
                .require(actor, organization, OrganizationPermission.OPERATE);
        assertThatThrownBy(
                        () ->
                                new OrganizationScheduleQuery(jdbc, authorization)
                                        .schedule(actor, organization, LocalDate.now(), null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(jdbc);
    }

    @Test
    void foreignCourtIsRejectedBeforeScheduleQuery() {
        var jdbc = mock(JdbcTemplate.class);
        var authorization = mock(OrganizationAuthorization.class);
        var actor = UUID.randomUUID();
        var organization = UUID.randomUUID();
        var court = UUID.randomUUID();
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(court), eq(organization)))
                .thenReturn(false);
        assertThatThrownBy(
                        () ->
                                new OrganizationScheduleQuery(jdbc, authorization)
                                        .schedule(actor, organization, LocalDate.now(), court))
                .isInstanceOf(NoSuchElementException.class);
        verify(authorization).require(actor, organization, OrganizationPermission.OPERATE);
        verify(jdbc).queryForObject(anyString(), eq(Boolean.class), eq(court), eq(organization));
        verifyNoMoreInteractions(jdbc);
    }
}
