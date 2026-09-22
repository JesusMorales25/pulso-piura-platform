package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.application.MatchParticipantStore;
import com.pulsopiura.platform.matches.domain.MatchParticipant;
import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
class JpaMatchParticipantStore implements MatchParticipantStore {
    private final MatchParticipantJpaRepository participants;
    private final ManualMatchParticipantJpaRepository manualParticipants;

    JpaMatchParticipantStore(
            MatchParticipantJpaRepository participants,
            ManualMatchParticipantJpaRepository manualParticipants) {
        this.participants = participants;
        this.manualParticipants = manualParticipants;
    }

    @Override
    public MatchParticipant save(MatchParticipant participant) {
        return participants
                .saveAndFlush(MatchParticipantJpaEntity.fromDomain(participant))
                .toDomain();
    }

    @Override
    public Optional<MatchParticipant> findByMatchAndUser(UUID matchId, UUID userId) {
        return participants
                .findByMatchIdAndUserId(matchId, userId)
                .map(MatchParticipantJpaEntity::toDomain);
    }

    @Override
    public long countByMatchAndStatus(UUID matchId, MatchParticipantStatus status) {
        var registered = participants.countByMatchIdAndStatus(matchId, status);
        return status == MatchParticipantStatus.JOINED
                ? registered + manualParticipants.countByMatchId(matchId)
                : registered;
    }

    @Override
    public List<MatchParticipant> findByMatchAndStatusOrdered(
            UUID matchId, MatchParticipantStatus status) {
        return participants
                .findAllByMatchIdAndStatusOrderByWaitlistedAtAscIdAsc(matchId, status)
                .stream()
                .map(MatchParticipantJpaEntity::toDomain)
                .toList();
    }
}
