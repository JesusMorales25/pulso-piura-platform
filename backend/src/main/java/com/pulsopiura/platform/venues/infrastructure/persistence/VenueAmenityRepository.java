package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueAmenityRepository extends JpaRepository<VenueAmenityEntity, UUID> {
    List<VenueAmenityEntity> findAllByOrganizationIdAndVenueId(UUID organizationId, UUID venueId);

    void deleteAllByOrganizationIdAndVenueId(UUID organizationId, UUID venueId);
}
