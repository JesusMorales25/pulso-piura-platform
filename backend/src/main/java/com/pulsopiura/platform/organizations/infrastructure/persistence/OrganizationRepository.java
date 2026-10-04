package com.pulsopiura.platform.organizations.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<OrganizationEntity, UUID> {
    @org.springframework.data.jpa.repository.Query(
            value =
                    """
        select exists(select 1 from (
          select o.name, o.district_code, o.address from app.organizations o where o.status = 'ACTIVE'
          union all
          select o.name, v.district_code, v.address from app.organizations o
            join app.venues v on v.organization_id = o.id where o.status = 'ACTIVE' and v.status <> 'ARCHIVED'
        ) existing where
          lower(regexp_replace(btrim(existing.name), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:name), '\\s+', ' ', 'g')) and
          lower(regexp_replace(btrim(existing.district_code), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:district), '\\s+', ' ', 'g')) and
          lower(regexp_replace(btrim(existing.address), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(:address), '\\s+', ' ', 'g')))
        """,
            nativeQuery = true)
    boolean duplicateLocation(String name, String district, String address);

    boolean existsBySlug(String slug);
}
