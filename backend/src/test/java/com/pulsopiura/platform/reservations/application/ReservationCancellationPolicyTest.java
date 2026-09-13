package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.*;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class ReservationCancellationPolicyTest {
    private final Instant now = Instant.parse("2026-09-07T15:00:00Z");
    private final UUID customer = UUID.randomUUID();
    private final ReservationStore store = mock(ReservationStore.class);
    private final ReservationHistoryStore history = mock(ReservationHistoryStore.class);
    private final ReservationAccess access = mock(ReservationAccess.class);
    private final ReservationPaymentQuery payments = mock(ReservationPaymentQuery.class);
    private final ReservationTransitionService service =
            new ReservationTransitionService(
                    store, history, access, payments, Clock.fixed(now, ZoneOffset.UTC));

    private Reservation reservation(long secondsUntilStart, long paid) {
        var space = UUID.randomUUID();
        var start = now.plusSeconds(secondsUntilStart);
        var value =
                Reservation.hold(
                        UUID.randomUUID(),
                        space,
                        customer,
                        new ReservationTimeRange(start, start.plusSeconds(3600)),
                        ReservationMoney.pen(9000),
                        ReservationMoney.pen(2250),
                        now.plusSeconds(600),
                        new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                        ReservationRequestFingerprint.calculate(
                                space, start, start.plusSeconds(3600)),
                        now.minusSeconds(1));
        if (paid > 0) {
            value.startPayment(now);
            value.confirmPaid(now);
        }
        when(store.findByIdForUpdate(value.id())).thenReturn(Optional.of(value));
        when(store.save(any())).thenAnswer(call -> call.getArgument(0));
        when(payments.paidMinor(value.id())).thenReturn(paid);
        return value;
    }

    @Test
    void playerCanCancelExactlyTwoHoursBeforeAndRetainsPayment() {
        var value = reservation(7200, 2250);
        var result = service.cancel(customer, value.id(), "cancel-boundary");
        assertThat(result.status()).isEqualTo("CANCELLED");
        assertThat(result.paidMinor()).isEqualTo(2250);
        verify(history).append(any());
    }

    @Test
    void playerCannotCancelOneSecondAfterDeadline() {
        var value = reservation(7199, 2250);
        assertThatThrownBy(() -> service.cancel(customer, value.id(), "late"))
                .isInstanceOf(ReservationConflictException.class);
        verify(store, never()).save(any());
        verifyNoInteractions(history);
    }

    @Test
    void ownerCannotCancelAnyPaidReservation() {
        var value = reservation(600, 2250);
        var owner = UUID.randomUUID();
        assertThatThrownBy(
                        () ->
                                service.cancelForOwner(
                                        owner, value.organizationId(), value.id(), "owner-paid"))
                .isInstanceOf(ReservationConflictException.class);
        verify(access).requireOwner(owner, value);
        verify(store, never()).save(any());
    }

    @Test
    void ownerCanCancelUnpaidWithinTwoHoursEvenWhenAlsoCustomer() {
        var value = reservation(600, 0);
        assertThat(
                        service.cancelForOwner(
                                        customer, value.organizationId(), value.id(), "owner-self")
                                .status())
                .isEqualTo("CANCELLED");
        verify(access, atLeastOnce()).requireOwner(customer, value);
    }

    @Test
    void cannotUseDifferentOrganizationToCancel() {
        var value = reservation(600, 0);
        assertThatThrownBy(
                        () ->
                                service.cancelForOwner(
                                        UUID.randomUUID(), UUID.randomUUID(), value.id(), "tenant"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(store, never()).save(any());
    }

    @Test
    void repeatedPlayerCancellationDoesNotWriteHistoryAgain() {
        var value = reservation(7200, 9000);
        service.cancel(customer, value.id(), "first");
        service.cancel(customer, value.id(), "retry");
        verify(history, times(1)).append(any());
    }
}
