package com.pulsopiura.platform.matches.application;

import java.util.UUID;

public record MatchParticipationView(
        UUID matchId,
        String publicSlug,
        String status,
        Integer waitlistPosition,
        int occupiedPlayers,
        int availablePlayers) {}
