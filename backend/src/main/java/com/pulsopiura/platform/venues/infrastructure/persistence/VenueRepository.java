package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.VenueStatus;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueRepository extends JpaRepository<VenueEntity, UUID> {
    List<VenueEntity> findAllByOrganizationIdOrderByNameAsc(UUID organizationId);

    Optional<VenueEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);

    boolean existsByOrganizationIdAndSlug(UUID organizationId, String slug);

    List<VenueEntity> findAllByStatusOrderByNameAsc(VenueStatus status);

    Optional<VenueEntity> findByPublicSlugAndStatus(String publicSlug, VenueStatus status);
}
