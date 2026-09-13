package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityExceptionRepository
        extends JpaRepository<AvailabilityExceptionEntity, UUID> {
    List<AvailabilityExceptionEntity> findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
            UUID organizationId, UUID sportSpaceId);

    Optional<AvailabilityExceptionEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
