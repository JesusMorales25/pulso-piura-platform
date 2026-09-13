package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "sport_space_amenities", schema = "app")
public class SportSpaceAmenityEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "sport_space_id", nullable = false)
    private UUID sportSpaceId;

    @Column(name = "amenity_code", nullable = false, length = 40)
    private String amenityCode;

    protected SportSpaceAmenityEntity() {}

    public static SportSpaceAmenityEntity create(UUID organizationId, UUID spaceId, String code) {
        var entity = new SportSpaceAmenityEntity();
        entity.id = UUID.randomUUID();
        entity.organizationId = organizationId;
        entity.sportSpaceId = spaceId;
        entity.amenityCode = code;
        return entity;
    }

    public String amenityCode() {
        return amenityCode;
    }
}
