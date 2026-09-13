package com.pulsopiura.platform.profiles.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserConsentRepository extends JpaRepository<UserConsentEntity, UUID> {
    boolean existsByUserId(UUID userId);
}
