package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.VenueStatus;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportSpaceRepository extends JpaRepository<SportSpaceEntity, UUID> {
    List<SportSpaceEntity> findAllByOrganizationIdAndVenueIdOrderByNameAsc(
            UUID organizationId, UUID venueId);

    Optional<SportSpaceEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<SportSpaceEntity> findAllByOrganizationIdAndVenueIdAndStatusOrderByNameAsc(
            UUID organizationId, UUID venueId, VenueStatus status);

    Optional<SportSpaceEntity> findByIdAndStatus(UUID id, VenueStatus status);
}
