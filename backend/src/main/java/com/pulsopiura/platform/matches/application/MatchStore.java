package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.SportsMatch;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchStore {
    SportsMatch save(SportsMatch match);

    Optional<SportsMatch> findByIdForUpdate(UUID id);

    Optional<SportsMatch> findById(UUID id);

    Optional<SportsMatch> findPublishedBySlug(String publicSlug);

    Optional<SportsMatch> findPublishedBySlugForUpdate(String publicSlug);

    boolean existsByReservationId(UUID reservationId);

    boolean existsPublishedUpcomingByTitle(String title, Instant now);

    List<SportsMatch> findPublicUpcoming(Instant now, String sportCode);

    List<SportsMatch> findByOrganizer(UUID organizerUserId);
}
