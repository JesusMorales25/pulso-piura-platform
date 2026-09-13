package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportSpaceAmenityRepository extends JpaRepository<SportSpaceAmenityEntity, UUID> {
    List<SportSpaceAmenityEntity> findAllByOrganizationIdAndSportSpaceId(
            UUID organizationId, UUID sportSpaceId);

    void deleteAllByOrganizationIdAndSportSpaceId(UUID organizationId, UUID sportSpaceId);
}
