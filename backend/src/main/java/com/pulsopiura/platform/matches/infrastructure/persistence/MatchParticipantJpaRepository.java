package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.MatchParticipantStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface MatchParticipantJpaRepository extends JpaRepository<MatchParticipantJpaEntity, UUID> {
    Optional<MatchParticipantJpaEntity> findByMatchIdAndUserId(UUID matchId, UUID userId);

    long countByMatchIdAndStatus(UUID matchId, MatchParticipantStatus status);

    List<MatchParticipantJpaEntity> findAllByMatchIdAndStatusOrderByWaitlistedAtAscIdAsc(
            UUID matchId, MatchParticipantStatus status);
}
