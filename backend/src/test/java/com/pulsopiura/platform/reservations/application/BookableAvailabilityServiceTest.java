package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.venues.application.PublicVenueViews;
import com.pulsopiura.platform.venues.application.VenueAvailabilityQuery;
import java.time.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BookableAvailabilityServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-05T15:00:00Z");

    @Test
    void removesOnlySlotsOverlappingBlockingReservations() {
        var venues = mock(VenueAvailabilityQuery.class);
        var reservations = mock(ReservationStore.class);
        var space = UUID.randomUUID();
        var date = LocalDate.of(2026, 9, 6);
        var first = slot("2026-09-06T14:00:00Z", "2026-09-06T15:00:00Z");
        var second = slot("2026-09-06T15:00:00Z", "2026-09-06T16:00:00Z");
        when(venues.availability(space, date))
                .thenReturn(
                        new PublicVenueViews.Availability(
                                space, "America/Lima", date.toString(), List.of(first, second)));
        when(reservations.findBlocking(space, first.startsAt(), second.endsAt(), NOW))
                .thenReturn(List.of(hold(space, first.startsAt(), first.endsAt())));
        var service =
                new BookableAvailabilityService(
                        venues, reservations, Clock.fixed(NOW, ZoneOffset.UTC));

        var result = service.availability(space, date);

        assertThat(result.slots()).containsExactly(second);
    }

    @Test
    void removesPastSlotsEvenWhenTheyAreConfigured() {
        var venues = mock(VenueAvailabilityQuery.class);
        var reservations = mock(ReservationStore.class);
        var space = UUID.randomUUID();
        var date = LocalDate.of(2026, 9, 5);
        var past = slot("2026-09-05T14:00:00Z", "2026-09-05T15:00:00Z");
        var future = slot("2026-09-05T16:00:00Z", "2026-09-05T17:00:00Z");
        when(venues.availability(space, date))
                .thenReturn(
                        new PublicVenueViews.Availability(
                                space, "America/Lima", date.toString(), List.of(past, future)));
        when(reservations.findBlocking(space, past.startsAt(), future.endsAt(), NOW))
                .thenReturn(List.of());
        var service =
                new BookableAvailabilityService(
                        venues, reservations, Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(service.availability(space, date).slots()).containsExactly(future);
    }

    private PublicVenueViews.Slot slot(String startsAt, String endsAt) {
        return new PublicVenueViews.Slot(
                Instant.parse(startsAt), Instant.parse(endsAt), 9000, "PEN");
    }

    private Reservation hold(UUID space, Instant startsAt, Instant endsAt) {
        return Reservation.hold(
                UUID.randomUUID(),
                space,
                UUID.randomUUID(),
                new ReservationTimeRange(startsAt, endsAt),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(0),
                NOW.plusSeconds(600),
                new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                ReservationRequestFingerprint.calculate(space, startsAt, endsAt),
                NOW);
    }
}
