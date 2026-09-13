package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.reservations.infrastructure.config.ReservationProperties;
import com.pulsopiura.platform.venues.application.SlotNotBookableException;
import com.pulsopiura.platform.venues.application.VenueSlotQuoteQuery;
import java.time.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class CreateReservationServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-04T20:00:00Z");
    private final ReservationStore reservations = mock(ReservationStore.class);
    private final ReservationCreationTransaction transaction =
            mock(ReservationCreationTransaction.class);
    private final VenueSlotQuoteQuery venueSlots = mock(VenueSlotQuoteQuery.class);
    private final UUID customerId = UUID.randomUUID();
    private final UUID organizationId = UUID.randomUUID();
    private final UUID spaceId = UUID.randomUUID();
    private final Instant startsAt = NOW.plusSeconds(3600);
    private final Instant endsAt = NOW.plusSeconds(7200);
    private CreateReservationService service;

    @BeforeEach
    void setUp() {
        service =
                new CreateReservationService(
                        reservations,
                        transaction,
                        venueSlots,
                        new ReservationProperties(Duration.ofMinutes(10), 3),
                        Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void createsHoldUsingServerQuote() {
        when(reservations.findByCustomerAndIdempotencyKey(customerId, "request-1"))
                .thenReturn(Optional.empty());
        when(venueSlots.requireBookableSlot(spaceId, startsAt, endsAt))
                .thenReturn(
                        new VenueSlotQuoteQuery.SlotQuote(
                                organizationId, spaceId, startsAt, endsAt, 9000, "PEN"));
        when(transaction.create(any(), eq(customerId), eq("correlation-1"), eq(NOW)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result =
                service.create(customerId, spaceId, startsAt, endsAt, "request-1", "correlation-1");

        assertThat(result.replayed()).isFalse();
        assertThat(result.reservation().status()).isEqualTo("HOLD");
        assertThat(result.reservation().totalMinor()).isEqualTo(9000);
        assertThat(result.reservation().depositMinor()).isEqualTo(2250);
        assertThat(result.reservation().expiresAt()).isEqualTo(NOW.plusSeconds(600));
    }

    @Test
    void returnsSameReservationForIdempotentReplay() {
        var previous = existingReservation("request-1", startsAt, endsAt);
        when(reservations.findByCustomerAndIdempotencyKey(customerId, "request-1"))
                .thenReturn(Optional.of(previous));

        var result =
                service.create(customerId, spaceId, startsAt, endsAt, "request-1", "correlation-1");

        assertThat(result.replayed()).isTrue();
        assertThat(result.reservation().id()).isEqualTo(previous.id());
        verifyNoInteractions(venueSlots, transaction);
    }

    @Test
    void rejectsReusedKeyWithDifferentPayload() {
        var previous = existingReservation("request-1", startsAt, endsAt);
        when(reservations.findByCustomerAndIdempotencyKey(customerId, "request-1"))
                .thenReturn(Optional.of(previous));

        assertThatThrownBy(
                        () ->
                                service.create(
                                        customerId,
                                        spaceId,
                                        startsAt.plusSeconds(3600),
                                        endsAt.plusSeconds(3600),
                                        "request-1",
                                        null))
                .isInstanceOf(ReservationConflictException.class)
                .hasMessage("Idempotency-Key ya fue utilizada con otra solicitud");
    }

    @Test
    void translatesDatabaseOverlapIntoReservationConflict() {
        when(reservations.findByCustomerAndIdempotencyKey(customerId, "request-1"))
                .thenReturn(Optional.empty());
        when(venueSlots.requireBookableSlot(spaceId, startsAt, endsAt))
                .thenReturn(
                        new VenueSlotQuoteQuery.SlotQuote(
                                organizationId, spaceId, startsAt, endsAt, 9000, "PEN"));
        when(transaction.create(any(), eq(customerId), isNull(), eq(NOW)))
                .thenThrow(new DataIntegrityViolationException("exclusion"));

        assertThatThrownBy(
                        () ->
                                service.create(
                                        customerId, spaceId, startsAt, endsAt, "request-1", null))
                .isInstanceOf(ReservationConflictException.class)
                .hasMessage("La franja ya no está disponible");
    }

    @Test
    void recoversConcurrentIdempotentCreation() {
        var concurrent = existingReservation("request-1", startsAt, endsAt);
        when(reservations.findByCustomerAndIdempotencyKey(customerId, "request-1"))
                .thenReturn(Optional.empty(), Optional.of(concurrent));
        when(venueSlots.requireBookableSlot(spaceId, startsAt, endsAt))
                .thenReturn(
                        new VenueSlotQuoteQuery.SlotQuote(
                                organizationId, spaceId, startsAt, endsAt, 9000, "PEN"));
        when(transaction.create(any(), eq(customerId), isNull(), eq(NOW)))
                .thenThrow(new DataIntegrityViolationException("unique"));

        var result = service.create(customerId, spaceId, startsAt, endsAt, "request-1", null);

        assertThat(result.replayed()).isTrue();
        assertThat(result.reservation().id()).isEqualTo(concurrent.id());
    }

    @Test
    void rejectsPastSlotBeforeQueryingVenue() {
        assertThatThrownBy(
                        () ->
                                service.create(
                                        customerId,
                                        spaceId,
                                        NOW.minusSeconds(60),
                                        NOW.plusSeconds(60),
                                        "request-1",
                                        null))
                .isInstanceOf(SlotNotBookableException.class)
                .hasMessage("No se puede reservar una franja pasada");
        verifyNoInteractions(venueSlots, transaction);
    }

    private Reservation existingReservation(
            String key, Instant existingStartsAt, Instant existingEndsAt) {
        return Reservation.hold(
                organizationId,
                spaceId,
                customerId,
                new ReservationTimeRange(existingStartsAt, existingEndsAt),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(0),
                NOW.plusSeconds(600),
                new ReservationIdempotencyKey(key),
                ReservationRequestFingerprint.calculate(spaceId, existingStartsAt, existingEndsAt),
                NOW);
    }
}
