package com.pulsopiura.platform.organizations.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<MembershipEntity, UUID> {
    Optional<MembershipEntity> findByOrganizationIdAndUserIdAndStatus(
            UUID organizationId, UUID userId, String status);

    Optional<MembershipEntity> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    List<MembershipEntity> findAllByUserIdAndStatus(UUID userId, String status);

    List<MembershipEntity> findAllByOrganizationIdAndStatus(UUID organizationId, String status);
}
