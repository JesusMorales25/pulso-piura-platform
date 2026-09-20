package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchJoinPaymentService {
    private static final Duration HOLD_DURATION = Duration.ofMinutes(5);
    private final MatchStore matches;
    private final MatchParticipantStore participants;
    private final MatchJoinOrderRepository orders;
    private final MatchParticipationService participation;
    private final MatchPaymentProvider provider;
    private final MatchAccessPolicy accessPolicy;
    private final Clock clock;

    @Autowired
    public MatchJoinPaymentService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchJoinOrderRepository orders,
            MatchParticipationService participation,
            MatchPaymentProvider provider,
            MatchAccessPolicy accessPolicy) {
        this(
                matches,
                participants,
                orders,
                participation,
                provider,
                accessPolicy,
                Clock.systemUTC());
    }

    MatchJoinPaymentService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchJoinOrderRepository orders,
            MatchParticipationService participation,
            MatchPaymentProvider provider,
            MatchAccessPolicy accessPolicy,
            Clock clock) {
        this.matches = matches;
        this.participants = participants;
        this.orders = orders;
        this.participation = participation;
        this.provider = provider;
        this.accessPolicy = accessPolicy;
        this.clock = clock;
    }

    public boolean simulationEnabled() {
        return provider.simulationEnabled();
    }

    @Transactional
    public JoinOrderView start(
            UUID actor, String publicSlug, MatchPaymentMethod method, String rawKey) {
        if (!provider.simulationEnabled())
            throw new IllegalStateException("Los pagos de partidos están deshabilitados");
        var key = requireKey(rawKey);
        var replay = orders.findByPayerUserIdAndIdempotencyKey(actor, key);
        if (replay.isPresent()) return view(replay.get());
        var match = requirePublishedForUpdate(publicSlug, actor);
        var now = clock.instant();
        requireCanBuy(match, actor, now);
        var existingPaid =
                orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), actor, "PAID");
        if (existingPaid.isPresent()) return view(existingPaid.get());
        var currentParticipation = participants.findByMatchAndUser(match.id(), actor);
        if (currentParticipation.isPresent()
                && currentParticipation.get().status() != MatchParticipantStatus.WITHDRAWN) {
            throw new ReservationConflictException("Ya tienes un cupo registrado en este partido");
        }
        var existingPending =
                orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), actor, "PENDING");
        if (existingPending.isPresent() && now.isBefore(existingPending.get().expiresAt())) {
            if (existingPending.get().method() != method)
                throw new ReservationConflictException(
                        "Ya tienes un cupo retenido con otro método de pago");
            return view(existingPending.get());
        }
        existingPending.ifPresent(
                order -> {
                    order.expire(now);
                    orders.saveAndFlush(order);
                });
        var occupied = occupied(match);
        var held = orders.countByMatchIdAndStatusAndExpiresAtAfter(match.id(), "PENDING", now);
        if (occupied + held >= match.maxPlayers())
            throw new ReservationConflictException("El partido ya no tiene cupos disponibles");
        var expiresAt = now.plus(HOLD_DURATION);
        if (expiresAt.isAfter(match.startsAt())) expiresAt = match.startsAt();
        return view(
                orders.saveAndFlush(
                        MatchJoinOrderEntity.pending(
                                match.organizationId(),
                                match.id(),
                                actor,
                                match.priceMinor(),
                                method,
                                key,
                                expiresAt,
                                now)));
    }

    @Transactional
    public JoinOrderView simulate(UUID actor, UUID orderId) {
        if (!provider.simulationEnabled())
            throw new IllegalStateException("El modo de pruebas está deshabilitado");
        var matchId =
                orders.matchIdForOrder(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Orden no encontrada"));
        var match =
                matches.findByIdForUpdate(matchId)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        var order =
                orders.findByIdForUpdate(orderId)
                        .orElseThrow(() -> new NoSuchElementException("Orden no encontrada"));
        if (!order.payerUserId().equals(actor))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Sin acceso a la orden");
        var now = clock.instant();
        if ("PAID".equals(order.status())) {
            participation.confirmPaidJoin(match, actor, now);
            return view(order);
        }
        if (!"PENDING".equals(order.status()) || !now.isBefore(order.expiresAt())) {
            order.expire(now);
            orders.saveAndFlush(order);
            throw new ReservationConflictException(
                    "La retención del cupo venció. Vuelve a intentarlo.");
        }
        requireCanBuy(match, actor, now);
        participation.confirmPaidJoin(match, actor, now);
        order.markPaid(provider.simulateConfirmedPayment(order.id()), now);
        return view(orders.saveAndFlush(order));
    }

    @Transactional(readOnly = true)
    public Optional<JoinOrderView> current(UUID actor, String publicSlug) {
        var match =
                matches.findPublishedBySlug(publicSlug)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        accessPolicy.requireCanAccess(match, actor);
        var paid =
                orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), actor, "PAID");
        if (paid.isPresent()) return paid.map(this::view);
        return orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), actor, "PENDING")
                .filter(order -> clock.instant().isBefore(order.expiresAt()))
                .map(this::view);
    }

    private SportsMatch requirePublishedForUpdate(String slug, UUID actor) {
        var match =
                matches.findPublishedBySlugForUpdate(slug)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        accessPolicy.requireCanAccess(match, actor);
        return match;
    }

    private void requireCanBuy(SportsMatch match, UUID actor, Instant now) {
        if (!now.isBefore(match.startsAt()))
            throw new IllegalStateException("El partido ya inició");
        if (match.priceMinor() <= 0)
            throw new IllegalStateException("Este partido no requiere pago");
        if (match.organizerCounts() && match.organizerUserId().equals(actor))
            throw new IllegalStateException("El organizador ya ocupa un cupo");
    }

    private long occupied(SportsMatch match) {
        return participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED)
                + (match.organizerCounts() ? 1 : 0);
    }

    private String requireKey(String value) {
        if (value == null || value.isBlank() || value.length() > 100)
            throw new IllegalArgumentException("Idempotency-Key inválida");
        return value.trim();
    }

    private JoinOrderView view(MatchJoinOrderEntity order) {
        return new JoinOrderView(
                order.id(),
                order.matchId(),
                order.amountMinor(),
                order.currency(),
                order.method().name(),
                order.status(),
                order.expiresAt(),
                order.providerReference(),
                order.paidAt(),
                true);
    }

    public record JoinOrderView(
            UUID id,
            UUID matchId,
            long amountMinor,
            String currency,
            String method,
            String status,
            Instant expiresAt,
            String providerReference,
            Instant paidAt,
            boolean simulated) {}
}
