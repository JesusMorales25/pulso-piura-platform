package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import com.pulsopiura.platform.venues.application.VenueSpaceQuery;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchService {
    private final MatchStore matches;
    private final ReservationStore reservations;
    private final VenueSpaceQuery spaces;
    private final MatchParticipantStore participants;
    private final ApplicationEventPublisher events;
    private final MatchParticipantPreviewService participantPreviews;
    private final MatchDetailMetadataService detailMetadata;
    private final MatchAccessPolicy accessPolicy;
    private final Clock clock;

    @Autowired
    public MatchService(
            MatchStore matches,
            ReservationStore reservations,
            VenueSpaceQuery spaces,
            MatchParticipantStore participants,
            MatchParticipantPreviewService participantPreviews,
            MatchDetailMetadataService detailMetadata,
            MatchAccessPolicy accessPolicy,
            ApplicationEventPublisher events) {
        this(
                matches,
                reservations,
                spaces,
                participants,
                participantPreviews,
                detailMetadata,
                accessPolicy,
                events,
                Clock.systemUTC());
    }

    MatchService(
            MatchStore matches,
            ReservationStore reservations,
            VenueSpaceQuery spaces,
            MatchParticipantStore participants,
            MatchParticipantPreviewService participantPreviews,
            MatchDetailMetadataService detailMetadata,
            MatchAccessPolicy accessPolicy,
            ApplicationEventPublisher events,
            Clock clock) {
        this.matches = matches;
        this.reservations = reservations;
        this.spaces = spaces;
        this.participants = participants;
        this.participantPreviews = participantPreviews;
        this.detailMetadata = detailMetadata;
        this.accessPolicy = accessPolicy;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public MatchView createDraft(UUID actorId, CreateCommand command) {
        var reservation =
                reservations
                        .findById(command.reservationId())
                        .filter(item -> item.customerUserId().equals(actorId))
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        if (reservation.status() != ReservationStatus.CONFIRMED) {
            throw new IllegalStateException("La reserva debe estar confirmada");
        }
        var now = clock.instant();
        if (!now.isBefore(reservation.timeRange().startsAt())) {
            throw new IllegalStateException("La reserva ya inició");
        }
        if (matches.existsByReservationId(reservation.id())) {
            throw new IllegalStateException("La reserva ya tiene un partido asociado");
        }
        var space = spaces.requirePublishedSpace(reservation.sportSpaceId());
        if (!space.organizationId().equals(reservation.organizationId())) {
            throw new IllegalStateException("La reserva y la cancha no coinciden");
        }
        if (command.maxPlayers() > space.capacity()) {
            throw new IllegalArgumentException("El máximo supera la capacidad de la cancha");
        }
        var match =
                SportsMatch.draft(
                        reservation.organizationId(),
                        reservation.id(),
                        reservation.sportSpaceId(),
                        actorId,
                        command.title(),
                        space.sportCode(),
                        space.formatCode(),
                        parseLevel(command.skillLevel()),
                        command.minPlayers(),
                        command.maxPlayers(),
                        command.organizerCounts(),
                        command.priceMinor(),
                        parseVisibility(command.visibility()),
                        command.cancellationPolicy(),
                        reservation.timeRange().startsAt(),
                        reservation.timeRange().endsAt(),
                        now);
        var saved = matches.save(match);
        events.publishEvent(
                new MatchAuditEvent(actorId, saved.organizationId(), saved.id(), "MATCH_CREATED"));
        return view(saved);
    }

    @Transactional
    public MatchView publish(UUID actorId, UUID matchId) {
        var match =
                matches.findByIdForUpdate(matchId)
                        .filter(item -> item.organizerUserId().equals(actorId))
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        match.publish(actorId, clock.instant());
        var saved = matches.save(match);
        events.publishEvent(
                new MatchAuditEvent(
                        actorId, saved.organizationId(), saved.id(), "MATCH_PUBLISHED"));
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<MatchView> publicCatalog(String sportCode) {
        var sport = normalizeOptional(sportCode);
        return matches.findPublicUpcoming(clock.instant(), sport).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public MatchView detail(String publicSlug, UUID actorId) {
        var match =
                matches.findPublishedBySlug(publicSlug)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        accessPolicy.requireCanAccess(match, actorId);
        return view(match, true);
    }

    @Transactional(readOnly = true)
    public List<MatchView> organizerCatalog(UUID actorId) {
        return matches.findByOrganizer(actorId).stream()
                .filter(match -> match.status() == MatchStatus.PUBLISHED)
                .map(this::view)
                .toList();
    }

    private MatchView view(SportsMatch match) {
        return view(match, false);
    }

    private MatchView view(SportsMatch match, boolean includeDetailMetadata) {
        var joined = participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED);
        var occupied = Math.toIntExact(joined) + (match.organizerCounts() ? 1 : 0);
        var space = spaces.requirePublishedSpace(match.sportSpaceId());
        return MatchView.from(
                match,
                occupied,
                space.spaceName(),
                space.venueName(),
                space.venueAddress(),
                participantPreviews.publicParticipants(match.id()),
                includeDetailMetadata
                        ? detailMetadata.load(match.organizerUserId(), match.sportSpaceId())
                        : null);
    }

    private SkillLevel parseLevel(String value) {
        try {
            return SkillLevel.valueOf(normalizeRequired(value, "El nivel"));
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("El nivel no es válido");
        }
    }

    private MatchVisibility parseVisibility(String value) {
        try {
            return MatchVisibility.valueOf(normalizeRequired(value, "La visibilidad"));
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("La visibilidad no es válida");
        }
    }

    private String normalizeRequired(String value, String label) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(label + " es obligatorio");
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public record CreateCommand(
            UUID reservationId,
            String title,
            String skillLevel,
            int minPlayers,
            int maxPlayers,
            boolean organizerCounts,
            long priceMinor,
            String visibility,
            String cancellationPolicy) {}
}
