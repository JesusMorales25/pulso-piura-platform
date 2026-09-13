package com.pulsopiura.platform.identity.infrastructure.persistence;

import com.pulsopiura.platform.identity.domain.CapabilityType;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CapabilityRequestRepository extends JpaRepository<CapabilityRequestEntity, UUID> {
    boolean existsByUserIdAndCapabilityAndStatus(
            UUID userId, CapabilityType capability, String status);

    List<CapabilityRequestEntity> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    List<CapabilityRequestEntity> findAllByOrderByCreatedAtDesc();

    Optional<CapabilityRequestEntity> findByUserIdAndCapabilityAndStatus(
            UUID userId, CapabilityType capability, String status);
}
