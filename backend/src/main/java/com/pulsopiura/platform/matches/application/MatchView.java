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
        boolean organizerCounts,
        long priceMinor,
        String currency,
        String visibility,
        String cancellationPolicy,
        Instant startsAt,
        Instant endsAt,
        String status,
        boolean managedByCurrentUser,
        List<MatchParticipantPreviewService.ParticipantPreview> participantPreview,
        String organizerDisplayName,
        String organizerAvatarUrl,
        String surfaceName,
        List<String> amenityNames,
        long version) {
    static MatchView from(
            SportsMatch match,
            int occupied,
            String spaceName,
            String venueName,
            String venueAddress,
            boolean managedByCurrentUser,
            List<MatchParticipantPreviewService.ParticipantPreview> participantPreview,
            MatchDetailMetadataService.Metadata metadata) {
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
                match.organizerCounts(),
                match.priceMinor(),
                "PEN",
                match.visibility().name(),
                match.cancellationPolicy(),
                match.startsAt(),
                match.endsAt(),
                match.status().name(),
                managedByCurrentUser,
                participantPreview,
                metadata == null ? null : metadata.organizerDisplayName(),
                metadata == null ? null : metadata.organizerAvatarUrl(),
                metadata == null ? null : metadata.surfaceName(),
                metadata == null ? List.of() : metadata.amenityNames(),
                match.version());
    }
}
