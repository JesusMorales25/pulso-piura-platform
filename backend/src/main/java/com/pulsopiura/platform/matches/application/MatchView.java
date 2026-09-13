package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.SportsMatch;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MatchView(
        UUID id,
        String publicSlug,
        UUID sportSpaceId,
        String spaceName,
        String venueName,
        String venueAddress,
        String title,
        String sportCode,
        String formatCode,
        String skillLevel,
        int minPlayers,
        int maxPlayers,
        int occupiedPlayers,
        int availablePlayers,
        long priceMinor,
        String currency,
        String visibility,
        String cancellationPolicy,
        Instant startsAt,
        Instant endsAt,
        String status,
        List<MatchParticipantPreviewService.ParticipantPreview> participantPreview,
        long version) {
    static MatchView from(
            SportsMatch match,
            int occupied,
            String spaceName,
            String venueName,
            String venueAddress,
            List<MatchParticipantPreviewService.ParticipantPreview> participantPreview) {
        return new MatchView(
                match.id(),
                match.publicSlug(),
                match.sportSpaceId(),
                spaceName,
                venueName,
                venueAddress,
                match.title(),
                match.sportCode(),
                match.formatCode(),
                match.skillLevel().name(),
                match.minPlayers(),
                match.maxPlayers(),
                occupied,
                Math.max(0, match.maxPlayers() - occupied),
                match.priceMinor(),
                "PEN",
                match.visibility().name(),
                match.cancellationPolicy(),
                match.startsAt(),
                match.endsAt(),
                match.status().name(),
                participantPreview,
                match.version());
    }
}
