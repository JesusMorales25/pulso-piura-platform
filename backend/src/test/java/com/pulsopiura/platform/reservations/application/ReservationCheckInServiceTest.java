package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.reservations.application.port.ReservationCheckInDetailsQuery;
import com.pulsopiura.platform.reservations.application.port.ReservationCheckInPassStore;
import com.pulsopiura.platform.reservations.application.port.ReservationHistoryStore;
import com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReservationCheckInServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-10T16:00:00Z");
    private static final String TOKEN = "a".repeat(43);

    private ReservationStore reservations;
    private ReservationCheckInPassStore passes;
    private ReservationCheckInDetailsQuery details;
    private ReservationPaymentQuery payments;
    private ReservationHistoryStore history;
    private OrganizationAuthorization organizations;
    private ReservationCheckInService service;

    @BeforeEach
    void setUp() {
        reservations = mock(ReservationStore.class);
        passes = mock(ReservationCheckInPassStore.class);
        details = mock(ReservationCheckInDetailsQuery.class);
        payments = mock(ReservationPaymentQuery.class);
        history = mock(ReservationHistoryStore.class);
        organizations = mock(OrganizationAuthorization.class);
        service =
                new ReservationCheckInService(
                        reservations,
                        passes,
                        details,
                        payments,
                        history,
                        organizations,
                        Clock.fixed(NOW, ZoneOffset.UTC),
                        () -> TOKEN);
    }

    @Test
    void issuesDifferentOpaquePassWithoutStoringRawToken() {
        var reservation = confirmedReservation();
        when(reservations.findByIdForUpdate(reservation.id())).thenReturn(Optional.of(reservation));

        var result = service.issue(reservation.customerUserId(), reservation.id());

        assertThat(result.payload()).isEqualTo("PULSO-CHECKIN:" + TOKEN);
        verify(passes)
                .issue(
                        eq(reservation.id()),
                        eq(reservation.organizationId()),
                        argThat(hash -> hash.matches("[0-9a-f]{64}")),
                        eq(NOW),
                        eq(reservation.timeRange().endsAt().plusSeconds(12 * 60 * 60)));
        verify(passes, never()).issue(any(), any(), eq(TOKEN), any(), any());
    }

    @Test
    void ownerChecksInAndPaymentBalanceRemainsVisible() {
        var actor = UUID.randomUUID();
        var reservation = confirmedReservation();
        var pass = pass(reservation);
        when(passes.findByTokenHash(any())).thenReturn(Optional.of(pass));
        when(organizations.require(
                        actor, reservation.organizationId(), OrganizationPermission.OPERATE))
                .thenReturn(OrganizationRole.OWNER);
        when(reservations.findByIdForUpdate(reservation.id())).thenReturn(Optional.of(reservation));
        when(reservations.save(reservation)).thenReturn(reservation);
        when(passes.consume(any(), eq(actor), eq(NOW))).thenReturn(true);
        when(details.get(reservation.id()))
                .thenReturn(
                        new ReservationCheckInDetailsQuery.Details(
                                "Arena Piura", "Cancha 1", "Ana", "ana@example.test"));
        when(payments.paidMinor(reservation.id())).thenReturn(2500L);

        var result =
                service.checkIn(
                        actor, reservation.organizationId(), "PULSO-CHECKIN:" + TOKEN, "corr-1");

        assertThat(result.reservationStatus()).isEqualTo("COMPLETED");
        assertThat(result.paymentStatus()).isEqualTo("PARTIAL");
        assertThat(result.balanceMinor()).isEqualTo(7500);
        verify(history).append(argThat(value -> value.reasonCode().equals("CUSTOMER_CHECKED_IN")));
    }

    @Test
    void rejectsPassFromAnotherTenantWithoutLoadingReservation() {
        var actor = UUID.randomUUID();
        var reservation = confirmedReservation();
        when(passes.findByTokenHash(any())).thenReturn(Optional.of(pass(reservation)));

        assertThatThrownBy(
                        () -> service.preview(actor, UUID.randomUUID(), "PULSO-CHECKIN:" + TOKEN))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessage("QR de reserva no válido");
        verifyNoInteractions(organizations);
        verify(reservations, never()).findById(any());
    }

    @Test
    void rejectsOrganizationAdministratorBecauseOnlyOwnerCanCloseReservation() {
        var actor = UUID.randomUUID();
        var reservation = confirmedReservation();
        when(passes.findByTokenHash(any())).thenReturn(Optional.of(pass(reservation)));
        when(organizations.require(
                        actor, reservation.organizationId(), OrganizationPermission.OPERATE))
                .thenReturn(OrganizationRole.ADMIN);

        assertThatThrownBy(
                        () ->
                                service.preview(
                                        actor,
                                        reservation.organizationId(),
                                        "PULSO-CHECKIN:" + TOKEN))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessage("Solo el dueño puede registrar la llegada");
        verify(reservations, never()).findById(any());
    }

    @Test
    void repeatedCheckInReturnsCompletedReservationWithoutAnotherTransition() {
        var actor = UUID.randomUUID();
        var reservation = confirmedReservation();
        reservation.complete(NOW.minusSeconds(1));
        var consumed =
                new ReservationCheckInPassStore.PassRecord(
                        reservation.id(),
                        reservation.organizationId(),
                        reservation.timeRange().endsAt().plusSeconds(12 * 60 * 60),
                        NOW.minusSeconds(1),
                        actor);
        when(passes.findByTokenHash(any())).thenReturn(Optional.of(consumed));
        when(organizations.require(
                        actor, reservation.organizationId(), OrganizationPermission.OPERATE))
                .thenReturn(OrganizationRole.OWNER);
        when(reservations.findByIdForUpdate(reservation.id())).thenReturn(Optional.of(reservation));
        when(details.get(reservation.id()))
                .thenReturn(
                        new ReservationCheckInDetailsQuery.Details(
                                "Arena Piura", "Cancha 1", "Ana", "ana@example.test"));

        var result =
                service.checkIn(
                        actor, reservation.organizationId(), "PULSO-CHECKIN:" + TOKEN, "corr-2");

        assertThat(result.reservationStatus()).isEqualTo("COMPLETED");
        verify(reservations, never()).save(any());
        verify(passes, never()).consume(any(), any(), any());
        verifyNoInteractions(history);
    }

    private ReservationCheckInPassStore.PassRecord pass(Reservation reservation) {
        return new ReservationCheckInPassStore.PassRecord(
                reservation.id(),
                reservation.organizationId(),
                reservation.timeRange().endsAt().plusSeconds(12 * 60 * 60),
                null,
                null);
    }

    private Reservation confirmedReservation() {
        var startsAt = NOW.plusSeconds(3600);
        var endsAt = NOW.plusSeconds(7200);
        var reservation =
                Reservation.hold(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        new ReservationTimeRange(startsAt, endsAt),
                        ReservationMoney.pen(10000),
                        ReservationMoney.pen(2500),
                        NOW.plusSeconds(600),
                        new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                        ReservationRequestFingerprint.calculate(
                                UUID.randomUUID(), startsAt, endsAt),
                        NOW.minusSeconds(60));
        reservation.startPayment(NOW.minusSeconds(30));
        reservation.confirmPaid(NOW);
        return reservation;
    }
}
