package com.pulsopiura.platform.venues.infrastructure.persistence;

import com.pulsopiura.platform.venues.domain.VenueStatus;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueRepository extends JpaRepository<VenueEntity, UUID> {
    @org.springframework.data.jpa.repository.Query(
            value =
                    """
        select exists(select 1 from app.venues where status <> 'ARCHIVED'
          and lower(regexp_replace(btrim(name), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:name), '\\s+', ' ', 'g'))
          and lower(regexp_replace(btrim(district_code), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:district), '\\s+', ' ', 'g'))
          and lower(regexp_replace(btrim(address), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:address), '\\s+', ' ', 'g'))
          and (cast(:excludedId as uuid) is null or id <> cast(:excludedId as uuid)))
        """,
            nativeQuery = true)
    boolean duplicateLocation(String name, String district, String address, UUID excludedId);

    List<VenueEntity> findAllByOrganizationIdOrderByNameAsc(UUID organizationId);

    Optional<VenueEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);

    boolean existsByOrganizationIdAndSlug(UUID organizationId, String slug);

    List<VenueEntity> findAllByStatusOrderByNameAsc(VenueStatus status);

    Optional<VenueEntity> findByPublicSlugAndStatus(String publicSlug, VenueStatus status);
}
