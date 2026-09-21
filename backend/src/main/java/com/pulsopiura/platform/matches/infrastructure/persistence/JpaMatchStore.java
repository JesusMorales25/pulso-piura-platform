package com.pulsopiura.platform.matches.infrastructure.persistence;

import com.pulsopiura.platform.matches.application.MatchStore;
import com.pulsopiura.platform.matches.domain.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
class JpaMatchStore implements MatchStore {
    private final SportsMatchJpaRepository matches;

    JpaMatchStore(SportsMatchJpaRepository matches) {
        this.matches = matches;
    }

    @Override
    public SportsMatch save(SportsMatch match) {
        return matches.saveAndFlush(SportsMatchJpaEntity.fromDomain(match)).toDomain();
    }

    @Override
    public Optional<SportsMatch> findByIdForUpdate(UUID id) {
        return matches.findById(id).map(SportsMatchJpaEntity::toDomain);
    }

    @Override
    public Optional<SportsMatch> findById(UUID id) {
        return matches.findOneById(id).map(SportsMatchJpaEntity::toDomain);
    }

    @Override
    public Optional<SportsMatch> findPublishedBySlug(String slug) {
        return matches.findByPublicSlugAndStatus(slug, MatchStatus.PUBLISHED)
                .map(SportsMatchJpaEntity::toDomain);
    }

    @Override
    public Optional<SportsMatch> findPublishedBySlugForUpdate(String slug) {
        return matches.findForUpdateByPublicSlugAndStatus(slug, MatchStatus.PUBLISHED)
                .map(SportsMatchJpaEntity::toDomain);
    }

    @Override
    public boolean existsByReservationId(UUID reservationId) {
        return matches.existsByReservationId(reservationId);
    }

    @Override
    public boolean existsPublishedUpcomingByTitle(String title, Instant now) {
        return matches.existsByStatusAndStartsAtAfterAndTitleIgnoreCase(
                MatchStatus.PUBLISHED, now, title);
    }

    @Override
    public List<SportsMatch> findPublicUpcoming(Instant now, String sportCode) {
        var entities =
                sportCode == null
                        ? matches.findAllByStatusAndVisibilityAndStartsAtAfterOrderByStartsAtAsc(
                                MatchStatus.PUBLISHED, MatchVisibility.PUBLIC, now)
                        : matches
                                .findAllByStatusAndVisibilityAndStartsAtAfterAndSportCodeOrderByStartsAtAsc(
                                        MatchStatus.PUBLISHED,
                                        MatchVisibility.PUBLIC,
                                        now,
                                        sportCode);
        return entities.stream().map(SportsMatchJpaEntity::toDomain).toList();
    }

    @Override
    public List<SportsMatch> findByOrganizer(UUID organizerUserId) {
        return matches.findAllByOrganizerUserIdOrderByStartsAtDesc(organizerUserId).stream()
                .map(SportsMatchJpaEntity::toDomain)
                .toList();
    }
}
