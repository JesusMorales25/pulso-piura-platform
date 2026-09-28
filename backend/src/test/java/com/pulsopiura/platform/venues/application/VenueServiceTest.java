package com.pulsopiura.platform.venues.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class VenueServiceTest {
    @Mock VenueRepository venues;
    @Mock SportSpaceRepository spaces;
    @Mock OrganizationAuthorization authorization;
    @Mock VenueCatalogService catalogs;
    @Mock AmenityService amenities;
    @Mock ApplicationEventPublisher events;
    final Instant now = Instant.parse("2026-09-27T20:00:00Z");
    VenueService service;

    @BeforeEach
    void setup() {
        service =
                new VenueService(
                        venues,
                        spaces,
                        authorization,
                        catalogs,
                        amenities,
                        events,
                        Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void ownerUpdatesAdminRatingForCurrentOrganization() {
        var actor = UUID.randomUUID();
        var organization = UUID.randomUUID();
        var venue = venue(organization, actor);
        when(venues.findByIdAndOrganizationId(venue.id(), organization))
                .thenReturn(Optional.of(venue));
        when(catalogs.requireVenueAmenities(Set.of())).thenReturn(Set.of());
        when(venues.saveAndFlush(venue)).thenReturn(venue);
        when(amenities.venueAmenities(organization, venue.id())).thenReturn(Set.of());

        var result =
                service.updateVenue(
                        actor,
                        organization,
                        venue.id(),
                        venue.name(),
                        venue.address(),
                        venue.districtCode(),
                        null,
                        null,
                        null,
                        new BigDecimal("4.9"),
                        142,
                        Set.of(),
                        venue.version());

        assertThat(result.adminRating()).isEqualByComparingTo("4.9");
        assertThat(result.adminRatingCount()).isEqualTo(142);
        verify(authorization)
                .require(actor, organization, OrganizationPermission.MANAGE_ORGANIZATION);
    }

    @Test
    void anotherTenantCannotUpdateAdminRating() {
        var actor = UUID.randomUUID();
        var foreignOrganization = UUID.randomUUID();
        doThrow(new AccessDeniedException("Sin acceso"))
                .when(authorization)
                .require(actor, foreignOrganization, OrganizationPermission.MANAGE_ORGANIZATION);

        assertThatThrownBy(
                        () ->
                                service.updateVenue(
                                        actor,
                                        foreignOrganization,
                                        UUID.randomUUID(),
                                        "Complejo",
                                        "Dirección",
                                        "PIURA",
                                        null,
                                        null,
                                        null,
                                        new BigDecimal("4.8"),
                                        20,
                                        Set.of(),
                                        0))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(venues, catalogs, amenities);
    }

    private VenueEntity venue(UUID organization, UUID actor) {
        return VenueEntity.create(
                organization,
                actor,
                "Complejo Norte",
                "complejo-norte",
                "Av. Grau 100",
                "PIURA",
                null,
                null,
                null,
                now);
    }
}
