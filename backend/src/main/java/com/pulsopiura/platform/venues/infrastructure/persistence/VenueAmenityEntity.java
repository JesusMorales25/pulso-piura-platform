package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "venue_amenities", schema = "app")
public class VenueAmenityEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "venue_id", nullable = false)
    private UUID venueId;

    @Column(name = "amenity_code", nullable = false, length = 40)
    private String amenityCode;

    protected VenueAmenityEntity() {}

    public static VenueAmenityEntity create(UUID organizationId, UUID venueId, String code) {
        var entity = new VenueAmenityEntity();
        entity.id = UUID.randomUUID();
        entity.organizationId = organizationId;
        entity.venueId = venueId;
        entity.amenityCode = code;
        return entity;
    }

    public String amenityCode() {
        return amenityCode;
    }
}
