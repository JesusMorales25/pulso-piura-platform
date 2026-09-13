package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AmenityService {
    private final VenueAmenityRepository venueAmenities;
    private final SportSpaceAmenityRepository spaceAmenities;

    public AmenityService(
            VenueAmenityRepository venueAmenities, SportSpaceAmenityRepository spaceAmenities) {
        this.venueAmenities = venueAmenities;
        this.spaceAmenities = spaceAmenities;
    }

    @Transactional
    public void replaceVenueAmenities(UUID organizationId, UUID venueId, Set<String> codes) {
        venueAmenities.deleteAllByOrganizationIdAndVenueId(organizationId, venueId);
        venueAmenities.flush();
        venueAmenities.saveAll(
                codes.stream()
                        .map(code -> VenueAmenityEntity.create(organizationId, venueId, code))
                        .toList());
    }

    @Transactional(readOnly = true)
    public Set<String> venueAmenities(UUID organizationId, UUID venueId) {
        return venueAmenities.findAllByOrganizationIdAndVenueId(organizationId, venueId).stream()
                .map(VenueAmenityEntity::amenityCode)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    @Transactional
    public void replaceSpaceAmenities(UUID organizationId, UUID spaceId, Set<String> codes) {
        spaceAmenities.deleteAllByOrganizationIdAndSportSpaceId(organizationId, spaceId);
        spaceAmenities.flush();
        spaceAmenities.saveAll(
                codes.stream()
                        .map(code -> SportSpaceAmenityEntity.create(organizationId, spaceId, code))
                        .toList());
    }

    @Transactional(readOnly = true)
    public Set<String> spaceAmenities(UUID organizationId, UUID spaceId) {
        return spaceAmenities
                .findAllByOrganizationIdAndSportSpaceId(organizationId, spaceId)
                .stream()
                .map(SportSpaceAmenityEntity::amenityCode)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
