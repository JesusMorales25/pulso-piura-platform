package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.application.ManualMatchParticipantStore;
import com.pulsopiura.platform.matches.domain.ManualMatchParticipant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaManualMatchParticipantStore implements ManualMatchParticipantStore {
    private final ManualMatchParticipantJpaRepository participants;

    JpaManualMatchParticipantStore(ManualMatchParticipantJpaRepository participants) {
        this.participants = participants;
    }

    public ManualMatchParticipant save(ManualMatchParticipant participant) {
        return participants
                .saveAndFlush(ManualMatchParticipantJpaEntity.fromDomain(participant))
                .toDomain();
    }

    public Optional<ManualMatchParticipant> findById(UUID id) {
        return participants.findById(id).map(ManualMatchParticipantJpaEntity::toDomain);
    }

    public List<ManualMatchParticipant> findByMatch(UUID matchId) {
        return participants.findAllByMatchIdOrderByCreatedAtAscIdAsc(matchId).stream()
                .map(ManualMatchParticipantJpaEntity::toDomain)
                .toList();
    }

    public long countByMatch(UUID matchId) {
        return participants.countByMatchId(matchId);
    }

    public void delete(ManualMatchParticipant participant) {
        participants.deleteById(participant.id());
    }
}
