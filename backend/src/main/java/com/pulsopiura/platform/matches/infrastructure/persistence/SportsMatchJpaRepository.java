package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.domain.MatchStatus;
import com.pulsopiura.platform.matches.domain.MatchVisibility;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

interface SportsMatchJpaRepository extends JpaRepository<SportsMatchJpaEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SportsMatchJpaEntity> findById(UUID id);

    Optional<SportsMatchJpaEntity> findOneById(UUID id);

    Optional<SportsMatchJpaEntity> findByPublicSlugAndStatus(String slug, MatchStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SportsMatchJpaEntity> findForUpdateByPublicSlugAndStatus(
            String slug, MatchStatus status);

    boolean existsByReservationId(UUID reservationId);

    boolean existsByStatusAndStartsAtAfterAndTitleIgnoreCase(
            MatchStatus status, Instant now, String title);

    List<SportsMatchJpaEntity> findAllByStatusAndVisibilityAndStartsAtAfterOrderByStartsAtAsc(
            MatchStatus status, MatchVisibility visibility, Instant now);

    List<SportsMatchJpaEntity>
            findAllByStatusAndVisibilityAndStartsAtAfterAndSportCodeOrderByStartsAtAsc(
                    MatchStatus status, MatchVisibility visibility, Instant now, String sportCode);

    List<SportsMatchJpaEntity> findAllByOrganizerUserIdOrderByStartsAtDesc(UUID organizerUserId);
}
