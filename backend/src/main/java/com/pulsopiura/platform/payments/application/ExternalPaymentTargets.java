package com.pulsopiura.platform.payments.application;

import com.pulsopiura.platform.matches.application.*;
import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.*;
import com.pulsopiura.platform.reservations.application.port.*;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/** Resolves tenant authorization and coordinates the existing locked business aggregates. */
@Component
public class ExternalPaymentTargets {
    private final MatchStore matches;
    private final MatchAccessPolicy matchAccess;
    private final ExternalMatchPaymentService matchPayments;
    private final ReservationStore reservations;
    private final ReservationHistoryStore history;
    private final ReservationTransitionService transitions;
    private final PaymentOrderRepository payments;
    private final PaymentAuditStore paymentAudit;
    private final OrganizationAuthorization organizations;

    public ExternalPaymentTargets(
            MatchStore matches,
            MatchAccessPolicy matchAccess,
            ExternalMatchPaymentService matchPayments,
            ReservationStore reservations,
            ReservationHistoryStore history,
            ReservationTransitionService transitions,
            PaymentOrderRepository payments,
            PaymentAuditStore paymentAudit,
            OrganizationAuthorization organizations) {
        this.matches = matches;
        this.matchAccess = matchAccess;
        this.matchPayments = matchPayments;
        this.reservations = reservations;
        this.history = history;
        this.transitions = transitions;
        this.payments = payments;
        this.paymentAudit = paymentAudit;
        this.organizations = organizations;
    }

    public record Context(
            TargetType type,
            UUID id,
            UUID receiverId,
            SportsMatch match,
            Reservation reservation) {}

    public record Hold(long amountMinor, Instant expiresAt, UUID ledgerOrderId) {}

    public Context resolve(TargetType type, UUID id, UUID actor, boolean lock) {
        if (type == TargetType.MATCH) {
            var m =
                    (lock ? matches.findByIdForUpdate(id) : matches.findById(id))
                            .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
            matchAccess.requireCanAccess(m, actor);
            return new Context(type, id, id, m, null);
        }
        var r =
                (lock ? reservations.findByIdForUpdate(id) : reservations.findById(id))
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        var c = new Context(type, id, r.organizationId(), null, r);
        if (!r.customerUserId().equals(actor) && !reviewer(c, actor))
            throw new AccessDeniedException("Sin acceso a la reserva");
        return c;
    }

    public boolean reviewer(Context c, UUID actor) {
        if (c.type() == TargetType.MATCH) return c.match().organizerUserId().equals(actor);
        try {
            return organizations.require(actor, c.receiverId(), OrganizationPermission.VIEW)
                    == OrganizationRole.OWNER;
        } catch (AccessDeniedException denied) {
            return false;
        }
    }

    public Context resolveOwnEvidence(Proof proof, UUID actor, boolean lock) {
        if (!proof.payerUserId().equals(actor))
            throw new AccessDeniedException("Sin acceso al comprobante");
        if (proof.targetType() != TargetType.MATCH)
            return resolve(proof.targetType(), proof.targetId(), actor, lock);
        var match =
                (lock
                                ? matches.findByIdForUpdate(proof.targetId())
                                : matches.findById(proof.targetId()))
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        // A revoked invitation must not revoke access to the payer's existing money evidence.
        return new Context(TargetType.MATCH, match.id(), match.id(), match, null);
    }

    public void requireReviewer(Context c, UUID actor) {
        if (!reviewer(c, actor))
            throw new AccessDeniedException("Solo el receptor puede revisar comprobantes");
    }

    public Hold hold(
            Context c,
            UUID actor,
            PaymentMethod method,
            PaymentPlan plan,
            String key,
            Instant now,
            Instant deadline) {
        if (c.type() == TargetType.MATCH) {
            var hold = matchPayments.hold(c.match(), actor, method, plan, key, now, deadline);
            return new Hold(hold.amountMinor(), hold.expiresAt(), hold.ledgerOrderId());
        }
        var r = c.reservation();
        if (!r.customerUserId().equals(actor))
            throw new AccessDeniedException("Solo el cliente puede adjuntar el pago");
        if (!now.isBefore(r.timeRange().startsAt())) throw conflict("La reserva ya inició");
        var all = payments.findAllByReservationIdOrderByCreatedAtAsc(r.id());
        if (all.stream()
                .anyMatch(
                        p ->
                                p.simulated()
                                        && ("PENDING".equals(p.status())
                                                || "PAID".equals(p.status()))))
            throw conflict("La reserva ya tiene una orden de prueba; no admite pagos externos");
        long paid = payments.sumPaid(r.id());
        long amount;
        if (plan == PaymentPlan.BALANCE) {
            if (r.status() != ReservationStatus.CONFIRMED || paid <= 0 || paid >= r.total().minor())
                throw conflict("No existe saldo pendiente");
            amount = r.total().minor() - paid;
        } else {
            if (paid > 0) throw conflict("El pago inicial ya está confirmado");
            amount = plan == PaymentPlan.DEPOSIT ? r.deposit().minor() : r.total().minor();
            var previous = r.status();
            r.holdForExternalReview(now, deadline);
            reservations.save(r);
            history.append(
                    new ReservationStatusTransition(
                            r.organizationId(),
                            r.id(),
                            previous,
                            r.status(),
                            ReservationTransitionActor.USER,
                            actor,
                            "EXTERNAL_PAYMENT_SUBMITTED",
                            null,
                            now));
        }
        if (amount <= 0) throw conflict("El importe debe ser positivo");
        return new Hold(amount, deadline, null);
    }

    public Hold prepare(
            Context context,
            UUID actor,
            PaymentMethod method,
            PaymentPlan plan,
            String key,
            Instant now,
            Instant deadline) {
        if (context.type() == TargetType.MATCH) {
            var hold =
                    matchPayments.prepare(context.match(), actor, method, plan, key, now, deadline);
            return new Hold(hold.amountMinor(), hold.expiresAt(), hold.ledgerOrderId());
        }
        var r = context.reservation();
        if (!r.customerUserId().equals(actor))
            throw new AccessDeniedException("Solo el cliente puede preparar el pago");
        if (!now.isBefore(r.timeRange().startsAt())) throw conflict("La reserva ya inició");
        if (payments.findAllByReservationIdOrderByCreatedAtAsc(r.id()).stream()
                .anyMatch(
                        p ->
                                p.simulated()
                                        && ("PAID".equals(p.status())
                                                || "PENDING".equals(p.status()))))
            throw conflict("La reserva tiene órdenes de prueba y no admite pagos externos");
        long paid = payments.sumPaid(r.id());
        long amount;
        if (plan == PaymentPlan.BALANCE) {
            if (r.status() != ReservationStatus.CONFIRMED || paid <= 0 || paid >= r.total().minor())
                throw conflict("No existe saldo pendiente");
            amount = r.total().minor() - paid;
        } else {
            if (paid > 0
                    || (r.status() != ReservationStatus.HOLD
                            && r.status() != ReservationStatus.PENDING_PAYMENT)
                    || r.expiresAt() == null
                    || !now.isBefore(r.expiresAt()))
                throw conflict("La retención de la reserva venció");
            amount = plan == PaymentPlan.DEPOSIT ? r.deposit().minor() : r.total().minor();
            if (deadline.isAfter(r.expiresAt())) deadline = r.expiresAt();
        }
        if (amount <= 0) throw conflict("El importe debe ser positivo");
        return new Hold(amount, deadline, null);
    }

    public boolean confirm(Context c, Proof proof, UUID reviewer, Instant now) {
        if (!now.isBefore(proof.reviewExpiresAt())) return false;
        if (c.type() == TargetType.MATCH) return matchPayments.confirm(c.match(), proof, now);
        var r = c.reservation();
        if (!now.isBefore(r.timeRange().startsAt())) return false;
        if ("BALANCE".equals(proof.plan())) {
            if (r.status() != ReservationStatus.CONFIRMED) return false;
        } else if (r.status() != ReservationStatus.PENDING_PAYMENT_CONFIRMATION
                || r.expiresAt() == null
                || !now.isBefore(r.expiresAt())) return false;
        if (proof.amountMinor() > r.total().minor() - payments.sumPaid(r.id())) return false;
        var plan = PaymentPlan.valueOf(proof.plan());
        if (payments.findByReservationIdAndInstallment(
                        r.id(), plan == PaymentPlan.BALANCE ? "BALANCE" : "INITIAL")
                .isPresent()) return false;
        if (plan != PaymentPlan.BALANCE
                && !"CONFIRMED"
                        .equals(
                                transitions
                                        .confirmPaid(proof.payerUserId(), r.id(), null)
                                        .status())) return false;
        var order =
                PaymentOrderEntity.create(
                        r.id(),
                        proof.payerUserId(),
                        proof.amountMinor(),
                        PaymentMethod.valueOf(proof.method()),
                        plan,
                        "external:" + proof.id(),
                        now);
        order.markExternal();
        order.markPaid("external:" + proof.id(), now);
        payments.saveAndFlush(order);
        paymentAudit.append(order.id(), null, "PAID", reviewer, null, now);
        return true;
    }

    public void release(Proof proof, Instant now) {
        if (proof.targetType() == TargetType.MATCH) {
            matchPayments.release(proof, now);
        } else if (!"BALANCE".equals(proof.plan())) {
            var reservation = reservations.findByIdForUpdate(proof.targetId()).orElseThrow();
            var previous = reservation.status();
            if (reservation.finishExternalReview(now)) {
                reservations.save(reservation);
                history.append(
                        new ReservationStatusTransition(
                                reservation.organizationId(),
                                reservation.id(),
                                previous,
                                reservation.status(),
                                ReservationTransitionActor.SYSTEM,
                                null,
                                "EXTERNAL_PAYMENT_REVIEW_RELEASED",
                                null,
                                now));
            }
        }
    }

    private ReservationConflictException conflict(String message) {
        return new ReservationConflictException(message);
    }
}
