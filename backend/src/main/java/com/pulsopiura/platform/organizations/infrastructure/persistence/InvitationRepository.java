package com.pulsopiura.platform.organizations.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<InvitationEntity, UUID> {
    boolean existsByOrganizationIdAndEmailIgnoreCaseAndStatus(
            UUID organizationId, String email, String status);
}
