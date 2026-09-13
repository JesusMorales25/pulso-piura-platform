package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.application.port.ReservationHistoryStore;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.Reservation;
import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import com.pulsopiura.platform.reservations.domain.ReservationStatusTransition;
import com.pulsopiura.platform.reservations.domain.ReservationTransitionActor;
import java.time.Clock;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationTransitionService {
    private final ReservationStore reservations;
    private final ReservationHistoryStore history;
    private final ReservationAccess access;
    private final Clock clock;
    private final com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery
            payments;

    @Autowired
    public ReservationTransitionService(
            ReservationStore reservations,
            ReservationHistoryStore history,
            ReservationAccess access,
            com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery
                    payments) {
        this(reservations, history, access, payments, Clock.systemUTC());
    }

    ReservationTransitionService(
            ReservationStore reservations,
            ReservationHistoryStore history,
            ReservationAccess access,
            com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery payments,
            Clock clock) {
        this.reservations = reservations;
        this.history = history;
        this.access = access;
        this.clock = clock;
        this.payments = payments;
    }

    @Transactional
    public ReservationView confirm(UUID actor, UUID reservationId, String correlationId) {
        var reservation = lock(reservationId);
        access.requireManage(actor, reservation);
        var now = clock.instant();
        var expired = expireIfNecessary(reservation, correlationId, now);
        if (expired != null) return ReservationView.from(expired);
        if (reservation.status() == ReservationStatus.EXPIRED) {
            return ReservationView.from(reservation)
                    .withPayment(payments.paidMinor(reservation.id()));
        }
        var previous = reservation.status();
        if (reservation.confirmWithoutPayment(now)) {
            reservation =
                    saveTransition(
                            reservation,
                            previous,
                            ReservationTransitionActor.USER,
                            actor,
                            "RESERVATION_CONFIRMED",
                            correlationId,
                            now);
        }
        return ReservationView.from(reservation).withPayment(payments.paidMinor(reservation.id()));
    }

    @Transactional
    public ReservationView startPayment(UUID actor, UUID reservationId, String correlationId) {
        var reservation = lock(reservationId);
        access.requireManage(actor, reservation);
        var now = clock.instant();
        var expired = expireIfNecessary(reservation, correlationId, now);
        if (expired != null) return ReservationView.from(expired);
        var previous = reservation.status();
        if (reservation.startPayment(now)) {
            reservation =
                    saveTransition(
                            reservation,
                            previous,
                            ReservationTransitionActor.USER,
                            actor,
                            "RESERVATION_PAYMENT_STARTED",
                            correlationId,
                            now);
        }
        return ReservationView.from(reservation).withPayment(payments.paidMinor(reservation.id()));
    }

    @Transactional
    public ReservationView confirmPaid(UUID actor, UUID reservationId, String correlationId) {
        var reservation = lock(reservationId);
        access.requireManage(actor, reservation);
        var now = clock.instant();
        var expired = expireIfNecessary(reservation, correlationId, now);
        if (expired != null) return ReservationView.from(expired);
        if (reservation.status() == ReservationStatus.EXPIRED) {
            return ReservationView.from(reservation)
                    .withPayment(payments.paidMinor(reservation.id()));
        }
        var previous = reservation.status();
        if (reservation.confirmPaid(now)) {
            reservation =
                    saveTransition(
                            reservation,
                            previous,
                            ReservationTransitionActor.SYSTEM,
                            null,
                            "PAYMENT_CONFIRMED",
                            correlationId,
                            now);
        }
        return ReservationView.from(reservation).withPayment(payments.paidMinor(reservation.id()));
    }

    @Transactional
    public ReservationView cancel(UUID actor, UUID reservationId, String correlationId) {
        return cancel(actor, reservationId, correlationId, null);
    }

    @Transactional
    public ReservationView cancelForOwner(
            UUID actor, UUID organizationId, UUID reservationId, String correlationId) {
        return cancel(actor, reservationId, correlationId, organizationId);
    }

    private ReservationView cancel(
            UUID actor, UUID reservationId, String correlationId, UUID organizationId) {
        var reservation = lock(reservationId);
        access.requireManage(actor, reservation);
        if (organizationId != null) {
            if (!organizationId.equals(reservation.organizationId()))
                throw new org.springframework.security.access.AccessDeniedException(
                        "La reserva no pertenece a este complejo");
            access.requireOwner(actor, reservation);
        }
        var now = clock.instant();
        var expired = expireIfNecessary(reservation, correlationId, now);
        if (expired != null) return ReservationView.from(expired);
        var previous = reservation.status();
        if (reservation.status() != ReservationStatus.CANCELLED) {
            if (organizationId == null && reservation.customerUserId().equals(actor)) {
                if (now.isAfter(reservation.timeRange().startsAt().minusSeconds(7200))) {
                    throw new ReservationConflictException(
                            "Solo puedes cancelar hasta 2 horas antes del horario reservado. No hay devoluciones.");
                }
            } else {
                if (organizationId == null) access.requireOwner(actor, reservation);
                if (payments.paidMinor(reservation.id()) > 0) {
                    throw new ReservationConflictException(
                            "El dueño no puede cancelar una reserva que ya tiene pagos registrados.");
                }
            }
        }
        if (reservation.cancel(now)) {
            reservation =
                    saveTransition(
                            reservation,
                            previous,
                            ReservationTransitionActor.USER,
                            actor,
                            "RESERVATION_CANCELLED",
                            correlationId,
                            now);
        }
        return ReservationView.from(reservation).withPayment(payments.paidMinor(reservation.id()));
    }

    private Reservation lock(UUID reservationId) {
        return reservations
                .findByIdForUpdate(reservationId)
                .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
    }

    private Reservation expireIfNecessary(
            Reservation reservation, String correlationId, Instant now) {
        var previous = reservation.status();
        if (!reservation.expire(now)) return null;
        return saveTransition(
                reservation,
                previous,
                ReservationTransitionActor.SYSTEM,
                null,
                "HOLD_EXPIRED",
                correlationId,
                now);
    }

    private Reservation saveTransition(
            Reservation reservation,
            ReservationStatus previous,
            ReservationTransitionActor actorType,
            UUID actorUserId,
            String reason,
            String correlationId,
            Instant now) {
        var saved = reservations.save(reservation);
        history.append(
                new ReservationStatusTransition(
                        saved.organizationId(),
                        saved.id(),
                        previous,
                        saved.status(),
                        actorType,
                        actorUserId,
                        reason,
                        correlationId,
                        now));
        return saved;
    }
}
