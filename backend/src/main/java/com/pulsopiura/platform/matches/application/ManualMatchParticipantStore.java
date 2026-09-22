package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.ManualMatchParticipant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ManualMatchParticipantStore {
    ManualMatchParticipant save(ManualMatchParticipant participant);

    Optional<ManualMatchParticipant> findById(UUID id);

    List<ManualMatchParticipant> findByMatch(UUID matchId);

    long countByMatch(UUID matchId);

    void delete(ManualMatchParticipant participant);
}
