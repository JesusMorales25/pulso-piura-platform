package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.MatchParticipant;
import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchParticipantStore {
    MatchParticipant save(MatchParticipant participant);

    Optional<MatchParticipant> findByMatchAndUser(UUID matchId, UUID userId);

    long countByMatchAndStatus(UUID matchId, MatchParticipantStatus status);

    List<MatchParticipant> findByMatchAndStatusOrdered(UUID matchId, MatchParticipantStatus status);
}
