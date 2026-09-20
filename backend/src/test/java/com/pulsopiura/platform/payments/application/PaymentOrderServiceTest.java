package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.payments.application.port.PaymentProviderPort;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PaymentOrderServiceTest {
    private final PaymentOrderRepository orders = mock(PaymentOrderRepository.class);
    private final ReservationQueryService reservations = mock(ReservationQueryService.class);
    private final ReservationTransitionService transitions =
            mock(ReservationTransitionService.class);
    private final PaymentProviderPort provider = mock(PaymentProviderPort.class);
    private final PaymentAuditStore audit = mock(PaymentAuditStore.class);
    private final PaymentOrderService service =
            new PaymentOrderService(orders, reservations, transitions, provider, audit);
    private final UUID actor = UUID.randomUUID(), reservationId = UUID.randomUUID();

    private ReservationView view(String status, long total) {
        return new ReservationView(
                reservationId,
                UUID.randomUUID(),
                Instant.now().plusSeconds(86400),
                Instant.now().plusSeconds(90000),
                status,
                total,
                (total + 3) / 4,
                "PEN",
                Instant.now().plusSeconds(600),
                0,
                0,
                null,
                null,
                null,
                false);
    }

    private void enable(String status, long total) {
        when(provider.simulationEnabled()).thenReturn(true);
        when(reservations.lockCustomer(actor, reservationId)).thenReturn(view(status, total));
        when(orders.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }

    private PaymentOrderEntity order(PaymentPlan plan, long amount) {
        var order =
                PaymentOrderEntity.create(
                        reservationId,
                        actor,
                        amount,
                        PaymentMethod.YAPE,
                        plan,
                        UUID.randomUUID().toString(),
                        Instant.now());
        when(orders.reservationIdForOrder(order.id())).thenReturn(Optional.of(reservationId));
        when(orders.findById(order.id())).thenReturn(Optional.of(order));
        return order;
    }

    @Test
    void disabledModeNeverCreatesOrSimulatesPayment() {
        assertThatThrownBy(
                        () ->
                                service.create(
                                        actor,
                                        reservationId,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "test-key-123",
                                        "disabled"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.simulate(actor, UUID.randomUUID(), "disabled"))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(orders, reservations, transitions, audit);
        verify(provider, never()).simulateConfirmedPayment(any());
    }

    @Test
    void depositIsRoundedUpToCentAndCalculatedOnServer() {
        enable("HOLD", 9001);
        when(transitions.startPayment(actor, reservationId, "deposit"))
                .thenReturn(view("PENDING_PAYMENT", 9001));
        var result =
                service.create(
                        actor,
                        reservationId,
                        PaymentMethod.PLIN,
                        PaymentPlan.DEPOSIT,
                        "deposit-key-123",
                        "deposit");
        assertThat(result.amountMinor()).isEqualTo(2251);
        assertThat(result.status()).isEqualTo("PENDING");
        verify(provider, never()).simulateConfirmedPayment(any());
    }

    @Test
    void fullPaymentUsesTotal() {
        enable("HOLD", 9001);
        when(transitions.startPayment(actor, reservationId, "full"))
                .thenReturn(view("PENDING_PAYMENT", 9001));
        assertThat(
                        service.create(
                                        actor,
                                        reservationId,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "full-key-123",
                                        "full")
                                .amountMinor())
                .isEqualTo(9001);
    }

    @Test
    void balanceUsesPreviouslyPaidAmount() {
        enable("CONFIRMED", 9001);
        when(orders.sumPaid(reservationId)).thenReturn(2251L);
        assertThat(
                        service.create(
                                        actor,
                                        reservationId,
                                        PaymentMethod.PLIN,
                                        PaymentPlan.BALANCE,
                                        "balance-key-123",
                                        "balance")
                                .amountMinor())
                .isEqualTo(6750);
        verifyNoInteractions(transitions);
    }

    @Test
    void expiredHoldNeverReachesPaymentProvider() {
        enable("PENDING_PAYMENT", 9000);
        var order = order(PaymentPlan.DEPOSIT, 2250);
        when(transitions.confirmPaid(actor, reservationId, "expired"))
                .thenReturn(view("EXPIRED", 9000));
        assertThatThrownBy(() -> service.simulate(actor, order.id(), "expired"))
                .isInstanceOf(ReservationConflictException.class);
        assertThat(order.status()).isEqualTo("PENDING");
        verify(provider, never()).simulateConfirmedPayment(any());
        verifyNoInteractions(audit);
    }

    @Test
    void paymentRetryDoesNotChargeOrAuditTwice() {
        enable("PENDING_PAYMENT", 9000);
        var order = order(PaymentPlan.DEPOSIT, 2250);
        when(transitions.confirmPaid(actor, reservationId, "paid"))
                .thenReturn(view("CONFIRMED", 9000));
        when(provider.simulateConfirmedPayment(order.id())).thenReturn("SIM-test");
        assertThat(service.simulate(actor, order.id(), "paid").status()).isEqualTo("PAID");
        assertThat(service.simulate(actor, order.id(), "retry").status()).isEqualTo("PAID");
        verify(provider, times(1)).simulateConfirmedPayment(order.id());
        verify(audit, times(1))
                .append(eq(order.id()), eq("PENDING"), eq("PAID"), eq(actor), any(), any());
        var sequence = inOrder(reservations, transitions, provider);
        sequence.verify(reservations).lockCustomer(actor, reservationId);
        sequence.verify(transitions).confirmPaid(actor, reservationId, "paid");
        sequence.verify(provider).simulateConfirmedPayment(order.id());
    }

    @Test
    void cancelledBalanceCannotBePaid() {
        enable("CANCELLED", 9000);
        var order = order(PaymentPlan.BALANCE, 6750);
        assertThatThrownBy(() -> service.simulate(actor, order.id(), "cancelled"))
                .isInstanceOf(ReservationConflictException.class);
        verify(provider, never()).simulateConfirmedPayment(any());
    }

    @Test
    void idempotentCreateReturnsSameOrder() {
        enable("PENDING_PAYMENT", 9000);
        var order = order(PaymentPlan.FULL, 9000);
        when(orders.findByPayerUserIdAndIdempotencyKey(actor, "same-key-123"))
                .thenReturn(Optional.of(order));
        assertThat(
                        service.create(
                                        actor,
                                        reservationId,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "same-key-123",
                                        "retry")
                                .id())
                .isEqualTo(order.id());
        verify(orders, never()).saveAndFlush(any());
        assertThatThrownBy(
                        () ->
                                service.create(
                                        actor,
                                        reservationId,
                                        PaymentMethod.PLIN,
                                        PaymentPlan.FULL,
                                        "same-key-123",
                                        "changed"))
                .isInstanceOf(ReservationConflictException.class);
    }

    @Test
    void wrongCustomerCannotReachProvider() {
        enable("PENDING_PAYMENT", 9000);
        var order = order(PaymentPlan.FULL, 9000);
        when(reservations.lockCustomer(actor, reservationId))
                .thenThrow(
                        new org.springframework.security.access.AccessDeniedException("Forbidden"));
        assertThatThrownBy(() -> service.simulate(actor, order.id(), "other"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(provider, never()).simulateConfirmedPayment(any());
    }
}
