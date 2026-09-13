package com.pulsopiura.platform.venues.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.organizations.application.OrganizationSettingsQuery;
import com.pulsopiura.platform.venues.domain.VenueStatus;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.time.*;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PublicVenueQueryServiceTest {
    private final VenueRepository venues = mock(VenueRepository.class);
    private final SportSpaceRepository spaces = mock(SportSpaceRepository.class);
    private final AvailabilityRuleRepository rules = mock(AvailabilityRuleRepository.class);
    private final AvailabilityExceptionRepository exceptions =
            mock(AvailabilityExceptionRepository.class);
    private final AmenityService amenities = mock(AmenityService.class);
    private final OrganizationSettingsQuery settings = mock(OrganizationSettingsQuery.class);
    private PublicVenueQueryService service;

    @BeforeEach
    void setUp() {
        service =
                new PublicVenueQueryService(venues, spaces, rules, exceptions, amenities, settings);
    }

    @Test
    void buildsSlotsInOrganizationTimezoneAndAppliesExceptions() {
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var now = Instant.parse("2026-09-04T12:00:00Z");
        var venue =
                VenueEntity.create(
                        organizationId,
                        actorId,
                        "Complejo Norte",
                        "complejo-norte",
                        "Piura",
                        "PIURA",
                        null,
                        null,
                        null,
                        now);
        venue.publish(now);
        var space =
                SportSpaceEntity.create(
                        organizationId,
                        venue.id(),
                        actorId,
                        "Cancha 1",
                        "FOOTBALL",
                        "FOOTBALL_7",
                        14,
                        "SYNTHETIC_GRASS",
                        false,
                        now);
        space.publish(now);
        var date = LocalDate.of(2026, 9, 7);
        var rule =
                AvailabilityRuleEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        1,
                        LocalTime.of(18, 0),
                        LocalTime.of(20, 0),
                        60,
                        9000,
                        date,
                        null,
                        now);
        var closure =
                AvailabilityExceptionEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        Instant.parse("2026-09-07T23:00:00Z"),
                        Instant.parse("2026-09-08T00:00:00Z"),
                        "CLOSED",
                        null,
                        "Mantenimiento",
                        now);
        var specialPrice =
                AvailabilityExceptionEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        Instant.parse("2026-09-08T00:00:00Z"),
                        Instant.parse("2026-09-08T01:00:00Z"),
                        "SPECIAL_PRICE",
                        7000L,
                        null,
                        now);

        when(spaces.findByIdAndStatus(space.id(), VenueStatus.PUBLISHED))
                .thenReturn(Optional.of(space));
        when(venues.findByIdAndOrganizationId(venue.id(), organizationId))
                .thenReturn(Optional.of(venue));
        when(settings.requireActiveTimezone(organizationId)).thenReturn(ZoneId.of("America/Lima"));
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(rule));
        when(exceptions.findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(closure, specialPrice));

        var result = service.availability(space.id(), date);

        assertThat(result.timezone()).isEqualTo("America/Lima");
        assertThat(result.slots()).hasSize(1);
        assertThat(result.slots().getFirst().startsAt())
                .isEqualTo(Instant.parse("2026-09-08T00:00:00Z"));
        assertThat(result.slots().getFirst().priceMinor()).isEqualTo(7000);
        verify(venues).findByIdAndOrganizationId(venue.id(), organizationId);

        var quote =
                service.requireBookableSlot(
                        space.id(),
                        Instant.parse("2026-09-08T00:00:00Z"),
                        Instant.parse("2026-09-08T01:00:00Z"));
        assertThat(quote.organizationId()).isEqualTo(organizationId);
        assertThat(quote.priceMinor()).isEqualTo(7000);
    }

    @Test
    void stopsSlotGenerationAtLateDayBoundaryWithoutWrappingToNextDay() {
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var now = Instant.parse("2026-09-04T12:00:00Z");
        var date = LocalDate.of(2026, 9, 7);
        var venue = publishedVenue(organizationId, actorId, now);
        var space = publishedSpace(organizationId, venue.id(), actorId, now);
        var rule =
                AvailabilityRuleEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        1,
                        LocalTime.of(8, 0),
                        LocalTime.of(23, 0),
                        60,
                        9000,
                        date,
                        null,
                        now);

        when(spaces.findByIdAndStatus(space.id(), VenueStatus.PUBLISHED))
                .thenReturn(Optional.of(space));
        when(venues.findByIdAndOrganizationId(venue.id(), organizationId))
                .thenReturn(Optional.of(venue));
        when(settings.requireActiveTimezone(organizationId)).thenReturn(ZoneId.of("America/Lima"));
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(rule));
        when(exceptions.findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
                        organizationId, space.id()))
                .thenReturn(List.of());

        var result = service.availability(space.id(), date);

        assertThat(result.slots()).hasSize(15);
        assertThat(result.slots().getLast().endsAt())
                .isEqualTo(Instant.parse("2026-09-08T04:00:00Z"));
    }

    @Test
    void quotesMultipleConsecutiveSlotsAsOneReservation() {
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var now = Instant.parse("2026-09-04T12:00:00Z");
        var date = LocalDate.of(2026, 9, 7);
        var venue = publishedVenue(organizationId, actorId, now);
        var space = publishedSpace(organizationId, venue.id(), actorId, now);
        var rule =
                AvailabilityRuleEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        1,
                        LocalTime.of(18, 0),
                        LocalTime.of(21, 0),
                        60,
                        9000,
                        date,
                        null,
                        now);

        when(spaces.findByIdAndStatus(space.id(), VenueStatus.PUBLISHED))
                .thenReturn(Optional.of(space));
        when(venues.findByIdAndOrganizationId(venue.id(), organizationId))
                .thenReturn(Optional.of(venue));
        when(settings.requireActiveTimezone(organizationId)).thenReturn(ZoneId.of("America/Lima"));
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(rule));
        when(exceptions.findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
                        organizationId, space.id()))
                .thenReturn(List.of());

        var quote =
                service.requireBookableSlot(
                        space.id(),
                        Instant.parse("2026-09-07T23:00:00Z"),
                        Instant.parse("2026-09-08T02:00:00Z"));

        assertThat(quote.startsAt()).isEqualTo(Instant.parse("2026-09-07T23:00:00Z"));
        assertThat(quote.endsAt()).isEqualTo(Instant.parse("2026-09-08T02:00:00Z"));
        assertThat(quote.priceMinor()).isEqualTo(27000);
        assertThat(quote.currency()).isEqualTo("PEN");
    }

    @Test
    void excludesVenueWhenEveryTheoreticalSlotIsClosed() {
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var now = Instant.parse("2026-09-04T12:00:00Z");
        var date = LocalDate.of(2026, 9, 7);
        var venue = publishedVenue(organizationId, actorId, now);
        var space = publishedSpace(organizationId, venue.id(), actorId, now);
        var rule =
                AvailabilityRuleEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        1,
                        LocalTime.of(18, 0),
                        LocalTime.of(20, 0),
                        60,
                        9000,
                        date,
                        null,
                        now);
        var closure =
                AvailabilityExceptionEntity.create(
                        organizationId,
                        space.id(),
                        actorId,
                        Instant.parse("2026-09-07T23:00:00Z"),
                        Instant.parse("2026-09-08T01:00:00Z"),
                        "CLOSED",
                        null,
                        null,
                        now);
        when(venues.findAllByStatusOrderByNameAsc(VenueStatus.PUBLISHED))
                .thenReturn(List.of(venue));
        when(spaces.findAllByOrganizationIdAndVenueIdAndStatusOrderByNameAsc(
                        organizationId, venue.id(), VenueStatus.PUBLISHED))
                .thenReturn(List.of(space));
        when(settings.requireActiveTimezone(organizationId)).thenReturn(ZoneId.of("America/Lima"));
        when(rules.findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(rule));
        when(exceptions.findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
                        organizationId, space.id()))
                .thenReturn(List.of(closure));

        var result = service.search("piura", "football", date, 0, 20);

        assertThat(result.items()).isEmpty();
        assertThat(result.total()).isZero();
    }

    @Test
    void doesNotExposeDraftSpaceThroughPublicAvailability() {
        var spaceId = UUID.randomUUID();
        when(spaces.findByIdAndStatus(spaceId, VenueStatus.PUBLISHED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.availability(spaceId, LocalDate.of(2026, 9, 7)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Cancha no encontrada");
    }

    @Test
    void resolvesPublicVenueOnlyWithPublishedStatus() {
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var now = Instant.parse("2026-09-04T12:00:00Z");
        var venue = publishedVenue(organizationId, actorId, now);
        when(venues.findByPublicSlugAndStatus(venue.publicSlug(), VenueStatus.PUBLISHED))
                .thenReturn(Optional.of(venue));
        when(amenities.venueAmenities(organizationId, venue.id())).thenReturn(java.util.Set.of());

        var result = service.getVenue(venue.publicSlug());

        assertThat(result.publicSlug()).isEqualTo(venue.publicSlug());
        verify(venues).findByPublicSlugAndStatus(venue.publicSlug(), VenueStatus.PUBLISHED);
    }

    private VenueEntity publishedVenue(UUID organizationId, UUID actorId, Instant now) {
        var venue =
                VenueEntity.create(
                        organizationId,
                        actorId,
                        "Complejo Norte",
                        "complejo-norte",
                        "Piura",
                        "PIURA",
                        null,
                        null,
                        null,
                        now);
        venue.publish(now);
        return venue;
    }

    private SportSpaceEntity publishedSpace(
            UUID organizationId, UUID venueId, UUID actorId, Instant now) {
        var space =
                SportSpaceEntity.create(
                        organizationId,
                        venueId,
                        actorId,
                        "Cancha 1",
                        "FOOTBALL",
                        "FOOTBALL_7",
                        14,
                        "SYNTHETIC_GRASS",
                        false,
                        now);
        space.publish(now);
        return space;
    }
}
