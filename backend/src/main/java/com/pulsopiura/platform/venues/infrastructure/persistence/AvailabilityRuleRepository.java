package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRuleEntity, UUID> {
    List<AvailabilityRuleEntity>
            findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                    UUID organizationId, UUID sportSpaceId);

    Optional<AvailabilityRuleEntity> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
