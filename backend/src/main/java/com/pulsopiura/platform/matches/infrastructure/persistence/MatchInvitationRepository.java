package com.pulsopiura.platform.matches.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface MatchInvitationRepository extends JpaRepository<MatchInvitationEntity, UUID> {
    List<MatchInvitationEntity> findAllByMatchIdOrderByInvitedAtDesc(UUID matchId);

    Optional<MatchInvitationEntity> findByMatchIdAndEmailIgnoreCaseAndStatus(
            UUID matchId, String email, String status);

    boolean existsByMatchIdAndAcceptedByAndStatus(UUID matchId, UUID acceptedBy, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MatchInvitationEntity> findForUpdateById(UUID id);
}
