package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.*;
import java.time.Clock;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchParticipationService {
    private final MatchStore matches;
    private final MatchParticipantStore participants;
    private final ApplicationEventPublisher events;
    private final MatchAccessPolicy accessPolicy;
    private final Clock clock;

    @Autowired
    public MatchParticipationService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchAccessPolicy accessPolicy,
            ApplicationEventPublisher events) {
        this(matches, participants, accessPolicy, events, Clock.systemUTC());
    }

    MatchParticipationService(
            MatchStore matches,
            MatchParticipantStore participants,
            MatchAccessPolicy accessPolicy,
            ApplicationEventPublisher events,
            Clock clock) {
        this.matches = matches;
        this.participants = participants;
        this.accessPolicy = accessPolicy;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public MatchParticipationView join(UUID actorId, String publicSlug) {
        var match = requireJoinableMatch(publicSlug, actorId);
        var now = clock.instant();
        if (!now.isBefore(match.startsAt())) {
            throw new IllegalStateException("El partido ya inició");
        }
        if (match.organizerCounts() && match.organizerUserId().equals(actorId)) {
            throw new IllegalStateException("El organizador ya ocupa un cupo");
        }
        if (match.priceMinor() > 0) {
            throw new IllegalStateException("Completa el pago para confirmar tu cupo");
        }

        return enroll(match, actorId, now);
    }

    MatchParticipationView confirmPaidJoin(SportsMatch match, UUID actorId, Instant now) {
        if (!now.isBefore(match.startsAt())) {
            throw new IllegalStateException("El partido ya inició");
        }
        if (match.organizerCounts() && match.organizerUserId().equals(actorId)) {
            throw new IllegalStateException("El organizador ya ocupa un cupo");
        }
        return enroll(match, actorId, now);
    }

    private MatchParticipationView enroll(SportsMatch match, UUID actorId, Instant now) {

        var existing = participants.findByMatchAndUser(match.id(), actorId);
        if (existing.isPresent() && existing.get().status() != MatchParticipantStatus.WITHDRAWN) {
            return view(match, existing.get().status(), actorId);
        }

        var nextStatus =
                hasAvailablePlace(match)
                        ? MatchParticipantStatus.JOINED
                        : MatchParticipantStatus.WAITLISTED;
        var participant =
                existing.orElseGet(
                        () ->
                                MatchParticipant.enroll(
                                        match.organizationId(),
                                        match.id(),
                                        actorId,
                                        nextStatus,
                                        now));
        if (existing.isPresent()) participant.rejoin(nextStatus, now);
        participants.save(participant);
        events.publishEvent(
                new MatchAuditEvent(
                        actorId,
                        match.organizationId(),
                        match.id(),
                        nextStatus == MatchParticipantStatus.JOINED
                                ? "MATCH_PARTICIPANT_JOINED"
                                : "MATCH_PARTICIPANT_WAITLISTED"));
        return view(match, nextStatus, actorId);
    }

    @Transactional
    public MatchParticipationView withdraw(UUID actorId, String publicSlug) {
        var match = requireJoinableMatch(publicSlug, actorId);
        var participant = participants.findByMatchAndUser(match.id(), actorId);
        if (participant.isEmpty()
                || participant.get().status() == MatchParticipantStatus.WITHDRAWN) {
            return view(match, MatchParticipantStatus.WITHDRAWN, actorId);
        }
        var now = clock.instant();
        var releasedPlace = participant.get().status() == MatchParticipantStatus.JOINED;
        participant.get().withdraw(now);
        participants.save(participant.get());
        events.publishEvent(
                new MatchAuditEvent(
                        actorId, match.organizationId(), match.id(), "MATCH_PARTICIPANT_WITHDREW"));
        if (releasedPlace) promoteNext(match, now);
        return view(match, MatchParticipantStatus.WITHDRAWN, actorId);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<MatchParticipationView> current(UUID actorId, String publicSlug) {
        var match =
                matches.findPublishedBySlug(publicSlug)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        accessPolicy.requireCanAccess(match, actorId);
        return participants
                .findByMatchAndUser(match.id(), actorId)
                .filter(item -> item.status() != MatchParticipantStatus.WITHDRAWN)
                .map(item -> view(match, item.status(), actorId));
    }

    private SportsMatch requireJoinableMatch(String publicSlug, UUID actorId) {
        var match =
                matches.findPublishedBySlugForUpdate(publicSlug)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        accessPolicy.requireCanAccess(match, actorId);
        return match;
    }

    private boolean hasAvailablePlace(SportsMatch match) {
        return occupied(match) < match.maxPlayers();
    }

    private int occupied(SportsMatch match) {
        var joined = participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED);
        return Math.toIntExact(joined) + (match.organizerCounts() ? 1 : 0);
    }

    private void promoteNext(SportsMatch match, Instant now) {
        participants
                .findByMatchAndStatusOrdered(match.id(), MatchParticipantStatus.WAITLISTED)
                .stream()
                .findFirst()
                .ifPresent(
                        next -> {
                            next.promote(now);
                            participants.save(next);
                            events.publishEvent(
                                    new MatchAuditEvent(
                                            next.userId(),
                                            match.organizationId(),
                                            match.id(),
                                            "MATCH_PARTICIPANT_PROMOTED"));
                        });
    }

    private MatchParticipationView view(
            SportsMatch match, MatchParticipantStatus status, UUID actorId) {
        var occupied = occupied(match);
        Integer position = null;
        if (status == MatchParticipantStatus.WAITLISTED) {
            var waiting =
                    participants.findByMatchAndStatusOrdered(
                            match.id(), MatchParticipantStatus.WAITLISTED);
            position =
                    java.util.stream.IntStream.range(0, waiting.size())
                            .filter(index -> waiting.get(index).userId().equals(actorId))
                            .map(index -> index + 1)
                            .findFirst()
                            .orElse(waiting.size());
        }
        return new MatchParticipationView(
                match.id(),
                match.publicSlug(),
                status.name(),
                position,
                occupied,
                Math.max(0, match.maxPlayers() - occupied));
    }
}
