package com.pulsopiura.platform.venues.application;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class AvailabilityServiceTest {
    private final SportSpaceRepository spaces = mock(SportSpaceRepository.class);
    private final AvailabilityRuleRepository rules = mock(AvailabilityRuleRepository.class);
    private final AvailabilityExceptionRepository exceptions =
            mock(AvailabilityExceptionRepository.class);
    private final OrganizationAuthorization authorization = mock(OrganizationAuthorization.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final UUID actorId = UUID.randomUUID();
    private final UUID organizationId = UUID.randomUUID();
    private final UUID spaceId = UUID.randomUUID();
    private AvailabilityService service;

    @BeforeEach
    void setUp() {
        service =
                new AvailabilityService(
                        spaces,
                        rules,
                        exceptions,
                        authorization,
                        events,
                        Clock.fixed(Instant.parse("2026-09-04T12:00:00Z"), ZoneOffset.UTC));
        var space =
                SportSpaceEntity.create(
                        organizationId,
                        UUID.randomUUID(),
                        actorId,
                        "Cancha 1",
                        "football",
                        "FUTBOL-7",
                        14,
                        null,
                        false,
                        Instant.now());
        when(spaces.findByIdAndOrganizationId(spaceId, organizationId))
                .thenReturn(Optional.of(space));
        when(exceptions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, spaceId))
                .thenReturn(List.of());
    }

    @Test
    void operatorPermissionIsEnoughForClosure() {
        service.createException(
                actorId,
                organizationId,
                spaceId,
                Instant.parse("2026-09-05T15:00:00Z"),
                Instant.parse("2026-09-05T17:00:00Z"),
                "CLOSED",
                null,
                "Mantenimiento preventivo");

        verify(authorization).require(actorId, organizationId, OrganizationPermission.OPERATE);
        verify(events).publishEvent(any(VenueAuditEvent.class));
    }

    @Test
    void specialPriceRequiresManagementPermission() {
        service.createException(
                actorId,
                organizationId,
                spaceId,
                Instant.parse("2026-09-05T15:00:00Z"),
                Instant.parse("2026-09-05T17:00:00Z"),
                "SPECIAL_PRICE",
                12000L,
                "Horario especial");

        verify(authorization)
                .require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        verify(authorization, never())
                .require(actorId, organizationId, OrganizationPermission.OPERATE);
    }

    @Test
    void managementPermissionIsRequiredForWeeklyRule() {
        when(rules.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.createRule(
                actorId,
                organizationId,
                spaceId,
                6,
                LocalTime.of(18, 0),
                LocalTime.of(22, 0),
                60,
                9000,
                LocalDate.of(2026, 9, 1),
                null);

        verify(authorization)
                .require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
    }

    @Test
    void overlappingActiveRuleIsRejected() {
        var existing =
                AvailabilityRuleEntity.create(
                        organizationId,
                        spaceId,
                        actorId,
                        6,
                        LocalTime.of(18, 0),
                        LocalTime.of(22, 0),
                        60,
                        9000,
                        LocalDate.of(2026, 9, 1),
                        null,
                        Instant.now());
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, spaceId))
                .thenReturn(List.of(existing));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () ->
                                service.createRule(
                                        actorId,
                                        organizationId,
                                        spaceId,
                                        6,
                                        LocalTime.of(20, 0),
                                        LocalTime.of(23, 0),
                                        60,
                                        10000,
                                        LocalDate.of(2026, 9, 1),
                                        null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("superpone");
    }
}
