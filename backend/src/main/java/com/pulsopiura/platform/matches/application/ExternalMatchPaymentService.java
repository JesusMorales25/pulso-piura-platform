package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.Proof;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Internal match ledger orchestration; callers must hold the match aggregate lock. */
@Service
public class ExternalMatchPaymentService {
    private final MatchParticipantStore participants;
    private final MatchJoinOrderRepository joins;
    private final MatchParticipationService participation;

    public ExternalMatchPaymentService(
            MatchParticipantStore participants,
            MatchJoinOrderRepository joins,
            MatchParticipationService participation) {
        this.participants = participants;
        this.joins = joins;
        this.participation = participation;
    }

    public record Hold(long amountMinor, Instant expiresAt, UUID ledgerOrderId) {}

    public Hold prepare(
            SportsMatch m,
            UUID actor,
            PaymentMethod method,
            PaymentPlan plan,
            String key,
            Instant now,
            Instant deadline) {
        if (plan != PaymentPlan.FULL)
            throw new IllegalArgumentException("Los partidos requieren pago completo");
        if (m.status() != MatchStatus.PUBLISHED
                || !now.isBefore(m.startsAt())
                || m.priceMinor() <= 0) throw conflict("El partido no admite pagos");
        boolean organizer = m.organizerUserId().equals(actor);
        if (organizer && !m.organizerCounts()) throw conflict("El organizador no participa");
        String ledgerKey =
                "external-prepare:"
                        + UUID.nameUUIDFromBytes(
                                key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var replay = joins.findByPayerUserIdAndIdempotencyKey(actor, ledgerKey);
        if (replay.isPresent()
                && (!replay.get().matchId().equals(m.id())
                        || replay.get().method() != MatchPaymentMethod.valueOf(method.name())))
            throw conflict("La clave ya se utilizó para otra preparación");
        var all = joins.findAllByMatchIdOrderByCreatedAtAsc(m.id());
        if (all.stream().anyMatch(o -> o.payerUserId().equals(actor) && "PAID".equals(o.status())))
            throw conflict("Ya existe un pago para este jugador");
        var existing =
                all.stream()
                        .filter(
                                o ->
                                        o.payerUserId().equals(actor)
                                                && "PENDING".equals(o.status())
                                                && now.isBefore(o.expiresAt()))
                        .findFirst();
        if (existing.isPresent()) {
            var order = existing.get();
            if (order.simulated())
                throw conflict("Ya existe una retención de prueba para este jugador");
            if (order.method() != MatchPaymentMethod.valueOf(method.name()))
                throw conflict("Ya tienes una retención con otro método de pago");
            return new Hold(order.amountMinor(), order.expiresAt(), order.id());
        }
        if (replay.isPresent())
            throw conflict("Esta preparación venció. Inicia otra antes de transferir");
        if (!organizer) {
            if (participants
                    .findByMatchAndUser(m.id(), actor)
                    .filter(p -> p.status() != MatchParticipantStatus.WITHDRAWN)
                    .isPresent()) throw conflict("Ya tienes un cupo registrado");
            long occupied =
                    participants.countByMatchAndStatus(m.id(), MatchParticipantStatus.JOINED)
                            + (m.organizerCounts() ? 1 : 0);
            long held = joins.countByMatchIdAndStatusAndExpiresAtAfter(m.id(), "PENDING", now);
            if (m.organizerCounts())
                held -=
                        all.stream()
                                .filter(
                                        o ->
                                                o.payerUserId().equals(m.organizerUserId())
                                                        && "PENDING".equals(o.status())
                                                        && now.isBefore(o.expiresAt()))
                                .count();
            if (occupied + Math.max(0, held) >= m.maxPlayers())
                throw conflict("No quedan cupos disponibles");
        }
        var order =
                MatchJoinOrderEntity.pending(
                        m.organizationId(),
                        m.id(),
                        actor,
                        m.priceMinor(),
                        MatchPaymentMethod.valueOf(method.name()),
                        ledgerKey,
                        deadline,
                        now);
        order.markExternal();
        joins.saveAndFlush(order);
        return new Hold(m.priceMinor(), deadline, order.id());
    }

    public Hold hold(
            SportsMatch m,
            UUID actor,
            PaymentMethod method,
            PaymentPlan plan,
            String key,
            Instant now,
            Instant deadline) {
        if (plan != PaymentPlan.FULL
                || m.status() != MatchStatus.PUBLISHED
                || !now.isBefore(m.startsAt())) throw conflict("El partido no admite pagos");
        var all = joins.findAllByMatchIdOrderByCreatedAtAsc(m.id());
        if (all.stream().anyMatch(o -> o.payerUserId().equals(actor) && "PAID".equals(o.status())))
            throw conflict("Ya existe un pago para este jugador");
        var order =
                all.stream()
                        .filter(
                                o ->
                                        o.payerUserId().equals(actor)
                                                && !o.simulated()
                                                && "PENDING".equals(o.status())
                                                && now.isBefore(o.expiresAt()))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        conflict(
                                                "La retención del cupo venció. No vuelvas a transferir; contacta al organizador"));
        if (order.method() != MatchPaymentMethod.valueOf(method.name()))
            throw conflict("El método no coincide con la retención preparada");
        order.extendExternalReview(now, deadline);
        joins.saveAndFlush(order);
        return new Hold(order.amountMinor(), order.expiresAt(), order.id());
    }

    public boolean confirm(SportsMatch m, Proof proof, Instant now) {
        if (!now.isBefore(proof.reviewExpiresAt())) return false;
        if (m.status() != MatchStatus.PUBLISHED || !now.isBefore(m.startsAt())) return false;
        var order = joins.findByIdForUpdate(proof.ledgerOrderId()).orElseThrow();
        if (!"PENDING".equals(order.status()) || !now.isBefore(order.expiresAt())) return false;
        if (!m.organizerUserId().equals(proof.payerUserId())) {
            var existing = participants.findByMatchAndUser(m.id(), proof.payerUserId());
            if (existing.isPresent() && existing.get().status() != MatchParticipantStatus.WITHDRAWN)
                return false;
            long occupied =
                    participants.countByMatchAndStatus(m.id(), MatchParticipantStatus.JOINED)
                            + (m.organizerCounts() ? 1 : 0);
            if (occupied >= m.maxPlayers()) return false;
            participation.confirmPaidJoin(m, proof.payerUserId(), now);
        }
        order.markPaid("external:" + proof.id(), now);
        joins.saveAndFlush(order);
        return true;
    }

    public void release(Proof proof, Instant now) {
        if (proof.ledgerOrderId() != null) {
            joins.findByIdForUpdate(proof.ledgerOrderId())
                    .ifPresent(
                            o -> {
                                o.expire(now);
                                joins.saveAndFlush(o);
                            });
        }
    }

    private ReservationConflictException conflict(String message) {
        return new ReservationConflictException(message);
    }
}
