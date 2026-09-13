package com.pulsopiura.platform.payments.application;

import com.pulsopiura.platform.payments.application.port.PaymentProviderPort;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.*;
import com.pulsopiura.platform.reservations.domain.ReservationIdempotencyKey;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentOrderService {
    private final PaymentOrderRepository orders;
    private final ReservationQueryService reservations;
    private final ReservationTransitionService transitions;
    private final PaymentProviderPort provider;
    private final PaymentAuditStore audit;

    public PaymentOrderService(
            PaymentOrderRepository orders,
            ReservationQueryService reservations,
            ReservationTransitionService transitions,
            PaymentProviderPort provider,
            PaymentAuditStore audit) {
        this.orders = orders;
        this.reservations = reservations;
        this.transitions = transitions;
        this.provider = provider;
        this.audit = audit;
    }

    public boolean simulationEnabled() {
        return provider.simulationEnabled();
    }

    @Transactional
    public PaymentOrderView create(
            UUID actor,
            UUID reservationId,
            PaymentMethod method,
            PaymentPlan plan,
            String rawKey,
            String correlationId) {
        if (!provider.simulationEnabled())
            throw new IllegalStateException(
                    "Los pagos están deshabilitados hasta configurar un proveedor. No se realizará ningún cobro.");
        var key = new ReservationIdempotencyKey(rawKey).value();
        var reservation = reservations.lockCustomer(actor, reservationId);
        var replay = orders.findByPayerUserIdAndIdempotencyKey(actor, key);
        if (replay.isPresent()) return replay(replay.get(), reservationId, method, plan);
        var installment = plan == PaymentPlan.BALANCE ? "BALANCE" : "INITIAL";
        var existing = orders.findByReservationIdAndInstallment(reservationId, installment);
        if (existing.isPresent()) return replay(existing.get(), reservationId, method, plan);
        long paid = orders.sumPaid(reservationId);
        long amount;
        if (plan == PaymentPlan.BALANCE) {
            if (!"CONFIRMED".equals(reservation.status())
                    || paid <= 0
                    || paid >= reservation.totalMinor())
                throw new ReservationConflictException(
                        "Esta reserva no tiene saldo pendiente de pago");
            amount = reservation.totalMinor() - paid;
        } else {
            if (paid > 0) throw new ReservationConflictException("El adelanto ya fue pagado");
            var locked = transitions.startPayment(actor, reservationId, correlationId);
            if (!"PENDING_PAYMENT".equals(locked.status()))
                throw new ReservationConflictException(
                        "El horario venció. No se ha procesado el pago.");
            amount =
                    plan == PaymentPlan.DEPOSIT
                            ? reservation.totalMinor() / 4
                                    + (reservation.totalMinor() % 4 == 0 ? 0 : 1)
                            : reservation.totalMinor();
        }
        var now = Instant.now();
        var order =
                orders.saveAndFlush(
                        PaymentOrderEntity.create(
                                reservationId, actor, amount, method, plan, key, now));
        audit.append(order.id(), null, "PENDING", actor, correlationId, now);
        return view(order);
    }

    @Transactional(readOnly = true)
    public List<PaymentOrderView> list(UUID actor, UUID reservationId) {
        reservations.requireCustomer(actor, reservationId);
        return orders.findAllByReservationIdOrderByCreatedAtAsc(reservationId).stream()
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentOrderView get(UUID actor, UUID orderId) {
        var order =
                orders.findById(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Orden no encontrada"));
        requirePayer(actor, order);
        return view(order);
    }

    @Transactional
    public PaymentOrderView simulate(UUID actor, UUID orderId, String correlationId) {
        if (!provider.simulationEnabled())
            throw new IllegalStateException("El modo de pruebas está deshabilitado");
        // All writes take the reservation lock first: payment vs payment and payment vs
        // cancellation.
        var reservationId =
                orders.reservationIdForOrder(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Orden no encontrada"));
        var reservation = reservations.lockCustomer(actor, reservationId);
        var order =
                orders.findById(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Orden no encontrada"));
        requirePayer(actor, order);
        if ("PAID".equals(order.status())) return view(order);
        if (order.plan() == PaymentPlan.BALANCE) {
            if (!"CONFIRMED".equals(reservation.status()))
                throw new ReservationConflictException("La reserva ya no admite pagos");
        } else {
            var confirmed = transitions.confirmPaid(actor, reservationId, correlationId);
            if (!"CONFIRMED".equals(confirmed.status()))
                throw new ReservationConflictException(
                        "La reserva venció. No se ha procesado el pago.");
        }
        var paid = orders.sumPaid(reservationId);
        if (order.amountMinor() > reservation.totalMinor() - paid)
            throw new ReservationConflictException("El importe excede el saldo pendiente");
        var reference = provider.simulateConfirmedPayment(order.id());
        var now = Instant.now();
        order.markPaid(reference, now);
        orders.saveAndFlush(order);
        audit.append(order.id(), "PENDING", "PAID", actor, correlationId, now);
        return view(order);
    }

    private PaymentOrderView replay(
            PaymentOrderEntity order, UUID reservation, PaymentMethod method, PaymentPlan plan) {
        if (!order.reservationId().equals(reservation)
                || order.method() != method
                || order.plan() != plan)
            throw new ReservationConflictException(
                    "Ya existe una orden con otra selección. Retoma el pago original.");
        return view(order);
    }

    private void requirePayer(UUID actor, PaymentOrderEntity order) {
        if (!order.payerUserId().equals(actor))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Sin acceso a la orden");
    }

    private PaymentOrderView view(PaymentOrderEntity order) {
        return new PaymentOrderView(
                order.id(),
                order.reservationId(),
                order.amountMinor(),
                "PEN",
                order.method().name(),
                order.plan().name(),
                order.status(),
                order.providerReference(),
                order.paidAt(),
                true);
    }

    public record PaymentOrderView(
            UUID id,
            UUID reservationId,
            long amountMinor,
            String currency,
            String method,
            String plan,
            String status,
            String providerReference,
            Instant paidAt,
            boolean simulated) {}
}
