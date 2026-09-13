package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.venues.application.PublicVenueViews;
import com.pulsopiura.platform.venues.application.VenueAvailabilityQuery;
import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookableAvailabilityService {
    private final VenueAvailabilityQuery venues;
    private final ReservationStore reservations;
    private final Clock clock;

    @Autowired
    public BookableAvailabilityService(
            VenueAvailabilityQuery venues, ReservationStore reservations) {
        this(venues, reservations, Clock.systemUTC());
    }

    BookableAvailabilityService(
            VenueAvailabilityQuery venues, ReservationStore reservations, Clock clock) {
        this.venues = venues;
        this.reservations = reservations;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PublicVenueViews.Availability availability(UUID sportSpaceId, LocalDate date) {
        var configured = venues.availability(sportSpaceId, date);
        if (configured.slots().isEmpty()) return configured;
        var first = configured.slots().getFirst();
        var last = configured.slots().getLast();
        var now = clock.instant();
        var blocking =
                reservations.findBlocking(sportSpaceId, first.startsAt(), last.endsAt(), now);
        var bookable =
                configured.slots().stream()
                        .filter(slot -> slot.startsAt().isAfter(now))
                        .filter(
                                slot ->
                                        blocking.stream()
                                                .noneMatch(
                                                        reservation ->
                                                                reservation
                                                                                .timeRange()
                                                                                .startsAt()
                                                                                .isBefore(
                                                                                        slot
                                                                                                .endsAt())
                                                                        && reservation
                                                                                .timeRange()
                                                                                .endsAt()
                                                                                .isAfter(
                                                                                        slot
                                                                                                .startsAt())))
                        .toList();
        return new PublicVenueViews.Availability(
                configured.sportSpaceId(), configured.timezone(), configured.date(), bookable);
    }
}
