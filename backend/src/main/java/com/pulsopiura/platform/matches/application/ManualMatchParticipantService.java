package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.ManualMatchParticipant;
import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import com.pulsopiura.platform.matches.domain.MatchStatus;
import java.time.Clock;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ManualMatchParticipantService {
    private final MatchStore matches;
    private final MatchParticipantStore participants;
    private final ManualMatchParticipantStore manualParticipants;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public ManualMatchParticipantService(
            MatchStore matches,
            MatchParticipantStore participants,
            ManualMatchParticipantStore manualParticipants,
            ApplicationEventPublisher events) {
        this(matches, participants, manualParticipants, events, Clock.systemUTC());
    }

    ManualMatchParticipantService(
            MatchStore matches,
            MatchParticipantStore participants,
            ManualMatchParticipantStore manualParticipants,
            ApplicationEventPublisher events,
            Clock clock) {
        this.matches = matches;
        this.participants = participants;
        this.manualParticipants = manualParticipants;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public ManualParticipantView add(
            UUID actor, UUID matchId, String displayName, String phone, boolean paid) {
        var match =
                matches.findByIdForUpdate(matchId)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        requireOrganizer(match.organizerUserId(), actor);
        var now = clock.instant();
        if (match.status() != MatchStatus.PUBLISHED)
            throw new IllegalStateException("El partido todavía no está publicado");
        if (!now.isBefore(match.startsAt()))
            throw new IllegalStateException("El partido ya inició");
        var occupied =
                participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED)
                        + (match.organizerCounts() ? 1 : 0);
        if (occupied >= match.maxPlayers())
            throw new IllegalStateException("El partido ya no tiene cupos disponibles");
        var saved =
                manualParticipants.save(
                        ManualMatchParticipant.create(
                                match.organizationId(),
                                match.id(),
                                displayName,
                                phone,
                                paid,
                                match.priceMinor(),
                                actor,
                                now));
        events.publishEvent(
                new MatchAuditEvent(
                        actor,
                        match.organizationId(),
                        match.id(),
                        "MATCH_MANUAL_PARTICIPANT_ADDED"));
        return view(saved);
    }

    @Transactional
    public void remove(UUID actor, UUID matchId, UUID participantId) {
        var match =
                matches.findByIdForUpdate(matchId)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        requireOrganizer(match.organizerUserId(), actor);
        var participant =
                manualParticipants
                        .findById(participantId)
                        .filter(item -> item.matchId().equals(matchId))
                        .orElseThrow(
                                () -> new NoSuchElementException("Participante no encontrado"));
        manualParticipants.delete(participant);
        events.publishEvent(
                new MatchAuditEvent(
                        actor,
                        match.organizationId(),
                        match.id(),
                        "MATCH_MANUAL_PARTICIPANT_REMOVED"));
        participants
                .findByMatchAndStatusOrdered(match.id(), MatchParticipantStatus.WAITLISTED)
                .stream()
                .findFirst()
                .ifPresent(
                        next -> {
                            next.promote(clock.instant());
                            participants.save(next);
                            events.publishEvent(
                                    new MatchAuditEvent(
                                            next.userId(),
                                            match.organizationId(),
                                            match.id(),
                                            "MATCH_PARTICIPANT_PROMOTED"));
                        });
    }

    private void requireOrganizer(UUID organizer, UUID actor) {
        if (!organizer.equals(actor))
            throw new AccessDeniedException(
                    "Solo el organizador del partido puede administrar cupos");
    }

    private ManualParticipantView view(ManualMatchParticipant participant) {
        return new ManualParticipantView(
                participant.id(),
                participant.displayName(),
                participant.phone(),
                participant.paid() ? "PAID_DIRECT" : "UNPAID",
                participant.paidMinor(),
                participant.paidAt(),
                participant.createdAt());
    }

    public record ManualParticipantView(
            UUID id,
            String displayName,
            String phone,
            String paymentStatus,
            long paidMinor,
            java.time.Instant paidAt,
            java.time.Instant createdAt) {}
}
