package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import com.pulsopiura.platform.matches.infrastructure.persistence.MatchJoinOrderRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchOrganizerManagementService {
    private final MatchStore matches;
    private final MatchParticipantStore participants;
    private final MatchJoinOrderRepository orders;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public MatchOrganizerManagementService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchJoinOrderRepository orders,
            ApplicationEventPublisher events) {
        this(matches, participants, orders, events, Clock.systemUTC());
    }

    MatchOrganizerManagementService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchJoinOrderRepository orders,
            ApplicationEventPublisher events,
            Clock clock) {
        this.matches = matches;
        this.participants = participants;
        this.orders = orders;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public void removeParticipant(UUID actor, UUID matchId, UUID userId) {
        var match =
                matches.findByIdForUpdate(matchId)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        if (!match.organizerUserId().equals(actor))
            throw new AccessDeniedException("Solo el organizador del partido puede administrarlo");

        var participant =
                participants
                        .findByMatchAndUser(matchId, userId)
                        .filter(item -> item.status() != MatchParticipantStatus.WITHDRAWN)
                        .orElseThrow(
                                () -> new NoSuchElementException("Participante no encontrado"));
        if (orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        matchId, userId, "PAID")
                .isPresent()) {
            throw new IllegalStateException(
                    "No se puede retirar desde el panel a un participante con pago confirmado");
        }

        var now = clock.instant();
        var releasesPlace = participant.status() == MatchParticipantStatus.JOINED;
        participant.withdraw(now);
        participants.save(participant);
        events.publishEvent(
                new MatchAuditEvent(
                        actor,
                        match.organizationId(),
                        match.id(),
                        "MATCH_PARTICIPANT_REMOVED_BY_ORGANIZER"));
        if (releasesPlace) promoteNext(match.id(), match.organizationId(), now);
    }

    private void promoteNext(UUID matchId, UUID organizationId, Instant now) {
        participants
                .findByMatchAndStatusOrdered(matchId, MatchParticipantStatus.WAITLISTED)
                .stream()
                .findFirst()
                .ifPresent(
                        next -> {
                            next.promote(now);
                            participants.save(next);
                            events.publishEvent(
                                    new MatchAuditEvent(
                                            next.userId(),
                                            organizationId,
                                            matchId,
                                            "MATCH_PARTICIPANT_PROMOTED"));
                        });
    }
}
