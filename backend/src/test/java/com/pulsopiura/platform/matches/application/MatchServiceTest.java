package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.venues.application.VenueSpaceQuery;
import java.time.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class MatchServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-20T15:00:00Z");
    private final MatchStore matches = mock(MatchStore.class);
    private final ReservationStore reservations = mock(ReservationStore.class);
    private final VenueSpaceQuery spaces = mock(VenueSpaceQuery.class);
    private final MatchParticipantStore participants = mock(MatchParticipantStore.class);
    private final MatchParticipantPreviewService participantPreviews =
            mock(MatchParticipantPreviewService.class);
    private final MatchDetailMetadataService detailMetadata =
            mock(MatchDetailMetadataService.class);
    private final MatchAccessPolicy accessPolicy = mock(MatchAccessPolicy.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private MatchService service;

    @BeforeEach
    void setUp() {
        service =
                new MatchService(
                        matches,
                        reservations,
                        spaces,
                        participants,
                        participantPreviews,
                        detailMetadata,
                        accessPolicy,
                        events,
                        Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void rejectsAnUpcomingPublishedMatchWithTheSameNormalizedNameBeforeUsingTheReservation() {
        var actorId = UUID.randomUUID();
        var reservation = confirmedReservation(actorId);
        when(reservations.findById(reservation.id())).thenReturn(Optional.of(reservation));
        when(matches.existsPublishedUpcomingByTitle("La Promo Se Une", NOW)).thenReturn(true);

        var command =
                new MatchService.CreateCommand(
                        reservation.id(),
                        "  La   Promo Se Une  ",
                        "INTERMEDIATE",
                        8,
                        10,
                        true,
                        1500,
                        "PUBLIC",
                        "El pago confirma el cupo.");

        assertThatThrownBy(() -> service.createDraft(actorId, command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage(
                        "Ya existe una pichanga activa con ese nombre. Usa un nombre diferente.");

        verify(matches, never()).existsByReservationId(reservation.id());
        verify(matches, never()).save(any());
        verifyNoInteractions(spaces, participants, participantPreviews, detailMetadata, events);
    }

    private Reservation confirmedReservation(UUID actorId) {
        var organizationId = UUID.randomUUID();
        var spaceId = UUID.randomUUID();
        var startsAt = NOW.plus(Duration.ofDays(1));
        var endsAt = startsAt.plus(Duration.ofHours(1));
        var reservation =
                Reservation.hold(
                        organizationId,
                        spaceId,
                        actorId,
                        new ReservationTimeRange(startsAt, endsAt),
                        ReservationMoney.pen(9000),
                        ReservationMoney.pen(0),
                        NOW.plus(Duration.ofMinutes(5)),
                        new ReservationIdempotencyKey("match-service-test"),
                        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                        NOW);
        reservation.confirmWithoutPayment(NOW.plusSeconds(1));
        return reservation;
    }
}
