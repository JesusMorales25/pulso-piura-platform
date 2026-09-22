package com.pulsopiura.platform.matches.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ManualMatchParticipantJpaRepository
        extends JpaRepository<ManualMatchParticipantJpaEntity, UUID> {
    List<ManualMatchParticipantJpaEntity> findAllByMatchIdOrderByCreatedAtAscIdAsc(UUID matchId);

    long countByMatchId(UUID matchId);
}
