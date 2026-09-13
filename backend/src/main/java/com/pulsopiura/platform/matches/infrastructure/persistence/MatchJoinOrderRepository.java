package com.pulsopiura.platform.matches.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface MatchJoinOrderRepository extends JpaRepository<MatchJoinOrderEntity, UUID> {
    Optional<MatchJoinOrderEntity> findByPayerUserIdAndIdempotencyKey(UUID payerUserId, String key);

    Optional<MatchJoinOrderEntity> findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
            UUID matchId, UUID payerUserId, String status);

    long countByMatchIdAndStatusAndExpiresAtAfter(UUID matchId, String status, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from MatchJoinOrderEntity o where o.id = :id")
    Optional<MatchJoinOrderEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query("select o.matchId from MatchJoinOrderEntity o where o.id = :id")
    Optional<UUID> matchIdForOrder(@Param("id") UUID id);

    List<MatchJoinOrderEntity> findAllByMatchIdOrderByCreatedAtAsc(UUID matchId);
}
